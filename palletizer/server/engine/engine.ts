import * as dotenv from "dotenv";
import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';
import MachineMotion, {
    vResponse,
    AXES,
    DIRECTION,
    DRIVES,
    DriveType,
    MachineMotionConfig
} from "mm-js-api";
import {
    SavedMachineConfiguration,
    MachineMotionInfo,
    Axes,
    IO,
    IOState,
    SavedPalletConfiguration,
    Drive,
    Coordinate,
    IOOutputPin
} from "./config";
import { DatabaseHandler } from "../database/db";
import {
    BoxPath,
    ActionCoordinate,
    ActionTypes,
    SpeedTypes,
    generateStandardPath
} from "../optimizer/standard";
import Logger, { log_fn } from "../log/log";


const log: log_fn = Logger().engine_log;

//---------------Environment Setup---------------
dotenv.config();

var TESTING: boolean = true;
// False if all machine motion ip addresses should be 127.0.0.1.
if (process.env.ENVIRONMENT === "PRODUCTION") {
    TESTING = false;
}

console.log((TESTING ? "In" : "Not in") + " Testing environment");

//---------------Network Parameters---------------
const HOSTNAME = "127.0.0.1";
const MQTTPORT = 1883;

//---------------Topics---------------
enum TOPICS {
    STATE = "palletizer/state",
    INFO = "palletizer/information",
    REQUEST = "palletizer/request",
    CONTROL = "palletizer/control",
    ESTOP = "palletizer/trigger/estop"
};

interface TopicStruct {
    handler: (m: string) => void;
    regex: RegExp
};

//---------------Palletizer Control---------------
enum PALLETIZER_STATUS {
    SLEEP = "Sleep", // State on startup.
    PAUSED = "Paused", // Paused, will resume from here.
    COMPLETE = "Complete", // Completed a cycle, equivalent to sleep.
    ERROR = "Error", // Error (equivalent to pause).
    STOPPED = "Stopped", // Stopped, will restart from here
    RUNNING = "Running" // In run statue.
};

enum INFO_TYPE {
    WARNING = "Warning",
    ERROR = "Error",
    STATUS = "Status"
};

interface Information {
    Type: string;
    Description: string;
    DateString: string;
};

interface PalletizerState {
    status: PALLETIZER_STATUS,
    cycle: number;
    current_box: number;
    total_box: number;
    time: number;
    palletConfig: any;
    dropCoordinates: Coordinate[]
};

interface MechanicalLayout {
    config_id: number;
    machines: MachineMotion[];
    axes: Axes;
    io: IO;
    good_pick: IOOutputPin[];
};

function handleCatch(e: any) {
    log("Engine error: ", e);
};

function numberToDrive(n: number): DriveType {
    switch (n) {
        case (0): {
            return DRIVES.ONE;
        };
        case (1): {
            return DRIVES.TWO;
        };
        case (2): {
            return DRIVES.THREE;
        };
        case (3): {
            return DRIVES.FOUR;
        };
        default: {
            return DRIVES.THREE;
        };
    }
};

function defaultMechanicalLayout(): MechanicalLayout {
    return {
        config_id: 0,
        machines: [],
        axes: {
            X: [],
            Y: [],
            Z: [],
            θ: []
        },
        io: {
            On: [],
            Off: []
        },
        good_pick: []
    } as MechanicalLayout;
};

enum CycleState {
    NONE,
    HOMEING,
    PICK,
    DETECT_IO,
    PICK_IO,
    DROP_IO
};

type Action = () => Promise<any>;

export class Engine {

    mqttClient: mqtt.Client;
    databaseHandler: DatabaseHandler;
    subscribeTopics: { [key: string]: TopicStruct } = {};
    palletizerState: PalletizerState = {
        status: PALLETIZER_STATUS.SLEEP,
        cycle: 0,
        current_box: 0,
        total_box: 0,
        time: 0,
        palletConfig: null,
        dropCoordinates: []
    };
    machineConfigId: number = 0;
    palletConfigId: number = 0;
    informationLog: Information[] = [];
    machineConfig: SavedMachineConfiguration | null = null;
    palletConfig: SavedPalletConfiguration | null = null;
    mechanicalLayout: MechanicalLayout = defaultMechanicalLayout();
    cycleState: CycleState = CycleState.NONE;
    startBox: number = 0;
    boxPathsForPallet: BoxPath[] = [];
    startTime: Date | null = null;


    __initTopics() {
        this.subscribeTopics[TOPICS.REQUEST] = {
            handler: this.__handleSendState,
            regex: /palletizer\/request/
        };
        this.subscribeTopics[TOPICS.CONTROL] = {
            handler: this.__handleControl,
            regex: /palletizer\/control/
        };
        this.subscribeTopics[TOPICS.ESTOP] = { // deprecated.
            handler: this.__handleEstop,
            regex: /palletizer\/trigger\/estop/
        };
    };

    constructor(handler: DatabaseHandler) {
        this.__initTopics();
        this.databaseHandler = handler;

        const mqtt_uri = "mqtt://" + HOSTNAME + ":" + String(MQTTPORT);
        const options: any = {
            clientId: "PalletizerEngine-" + uuidv4()
        };

        const client: mqtt.Client = mqtt.connect(mqtt_uri, options);
        const subscribe = () => {
            client.subscribe(Object.keys(this.subscribeTopics), () => {
                console.log("Client " + options.clientId + " subscribed to palletizer topics.");
            });
        };
        client.on("connect", subscribe);
        const my = this;
        client.on("message", (topic: string, message_buffer: Buffer) => {
            let message: string;
            try {
                message = JSON.parse(message_buffer.toString());
            } catch {
                message = message_buffer.toString();
            }
            let topics: string[] = Object.keys(my.subscribeTopics);
            let handler: undefined | ((m: string) => void) = undefined;
            // for speed -- it necessary, just use for loop.
            if (my.subscribeTopics.hasOwnProperty(topic)) {
                handler = my.subscribeTopics[topic].handler.bind(my);
                handler(message);
            } else {
                for (let i = 0; i < topics.length; i++) {
                    let ts: TopicStruct = my.subscribeTopics[topics[i]];
                    if (ts.regex.test(topic)) {
                        handler = ts.handler.bind(my);
                        handler(message);
                        break;
                    }
                };
            }
        });
        this.mqttClient = client;
        this.__loadMachine = this.__loadMachine.bind(this);
        this.__loadPallet = this.__loadPallet.bind(this);
        this.configureMachine = this.configureMachine.bind(this);
        this.runPalletizerSequence = this.runPalletizerSequence.bind(this);
        this.executeHomingSequence = this.executeHomingSequence.bind(this);
    };

    // Callback for IO updates;

    //-------MQTT Message Handlers-------
    __publish(topic: string, message: string) {
        const my = this;
        const pub = () => {
            my.mqttClient.publish(topic, message);
        };
        if (my.mqttClient.connected) {
            pub();
        } else {
            my.mqttClient.on("connect", pub);
        }
    };

    __handleSendState(m?: string) {
        let state_string = JSON.stringify(this.palletizerState);
        this.__publish(TOPICS.STATE, state_string);
        this.__handleSendInformation();
    };

    __handleSendInformation() {
        let info_string = JSON.stringify(this.informationLog);
        this.__publish(TOPICS.INFO, info_string);
    };

    __handleInformation(t: INFO_TYPE, description: string) {
        let date_string = ((d: Date) => {
            let ds = `${d.getFullYear()}/${d.getMonth()}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
            return ds;
        })(new Date());
        let info: Information = {
            Type: String(t),
            Description: description,
            DateString: date_string
        };
        this.informationLog = this.informationLog.splice(0, 9);
        this.informationLog = [info, ...this.informationLog];
        this.__handleSendInformation();
    };

    __handleControl(m: string) {
        if ((/^start$/mi).test(m)) {
            this.handleStart();
        } else if ((/^pause$/mi).test(m)) {
            this.handlePause();
        } else if ((/^stop$/mi).test(m)) {
            this.handleStop();
        } else if ((/^box number:/mi).test(m)) {
            this.handleStartBox(m);
        } else {
            handleCatch("Unhandled control command " + m);
        }
    };

    __handleEstop(_: string) {
        this.__updateStatus(PALLETIZER_STATUS.STOPPED);
        this.__handleInformation(INFO_TYPE.ERROR, "Emergency stop triggered.");
        let { machines } = this.mechanicalLayout;
        machines.forEach((m: MachineMotion) => {
            m.triggerEstop().then(() => {
                console.log("Estop triggered for machine at ip: ", m.machineIP);
            }).catch((e) => {
                log("Trigger estop failed ", e);
            });
        });
    };

    __loadMachine(smc: SavedMachineConfiguration | null, id: number) {
        this.machineConfig = smc;
        this.machineConfigId = id;

        let is_null = this.machineConfig === null;
        let info_status: INFO_TYPE = (is_null) ? INFO_TYPE.ERROR : INFO_TYPE.STATUS;
        let info_description = (is_null) ? "No machine configuration found. Navigate to the Configuration tab and create a machine configuration before use." : "Successfully loaded machine configuration: " + this.machineConfig?.name;
        this.__handleInformation(info_status, info_description);
    };

    __loadPallet(spc: any | null, id: number) {
        this.palletConfig = spc;
        this.palletizerState.palletConfig = spc;
        this.palletConfigId = id;
        let is_null = this.palletConfig === null;
        if (!is_null) {
            let paths: BoxPath[];
            paths = generateStandardPath(spc);
            this.boxPathsForPallet = paths;
            let drop_coords: Coordinate[] = [];
            paths.forEach((bp: BoxPath) => {
                bp.forEach((ac: ActionCoordinate) => {
                    if (ac.action && ac.action === ActionTypes.DROP) {
                        drop_coords.push(ac as Coordinate);
                    }
                });
            });

            this.palletizerState.dropCoordinates = drop_coords;
        }
        let info_status: INFO_TYPE = (is_null) ? INFO_TYPE.ERROR : INFO_TYPE.STATUS;
        let info_description = (is_null) ? "No pallet configuration found. Navigate to the Configuration tab and create a pallet configuration before use" : "Successfully loaded pallet configuration: " + this.palletConfig!.config.name;
        this.__handleInformation(info_status, info_description);
    };

    // Should return a promise on success.
    loadConfigurations(): Promise<boolean> {
        const parse_config = (a: any) => {
            if (a) {
                return JSON.parse(a.raw_json);
            } else {
                return null;
            }
        };
        const parse_id = (a: any) => {
            if (a) {
                return a.id;
            } else {
                return 0;
            }
        };

        const my = this;
        return new Promise((resolve, reject) => {
            my.databaseHandler.getCurrentConfigs().then((curr: any) => {
                const { machine, pallet } = curr;

                let machine_id = parse_id(machine);
                let pallet_id = parse_id(pallet);
                let machine_config = parse_config(machine);
                let pallet_config = parse_config(pallet);

                my.__loadMachine(machine_config as SavedMachineConfiguration, machine_id);
                my.__loadPallet(pallet_config as SavedPalletConfiguration, pallet_id);
                if (machine && pallet) {
                    resolve(true);
                } else {
                    reject(false);
                }
            }).catch(e => reject(e));
        });
    };

    //-------Palletizer State Reducer-------
    __updateStatus(status: PALLETIZER_STATUS) {
        this.__stateReducer({ status });
    };

    __stateReducer(update: any) {
        this.palletizerState = { ...this.palletizerState, ...update };
        this.__handleSendState();
    };

    //-------Engine Controls-------
    handleStart() {
        const my = this;
        let { status } = my.palletizerState;

        const setRunning = () => {
            my.__updateStatus(PALLETIZER_STATUS.RUNNING);
        }

        switch (status) {
            case PALLETIZER_STATUS.RUNNING: {
                return;
            }
            case PALLETIZER_STATUS.PAUSED: {
                setRunning();
                return;
            }
            case PALLETIZER_STATUS.ERROR: {
                setRunning(); // Error should be equivalent to pause -- this needs to be fixed.
                return;
            }
            case PALLETIZER_STATUS.COMPLETE: {
                setRunning();
                break;
            }
            case PALLETIZER_STATUS.SLEEP: {
                setRunning();
                break;
            }
            case PALLETIZER_STATUS.STOPPED: {
                setRunning();
                break;
            }
        };

        my.loadConfigurations().then(() => {
            return my.configureMachine();
        }).then(() => {
            return my.releaseAndReset();
        }).then(() => {
            return my.bindEstopHandlers();
        }).then(() => {
            my.__stateReducer({ cycle: my.palletizerState.cycle + 1 });
            return my.startPalletizer(my.startBox > 0 ? my.startBox - 1 : 0);
        }).catch((e: string) => {
            if (my.palletizerState.status == PALLETIZER_STATUS.STOPPED) {
                console.log("Palletizer has stopped.");
                my.__handleInformation(INFO_TYPE.STATUS, "Palletizer stopped.");
            } else {
                my.__handleInformation(INFO_TYPE.ERROR, String(e));
                my.__updateStatus(PALLETIZER_STATUS.ERROR);
                log("Failed in handle start", e);
            }
        });
    };

    handlePause() {
        this.__updateStatus(PALLETIZER_STATUS.PAUSED);
    };

    handleStop() {
        this.__updateStatus(PALLETIZER_STATUS.STOPPED);
    };

    handleStartBox(m: string) {
        let r: RegExp = /box number:([\d]+)/mi;
        let matches = r.exec(m);
        if (matches !== null) {
            let match: number = Math.round(+(matches[1]));
            this.startBox = match;
        }
    };

    releaseAndReset(retry_count: number = 0): Promise<boolean> {
        // Test.
        const my = this;
        const { machines } = my.mechanicalLayout;

        return new Promise<boolean>((resolve, reject) => {

            const ps = machines.map((m: MachineMotion) => {
                return m.releaseAndReset();
            });

            const retry = () => {
                if (retry_count < 5) { // retry 5x.
                    my.releaseAndReset(++retry_count).then((b: boolean) => {
                        resolve(b);
                    }).catch((e: string) => {
                        reject(e);
                    })
                } else {
                    reject("Unable to release estop. Verify that estop button is not locked.");
                }
            };

            Promise.all(ps).then((vss: vResponse[][]) => {
                // This is a hack that only check
                const responses: boolean[] = vss.map((vs: vResponse[]) => {
                    const estop_released = vs[0].result as boolean;
                    const system_reset = vs[1].result as boolean;
                    return estop_released && system_reset;
                }).filter((v: boolean) => {
                    return v;
                });
                if (responses.length > 0) {
                    resolve(true);
                } else {
                    retry();
                }
            }).catch((e: any) => {
                log(e);
                retry();
            });
        });
    };

    bindEstopHandlers() {
        const my = this;
        const mms = my.mechanicalLayout.machines;
        mms.forEach((m: MachineMotion) => {
            const unboundEstopHandler = (estop: boolean) => {
                return; // estop already triggered.
            };

            const estopHandler = (estop: boolean) => {
                if (estop) {
                    m.bindEstopEvent(unboundEstopHandler);
                    const handler = my.__handleEstop.bind(my);
                    handler("Estop message is irrelevant");
                } else {
                    console.log("Estop released.");
                }
            };

            m.bindEstopEvent(estopHandler);
        });
        return Promise.resolve();
    }


    //-------Mechanical Configuration-------
    configureMachine(): Promise<boolean> {
        const my = this;
        if (my.machineConfig !== null && my.palletConfig !== null) {
            let promises: Promise<vResponse[]>[] = [];
            const { config } = my.machineConfig;
            const { machines, io, axes, good_pick } = config;
            const mms: MachineMotion[] = machines.map((mm: MachineMotionInfo) => {
                const { ipAddress } = mm;
                const mm_config: MachineMotionConfig = {
                    machineIP: TESTING ? "127.0.0.1" : ipAddress,
                    serverPort: 8000,
                    mqttPort: 1883,
                    retryCount: 2 // retry request 1x
                };
                const mm_controller: MachineMotion = new MachineMotion(mm_config);
                return mm_controller;
            });

            my.mechanicalLayout.machines = mms;
            const ax = axes as any;

            Object.keys(ax).forEach((axis: string) => {
                const drives = ax[axis] as Drive[];
                promises.push(Promise.all(drives.map(async (d: Drive) => {
                    const { MachineMotionIndex, DriveNumber, MechGainValue, MicroSteps, Direction, HomingSpeed } = d;
                    const mm = my.mechanicalLayout.machines[MachineMotionIndex];
                    const drive = numberToDrive(DriveNumber);
                    const gearbox_multiple: number = d.Gearbox ? 5 : 1;

                    return mm.configAxis(drive, MicroSteps * gearbox_multiple, MechGainValue, Direction > 0 ? DIRECTION.POSITIVE : DIRECTION.NEGATIVE).then(() => {
                        return mm.configHomingSpeed([drive], [HomingSpeed]);
                    });
                })));
            });

            my.mechanicalLayout.axes = axes;
            my.mechanicalLayout.io = io;
            my.mechanicalLayout.good_pick = good_pick;

            return new Promise((resolve, reject) => {
                Promise.all(promises).then(() => {
                    resolve(true);
                }).catch((e: any) => {
                    reject("Failed to configure axes. Validate that Machine Motion controllers are operational and network information is correct.");
                });
            });
        } else {
            return Promise.reject("No machine configuration set.");
        }
    };

    //-------Palletizer Sequence-------
    async startPalletizer(box_index: number): Promise<any> {
        const my = this;

        if (my.palletConfig !== null) {
            my.__stateReducer({
                current_box: box_index + 1,
                total_box: my.boxPathsForPallet.length
            });
        }

        return my.runPalletizerSequence(box_index).then(() => {
            let next_box_index = box_index + 1;
            if (my.palletConfig !== null && my.boxPathsForPallet.length > next_box_index) {
                return my.startPalletizer(next_box_index);
            } else {
                return my.executeHomingSequence().then(() => {
                    my.__updateStatus(PALLETIZER_STATUS.COMPLETE);
                    my.__handleInformation(INFO_TYPE.STATUS, "Cycle completed. Awaiting manual restart.");
                });
            }
        });
    };

    async runPalletizerSequence(box_index: number): Promise<any> {
        let my = this;

        const homeIfZero = () => {
            if (box_index === my.startBox) {
                return my.executeHomingSequence();
            } else {
                return Promise.resolve();
            }
        };

        return homeIfZero().then(() => {
            if (box_index === 0 || null == my.startTime) {
                my.startTime = new Date();
                console.log("Started pallet sequence at " + my.startTime.toISOString());
            }
            return my.executePathSequence(box_index, 0);
        }).then(() => {
            if (null != my.startTime) {
                const t1: Date = new Date();
                console.log("Pallet sequence execution time so far: " + ((t1.getTime() - my.startTime.getTime()) / 1000) + " seconds.")
            }
            return Promise.resolve();
        });
    };

    // Wrap internals with a pick quality monitor.
    async executePathSequence(box_index: number, path_index: number): Promise<any> {
        const my = this;
        if (box_index >= my.boxPathsForPallet.length) {
            return Promise.resolve();
        } else {
            let path: BoxPath = my.boxPathsForPallet[box_index];
            if (path_index >= path.length) {
                return Promise.resolve();
            } else {

                let action_coordinate: ActionCoordinate = path[path_index];
                return new Promise((resolve, reject) => {
                    my.__move(action_coordinate).then((_: any) => {
                        return my.executeAction(action_coordinate);
                    }).then(() => {
                        return my.executePathSequence(box_index, path_index + 1);
                    }).then(() => {
                        resolve();
                    }).catch((e: any) => {
                        log(e);
                        reject("Unable to execute path sequence. Verify that motion controller is running.");
                    });
                });
            }
        }
    };

    async executeAction(action_coordinate: ActionCoordinate): Promise<any> {
        const { action } = action_coordinate;
        if (action) {
            const my = this;
            if (action === ActionTypes.PICK) {
                return my.__pickIO().then(() => {
                    return my.handleGoodPick(); // Check for a good pick.
                }).then(() => {
                    my.__monitorGoodPick();
                });
            }
            if (action === ActionTypes.DETECT_BOX) {
                return my.handleDetect(action_coordinate.boxDetection);
            }
            if (action === ActionTypes.DROP) {
                return my.__dropIO();
            }
        }
        return Promise.resolve();
    };

    async executeHomingSequence(): Promise<any> {
        const my = this;
        my.cycleState = CycleState.HOMEING;

        return new Promise((resolve, reject) => {
            my.homeVerticalAxis().then(() => {
                return my.homeAllAxes();
            }).then(() => {
                resolve();
            }).catch((e: any) => {
                reject("Failed to home axes. Verify that motion controller is running.");
                log(e);
            })
        });
    };

    homeVerticalAxis(): Promise<any> {
        const my = this;
        const { Z } = this.mechanicalLayout.axes;
        return Promise.all(Z.map(async (d: Drive) => {
            const { MachineMotionIndex, DriveNumber } = d;
            const drive = numberToDrive(DriveNumber);
            const mm = my.mechanicalLayout.machines[MachineMotionIndex];
            return mm.emitHome(drive).then(() => {
                return mm.waitForMotionCompletion();
            });
        }));
    };

    homeAllAxes(): Promise<any> {
        const my = this;
        const { machines } = my.mechanicalLayout;

        return Promise.all(machines.map(async (mm: MachineMotion) => {
            return mm.emitHomeAll().then(() => {
                return mm.waitForMotionCompletion();
            });
        }));
    };;

    __move(coordinate: ActionCoordinate): Promise<any> {
        const my = this;
        const { machines, axes } = my.mechanicalLayout;

        let mm_group = {} as { [key: number]: any };
        let tagged: [Drive[], number][] = [];

        tagged.push([axes.Z, coordinate.z]);
        tagged.push([axes.Y, coordinate.y]);
        tagged.push([axes.X, coordinate.x]);
        tagged.push([axes.θ, coordinate.θ ? 90 : 0]);

        tagged.forEach((t: [Drive[], number], _: number) => {
            let [drives, position] = t;
            drives.forEach((d: Drive) => {
                const { MachineMotionIndex, DriveNumber } = d;

                if (!(MachineMotionIndex in mm_group)) {
                    mm_group[MachineMotionIndex] = {}
                }
                mm_group[MachineMotionIndex][numberToDrive(DriveNumber)] = {
                    position,
                    ...d
                };
            });
        });

        const mm_ids = Object.keys(mm_group) as string[];
        let move_actions: Action[] = [];
        let wait_actions: Action[] = [];

        let last_speed: { [key: number]: number } = {};

        for (let i = 0; i < mm_ids.length; i++) {
            const id: number = +(mm_ids[i]);
            const mm: MachineMotion = machines[id];
            const pairing = mm_group[id];
            const axes: AXES[] = Object.keys(pairing) as AXES[];
            const params: any[] = Object.values(pairing);

            let positions: number[] = [];
            let speeds: number[] = [];
            let accelerations: number[] = [];

            params.forEach((v: any) => {
                const {
                    position,
                    Speed,
                    FreightSpeed,
                    Acceleration,
                    FreightAcceleration
                } = v;
                positions.push(position);
                speeds.push(coordinate.speed === SpeedTypes.FAST ? Speed : FreightSpeed);
                accelerations.push(coordinate.speed === SpeedTypes.FAST ? Acceleration : FreightAcceleration);
            });

            const speed = Math.min(...speeds);
            const acceleration = Math.min(...accelerations);

            const move_action = async () => {
                if (!last_speed.hasOwnProperty(id) || last_speed[id] != speed) {
                    last_speed[id] = speed;
                    return mm.emitSpeed(speed).then(async () => {
                        return mm.emitAcceleration(acceleration).then(() => {
                            return mm.emitCombinedAxesAbsoluteMove(axes, positions);
                        });
                    });
                } else {
                    return mm.emitCombinedAxesAbsoluteMove(axes, positions);
                }
            };

            const wait_action = () => {
                return mm.waitForMotionCompletion();
            };

            move_actions.push(move_action);
            (coordinate.waitForCompletion) && wait_actions.push(wait_action);
        };

        return my.__controlSequence([...move_actions, ...wait_actions]);
    };


    async __monitorGoodPick() {
        const my = this;

        if (my.cycleState !== CycleState.PICK_IO || my.palletizerState.status !== PALLETIZER_STATUS.RUNNING) {
            return;
        }

        console.log("Monitoring");

        const throwError = () => {
            my.handleStop();
            this.__handleInformation(INFO_TYPE.ERROR, "Box pick failed. Operator assistance required.");
        };
        my.__detectGoodPick().then((good: boolean) => {
            if (my.cycleState === CycleState.PICK_IO) { // It should be carrying a box.
                if (!good) {
                    throwError();
                } else {
                    setTimeout(() => {
                        my.__monitorGoodPick();
                    }, 300);
                }
            }
        }).catch((_: any) => {
            if (my.cycleState === CycleState.PICK_IO) { // It should be carrying a box.
                throwError();
            }
        });
    };

    async __pickIO() {
        console.log("Picking");
        const my = this;
        my.cycleState = CycleState.PICK_IO;
        const ios: IOState[] = my.mechanicalLayout.io.On;
        return my.__writeIO(ios);
    };

    __dropIO() {
        console.log("Dropping");
        this.cycleState = CycleState.DROP_IO;
        let ios: IOState[] = this.mechanicalLayout.io.Off;
        return this.__writeIO(ios);
    };

    __writeIO(ios: IOState[]) {
        console.log("write io", ios);
        const my = this;
        return Promise.all(ios.map((state: IOState) => {
            const { MachineMotionIndex, NetworkId, Pins } = state;
            return my.mechanicalLayout.machines[MachineMotionIndex].digitalWriteAll(NetworkId, Pins);
        }));
    };

    handleDetect(boxDetection: IOOutputPin[], retry_index: number = 0): Promise<boolean> {
        const my = this;
        return new Promise<boolean>((resolve, reject) => {
            my.__detectBox(boxDetection).then((detected: boolean) => {
                if (detected) {
                    resolve(detected); // has been detected.
                } else if (retry_index < 2000) {
                    if (retry_index === 0) {
                        my.__handleInformation(INFO_TYPE.WARNING, "Unable to detect box.");
                    }
                    setTimeout(() => {
                        my.handleDetect(boxDetection, retry_index + 1).then((d: boolean) => {
                            if (d) {
                                resolve(d);
                            } else {
                                reject("Unable to detect box. Operator assistance required.");
                            }
                        }).catch((e: any) => {
                            reject(e);
                        });
                    }, 500);
                } else {
                    // Throw error and keep trying.
                    resolve(detected);
                }
            }).catch((e: any) => {
                reject(e);
            });
        });
    };

    handleGoodPick(retry_index: number = 0): Promise<boolean> {
        const my = this;
        return new Promise<boolean>((resolve, reject) => {
            my.__detectGoodPick().then((detected: boolean) => {
                if (detected) {
                    resolve(detected);
                } else if (retry_index < 200) {
                    setTimeout(() => {
                        my.handleGoodPick(retry_index + 1).then((d: boolean) => {
                            resolve(d);
                        }).catch((e: any) => {
                            reject(e);
                        })
                    }, 500);
                } else {
                    resolve(detected);
                }
            }).catch((e: any) => {
                log("Error handle good pick", e);
                reject("Unable to detect good pick. Operator assistance required.");
            });
        });
    };

    __detectGoodPick(): Promise<boolean> {
        const my = this;
        const { good_pick } = my.mechanicalLayout;
        if (good_pick.length === 0) {
            return Promise.resolve(true);
        } else {
            return new Promise<boolean>((resolve, reject) => {
                Promise.all(good_pick.map((state: IOOutputPin) => {
                    const { MachineMotionIndex, NetworkId, PinId } = state;
                    return my.mechanicalLayout.machines[MachineMotionIndex].digitalRead(NetworkId, PinId);
                })).then((res: vResponse[]) => {
                    let detect: boolean = false;
                    for (let i = 0; i < res.length; i++) {
                        const vRes: vResponse = res[i];
                        if (vRes.success) {
                            const read_val: boolean = vRes.result as boolean;
                            detect = read_val === good_pick[i].PinVal;
                        } else {
                            detect = false;
                        }
                        if (!detect) {
                            break;
                        }
                    }
                    resolve(detect);
                }).catch((e: any) => {
                    reject(e);
                });
            });
        }
    };

    __detectBox(boxDetection: IOOutputPin[]): Promise<boolean> {
        const my = this;
        my.cycleState = CycleState.DETECT_IO;
        console.log(boxDetection, "Box Detect IO State");

        if (boxDetection.length === 0) {
            return Promise.resolve(true);
        }

        return new Promise<boolean>((resolve, reject) => {
            Promise.all(boxDetection.map((state: IOOutputPin) => {
                const { MachineMotionIndex, NetworkId, PinId } = state;
                return my.mechanicalLayout.machines[MachineMotionIndex].digitalRead(NetworkId, PinId);
            })).then((res: vResponse[]) => {
                let detect: boolean = false;
                for (let i = 0; i < res.length; i++) {
                    const vRes: vResponse = res[i];
                    if (vRes.success) {
                        const read_val: boolean = vRes.result as boolean;
                        detect = read_val === boxDetection[i].PinVal;
                    } else {
                        detect = false;
                    }
                    if (!detect) {
                        break;
                    }
                }
                resolve(detect);
            }).catch((e: any) => {
                reject(e);
            });
        });
    };

    // will repeat sequence starting from top on run.
    async __controlSequence(actions: Action[]): Promise<any> {
        if (actions.length === 0) {
            return new Promise((resolve, _) => {
                resolve();
            })
        }

        const my = this;
        const { status } = my.palletizerState;

        if (status === PALLETIZER_STATUS.RUNNING) {
            let first: Action | undefined = actions.shift();
            if (first) {
                return first().then((_: any) => {
                    return my.__controlSequence(actions);
                });
            }
            return new Promise((resolve, _) => {
                resolve();
            })
        }

        if (status === PALLETIZER_STATUS.PAUSED) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    my.__controlSequence(actions).then(() => {
                        resolve();
                    }).catch((e) => {
                        reject(e);
                    });
                }, 500);
            });
        }

        return Promise.reject("Palletizer is not un run state " + String(status) + ".");
    };
};
