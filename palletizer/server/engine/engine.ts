import * as dotenv from "dotenv";
import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';
import MachineMotion, {
    vResponse,
    AXES,
    DIRECTION,
    DRIVES,
    DriveType,
    MachineMotionConfig,
    IODeviceState
} from "mm-js-api";
import { DatabaseHandler } from "../database/db";
import {
    SavedMachineConfiguration,
    MachineConfiguration,
    MachineMotionInfo,
    Axes,
    IO,
    IOState,
    SavedPalletConfiguration,
    PalletConfiguration,
    Drive,
    Coordinate
} from "./config";
import { generateStandardPath } from "../optimizer/standard";
import { generateOptimizedPath } from "../optimizer/optimized";
import {
    BoxPath,
    ActionCoordinate,
    ActionTypes
} from "../optimizer/optimized";



//---------------Environment Setup---------------
dotenv.config();

var TESTING: boolean = true;
// False if all machine motion ip addresses should be 127.0.0.1.
if (process.env.ENVIRONMENT === "PRODUCTION") {
    TESTING = false;
}
console.log((TESTING ? "In" : "Not in") + " Testing environment");
// This will eventually be a control side flag (sent in with start signal)
var OPTIMIZE_PATHS: boolean = true;
if (process.env.PATH_TYPE === "STANDARD") {
    OPTIMIZE_PATHS = false;
}
console.log(OPTIMIZE_PATHS ? "Using path optimization." : "Using standard paths.");


//---------------Network Parameters---------------
const HOSTNAME = "127.0.0.1";
const MQTTPORT = 1883;
//---------------Topics---------------
const PALLETIZER_TOPIC = "palletizer/";
const STATE_TOPIC = PALLETIZER_TOPIC + "state";
const INFORMATION_TOPIC = PALLETIZER_TOPIC + "information";
const REQUEST_TOPIC = PALLETIZER_TOPIC + "request";
const CONTROL_TOPIC = PALLETIZER_TOPIC + "control";
// Trigger machine scale estop (stop all machines).
const ESTOP_TOPIC = PALLETIZER_TOPIC + "trigger/estop";

interface TopicStruct {
    handler: (m: string) => void;
    regex: RegExp
};

//---------------Palletizer Control---------------
enum PALLETIZER_STATUS {
    SLEEP = "Sleep",
    PAUSED = "Paused",
    COMPLETE = "Complete",
    ERROR = "Error",
    STOPPED = "Stopped",
    RUNNING = "Running"
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
    box_detection: IOState[];
};

function compareIODeviceStates(io1: IODeviceState, io2: IODeviceState): boolean {
    let equal: boolean = false;
    for (let i = 0; i < io1.length; i++) {
        equal = io1[i] === io2[i];
        if (!equal) {
            break;
        }
    }
    return equal;
}

function handleCatch(e: any) {
    console.log("Engine error: ", e);
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

async function safeAwait(promise: Promise<any>) {
    return promise.then(data => {
        return [undefined, data];
    }).catch((e) => {
        return [e];
    });
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
        box_detection: []
    } as MechanicalLayout;
};

enum CYCLE_STATE {
    NONE,
    HOMEING,
    PICK,
    DETECT_IO,
    PICK_IO,
    DROP,
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
    cycleState: CYCLE_STATE = CYCLE_STATE.NONE;
    startBox: number = 0;
    boxPathsForPallet: BoxPath[] = [];

    __initTopics() {
        this.subscribeTopics[REQUEST_TOPIC] = {
            handler: this.__handleSendState,
            regex: /palletizer\/request/
        };
        this.subscribeTopics[CONTROL_TOPIC] = {
            handler: this.__handleControl,
            regex: /palletizer\/control/
        };
        this.subscribeTopics[ESTOP_TOPIC] = {
            handler: this.__handleEstop,
            regex: /palletizer\/trigger\/estop/
        };
    };

    constructor(handler: DatabaseHandler) {
        this.__initTopics();
        this.databaseHandler = handler;
        let mqtt_uri = "mqtt://" + HOSTNAME + ":" + String(MQTTPORT);
        let options: any = {
            clientId: "PalletizerEngine-" + uuidv4()
        };
        let client: mqtt.Client = mqtt.connect(mqtt_uri, options);
        let subscribe = () => {
            client.subscribe(Object.keys(this.subscribeTopics), () => {
                console.log("Client " + options.clientId + " subscribed to palletizer topics.");
            });
        };
        client.on("connect", subscribe);

        let my = this;

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


    //-------MQTT Message Handlers-------
    __publish(topic: string, message: string) {
        let my = this;

        let pub = () => {
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
        this.__publish(STATE_TOPIC, state_string);
        this.__handleSendInformation();
    };

    __handleSendInformation() {
        let info_string = JSON.stringify(this.informationLog);
        this.__publish(INFORMATION_TOPIC, info_string);
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

    __handleEstop(m: string) {
        // don't want an infinite loop. How do we avoid this? but also want all machines to be stopped?
        this.__updateStatus(PALLETIZER_STATUS.STOPPED);
        this.__handleInformation(INFO_TYPE.ERROR, "Emergency stop triggered.");
        let { machines } = this.mechanicalLayout;
        // will still call itselt recursively.
        // How do we stop this?
        machines.forEach((m: MachineMotion) => {
            m.triggerEstop().then(() => {
                console.log("Estop triggered for machine at ip: ", m.machineIP);
            }).catch((e) => {
                console.log("Trigger estop failed ", e);
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
            if (OPTIMIZE_PATHS) { // Again, this will be a flag from control at some point.
                paths = generateOptimizedPath(spc);
            } else {
                paths = generateStandardPath(spc);
            }
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
        let parse_config = (a: any) => {
            if (a) {
                return JSON.parse(a.raw_json);
            } else {
                return null;
            }
        };
        let parse_id = (a: any) => {
            if (a) {
                return a.id;
            } else {
                return 0;
            }
        };

        let my = this;
        return new Promise((resolve, reject) => {
            my.databaseHandler.getCurrentConfigs().then((curr: any) => {
                let { machine, pallet } = curr;

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
        let my = this;
        let { status } = my.palletizerState;

        if (status === PALLETIZER_STATUS.RUNNING) {
            return;
        } else if (status === PALLETIZER_STATUS.PAUSED) {
            my.__updateStatus(PALLETIZER_STATUS.RUNNING);
            return;
        }

        my.loadConfigurations().then(() => {
            return my.configureMachine();
        }).then(() => {
            my.__stateReducer({
                cycle: my.palletizerState.cycle + 1
            });
            return my.startPalletizer(my.startBox);
        }).then(() => {

        }).catch((e) => {
            if (my.palletizerState.status == PALLETIZER_STATUS.STOPPED) {
                console.log("Palletizer has stopped.");
                //		my.__updateStatus(PALLETIZER_STATUS.STOPPED);
                my.__handleInformation(INFO_TYPE.STATUS, "Palletizer stopped.");

            } else {
                my.__handleInformation(INFO_TYPE.ERROR, "Unable to start machine. Verify that configurations are valid.");
                my.__updateStatus(PALLETIZER_STATUS.ERROR);
                console.log("Failed in handle start", e);
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
            let match: number = +(matches[1]);
            this.startBox = match;
        }
    }

    //-------Mechanical Configuration-------
    configureMachine(): Promise<boolean> {
        let my = this;

        if (my.machineConfig !== null && my.palletConfig !== null) {
            let promises: Promise<any>[] = [];
            let mms: MachineMotion[] = [];

            const { config } = my.machineConfig;
            const { machines, io, axes, box_detection } = config;
            machines.forEach((mm: MachineMotionInfo) => {
                let { ipAddress } = mm;
                let mm_config: MachineMotionConfig = {
                    machineIP: TESTING ? "127.0.0.1" : ipAddress,
                    serverPort: 8000,
                    mqttPort: 1883,
                };

                let mm_controller: MachineMotion = new MachineMotion(mm_config);

                // NB: estop will recursively call estop, so unbind the estop action on first call.

                mm_controller.bindEstopEvent(() => {
                    console.log("Calling bound event");
                    mm_controller.bindEstopEvent(() => {
                        console.log("Estop already triggered");
                    });
                    let handler = my.__handleEstop.bind(my);
                    handler("Estop message is irrelevant");
                });

                let p = new Promise((resolve, reject) => {
                    mm_controller.releaseEstop().then(() => {
                        return mm_controller.resetSystem();
                    }).then(() => {
                        resolve();
                    }).catch((e: vResponse) => {
                        reject(e);
                    });
                });

                promises.push(p);

                mms.push(mm_controller);
            });

            my.mechanicalLayout.machines = mms;
            let ax = axes as any;

            Object.keys(ax).forEach((axis: string) => {
                let drives = ax[axis] as Drive[];
                drives.forEach((d: Drive) => {
                    let { MachineMotionIndex, DriveNumber, MechGainValue, MicroSteps, Direction } = d;
                    let mm = my.mechanicalLayout.machines[MachineMotionIndex];
                    let drive = numberToDrive(DriveNumber);
                    // TODO: get this adjustment from a 'gearbox' property instead!
                    let p = mm.configAxis(drive, MicroSteps * ((drive == 'X' && MachineMotionIndex == 1) ? 5 : 1) /* gearbox */, MechGainValue, Direction > 0 ? DIRECTION.POSITIVE : DIRECTION.NEGATIVE);
                    promises.push(p);
                });
            });

            my.mechanicalLayout.axes = axes;
            my.mechanicalLayout.io = io;
            my.mechanicalLayout.box_detection = box_detection;

            return new Promise((resolve, reject) => {
                Promise.all(promises).then(() => { resolve(true) }).catch(e => reject(e));
            });
        } else {
            return new Promise((_, reject) => {
                reject("No machine configurations.");
            })
        }
    };

    //-------Palletizer Sequence-------

    async startPalletizer(box_index: number): Promise<any> {
        let my = this;

        my.__updateStatus(PALLETIZER_STATUS.RUNNING);

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
                my.__updateStatus(PALLETIZER_STATUS.COMPLETE);
                my.__handleInformation(INFO_TYPE.STATUS, "Cycle completed. Awaiting manual restart.");
                return;
            }
        });
    };


    // run palletizer sequence should run through the path. then continue;
    async runPalletizerSequence(box_index: number): Promise<any> {
        let my = this;

        const homeIfZero = () => {
            if (box_index === 0) {
                return my.executeHomingSequence();
            } else {
                return Promise.resolve();
            }
        };

        return homeIfZero().then(() => {
            return my.executePathSequence(box_index, 0);
        });
    };

    async executePathSequence(box_index: number, path_index: number): Promise<any> {
        let my = this;
        if (box_index >= my.boxPathsForPallet.length) {
            return Promise.resolve();
        } else {
            let path: BoxPath = my.boxPathsForPallet[box_index];
            if (path_index >= path.length) {
                return Promise.resolve();
            } else {
                let action_coordinate: ActionCoordinate = path[path_index];
                return my.__move(action_coordinate).then((_: any) => {
                    return my.executeAction(action_coordinate.action);
                }).then(() => {
                    let next_path_index = path_index + 1;
                    return my.executePathSequence(box_index, next_path_index);
                });
            }
        }
    };

    async executeAction(action?: ActionTypes): Promise<any> {
        let my = this;
        if (action) {
            if (action === ActionTypes.PICK) {
                return my.__pickIO()
            }
            if (action === ActionTypes.DROP) {
                // detect box first.
                return my.handleDetect().then((detected: boolean) => {
                    if (detected) {
                        return my.__dropIO();
                    } else {
                        return Promise.reject("Unable to detect box. Operator assistance required");
                    }
                });
            }
        }
        return Promise.resolve();
    };

    async executeHomingSequence(): Promise<any> {
        let my = this;
        my.cycleState = CYCLE_STATE.HOMEING;
        return my.homeVertialAxis().then(() => {
            return my.homeAllAxes();
        });
    };

    homeVertialAxis(): Promise<any> {
        let my = this;
        let { axes } = this.mechanicalLayout;
        let { Z } = axes;
        return new Promise((resolve, reject) => {
            let homing_function = async () => {
                for (let i = 0; i < Z.length; i++) {
                    let { MachineMotionIndex, DriveNumber } = Z[i];
                    let drive = numberToDrive(DriveNumber);
                    let mm = my.mechanicalLayout.machines[MachineMotionIndex];
                    let [err, _] = await safeAwait(mm.emitHome(drive).then(() => {
                        return mm.waitForMotionCompletion();
                    }));
                    if (err) {
                        reject(err);
                        break;
                    }
                };
                resolve();
            };
            homing_function();
        });
    };

    homeAllAxes(): Promise<any> {
        let my = this;
        return new Promise((resolve, reject) => {
            let { machines } = my.mechanicalLayout;
            Promise.all(machines.map((m: MachineMotion) => {
                // TODO: get the speed from a config instead! (and maybe more work to be done on speed later...)
                return m.emitSpeed(220).then(
                  () => { m.emitAcceleration(150).then(
                    () => { m.emitHomeAll().then(
                      () => { return m.waitForMotionCompletion(); }
                    )
                  })
                });
            })).then(() => {
                resolve();
            }).catch((e: any) => {
                reject(e);
            });
        });
    };

    __move(coordinate: ActionCoordinate): Promise<any> {
        console.log(coordinate);

        let my = this;
        let mm_group = {} as { [key: number]: any };
        let { machines, axes } = my.mechanicalLayout;
        let tagged: [Drive[], number][] = [];

        tagged.push([axes.Z, coordinate.z]);
        tagged.push([axes.Y, coordinate.y]);
        tagged.push([axes.X, coordinate.x]);
        tagged.push([axes.θ, coordinate.θ ? 90 : 0]);
        tagged.forEach((t: [Drive[], number], _: number) => {
            let [drives, position] = t;
            drives.forEach((d: Drive) => {
                let { MachineMotionIndex, DriveNumber } = d;
                if (!(MachineMotionIndex in mm_group)) {
                    mm_group[MachineMotionIndex] = {}
                }
                mm_group[MachineMotionIndex][numberToDrive(DriveNumber)] = position;
            });
        });
        let mm_ids = Object.keys(mm_group) as string[];

        let move_actions: Action[] = [];
        let wait_actions: Action[] = [];

        for (let i = 0; i < mm_ids.length; i++) {
            let id: number = +(mm_ids[i]);
            let mm: MachineMotion = machines[id];
            let pairing = mm_group[id];
            let axes: AXES[] = Object.keys(pairing) as AXES[];
            let positions: number[] = Object.values(pairing);

            let move_action = () => {
                return mm.emitCombinedAxesAbsoluteMove(axes, positions);
            };

            let wait_action = () => {
                return mm.waitForMotionCompletion();
            };

            move_actions.push(move_action);
            wait_actions.push(wait_action);
        };

        return my.__controlSequence([...move_actions, ...wait_actions]);
    };

    __pickIO() {
        this.cycleState = CYCLE_STATE.PICK_IO;
        let ios: IOState[] = this.mechanicalLayout.io.On;
        return this.__writeIO(ios);
    };

    __dropIO() {
        this.cycleState = CYCLE_STATE.DROP_IO;
        let ios: IOState[] = this.mechanicalLayout.io.Off;
        return this.__writeIO(ios);
    };

    __writeIO(ios: IOState[]) {
        let my = this;
        return Promise.all(ios.map((state: IOState) => {
            let { MachineMotionIndex, NetworkId, Pins } = state;
            return my.mechanicalLayout.machines[MachineMotionIndex].digitalWriteAll(NetworkId, Pins);
        }));
    };

    handleDetect(retry_index: number = 0): Promise<boolean> {
        let my = this;

        return new Promise<boolean>((resolve, reject) => {
            my.__detectBox().then((detected: boolean) => {
                if (detected) {
                    resolve(detected); // has been detected.
                } else if (retry_index < 5) {
                    setTimeout(() => {
                        my.handleDetect(retry_index + 1).then((d: boolean) => {
                            resolve(d);
                        }).catch((e: any) => {
                            reject(e);
                        });
                    }, 500);
                } else {
                    resolve(detected);
                }
            }).catch((e: any) => {
                reject(e);
            });
        });
    }

    __detectBox(): Promise<boolean> {
        let my = this;
        my.cycleState = CYCLE_STATE.DETECT_IO;
        const { box_detection } = my.mechanicalLayout;
        if (box_detection.length > 0) {
            return new Promise<boolean>((resolve, reject) => {
                Promise.all(box_detection.map((state: IOState) => {
                    const { MachineMotionIndex, NetworkId, Pins } = state;
                    return my.mechanicalLayout.machines[MachineMotionIndex].digitalReadAll(NetworkId);
                })).then((res: vResponse[]) => {
                    let detect: boolean = false;
                    for (let i = 0; i < res.length; i++) {
                        const vRes: vResponse = res[i];
                        if (vRes.success) {
                            const read_vals: IODeviceState = vRes.result as IODeviceState;
                            detect = compareIODeviceStates(read_vals, box_detection[i].Pins);
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
        } else {
            return Promise.resolve(true);
        }
    };

    // will repeat sequence starting from top on run.
    async __controlSequence(actions: Action[]): Promise<any> {
        if (actions.length === 0) {
            return new Promise((resolve, _) => {
                resolve();
            })
        }

        let my = this;
        let { status } = my.palletizerState;

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

        return new Promise((_, reject) => {
            reject("Palletizer is not in run state " + String(status));
        });
    };
};
