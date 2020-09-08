import mqtt from "mqtt";

import { v4 as uuidv4 } from 'uuid';

import MachineMotion, { defaultMqttClient, vResponse, AXES, DIRECTION } from "mm-js-api";

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

import { MachineMotionConfig } from "mm-js-api/dist/MachineMotion";
import { rejects } from "assert";

const TESTING = true;


//---------------Support Functions---------------
async function safePromise(p: Promise<any>) {
    let x = p.then((v) => { return [v, null] }).catch((e) => { return [null, e] });
    return x;
};

//---------------Network Parameters---------------
const HOSTNAME = "127.0.0.1";
const MQTTPORT = 1883;
//---------------Topics---------------
const PALLETIZER_TOPIC = "palletizer/";
const STATE_TOPIC = PALLETIZER_TOPIC + "state";
const INFORMATION_TOPIC = PALLETIZER_TOPIC + "information";
const REQUEST_TOPIC = PALLETIZER_TOPIC + "request";
const CONTROL_TOPIC = PALLETIZER_TOPIC + "control";
const ESTOP_TOPIC = "estop/trigger/request";

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
};


function handleCatch(e: any) {
    console.log("Engine error: ", e);
};

function numberToDrive(n: number): AXES {
    switch (n) {
        case (1): {
            return AXES.X;
        };
        case (2): {
            return AXES.Y;
        }
        case (3): {
            return AXES.Z;
        }
        default: {
            return AXES.Z;
        }
    }
};

interface MechanicalLayout {
    config_id: number;
    machines: MachineMotion[];
    axes: Axes;
    io: IO;
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
        }
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
        palletConfig: null
    };
    machineConfigId: number = 0;
    palletConfigId: number = 0;
    informationLog: Information[] = [];
    machineConfig: SavedMachineConfiguration | null = null;
    palletConfig: SavedPalletConfiguration | null = null;
    mechanicalLayout: MechanicalLayout = defaultMechanicalLayout();
    cycleState: CYCLE_STATE = CYCLE_STATE.NONE;

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
            regex: /estop\/trigger\/request/
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
        this.executePickSequence = this.executePickSequence.bind(this);
        this.executeDropSequence = this.executeDropSequence.bind(this);
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
        if ((/start/mi).test(m)) {
            this.handleStart();
        } else if ((/pause/.test(m))) {
            this.handlePause();
        } else if ((/stop/mi).test(m)) {
            this.handleStop();
        } else {
            handleCatch("Unhandled control command " + m);
        }
    };

    __handleEstop(m: string) {
        this.__updateStatus(PALLETIZER_STATUS.STOPPED);
        this.__handleInformation(INFO_TYPE.ERROR, "Emergency stop triggered");
        let { machines } = this.mechanicalLayout;
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
    // NOTE:  When you return something from a then() callback, it's a bit magic. If you return a value, the next then() is called with that value. However, if you return something promise-like, the next then() waits on it, and is only called when that promise settles (succeeds/fails).

    handleStart() {
        let my = this;
        let { status } = my.palletizerState;

        if (status === PALLETIZER_STATUS.RUNNING) {
            return;
        }

        if (status === PALLETIZER_STATUS.PAUSED) {
            my.__updateStatus(PALLETIZER_STATUS.RUNNING);
        }

        let start_box = 0;

        this.loadConfigurations().then(() => {
            return my.configureMachine();
        }).then(() => {
            return my.startPalletizer(start_box);
        }).then(() => {

        }).catch((e) => {
            my.__handleInformation(INFO_TYPE.ERROR, "Unable to start machine. Verify that configurations are valid");
            console.log("Failed in handle start", e);
        });
    };

    handlePause() {
        this.__updateStatus(PALLETIZER_STATUS.PAUSED);
    };

    handleStop() {
        this.__updateStatus(PALLETIZER_STATUS.STOPPED);
    };

    //-------Mechanical Configuration-------
    configureMachine(): Promise<boolean> {
        let my = this;

        if (my.machineConfig !== null && my.palletConfig !== null) {
            let promises: Promise<vResponse>[] = [];
            let mms: MachineMotion[] = [];

            let { config } = my.machineConfig;
            let { machines, io, axes } = config;

            machines.forEach((mm: MachineMotionInfo) => {
                let { ipAddress } = mm;
                let mm_config: MachineMotionConfig = {
                    machineIP: TESTING ? "127.0.0.1" : ipAddress,
                    serverPort: 8000,
                    mqttPort: 1883,
                };

                let mm_controller: MachineMotion = new MachineMotion(mm_config);

                mm_controller.bindEstopEvent(() => {
                    let handler = my.__handleEstop.bind(my);
                    handler("Estop message is irrelevant");
                });

                mms.push(new MachineMotion(mm_config));
            });

            my.mechanicalLayout.machines = mms;
            let ax = axes as any;

            Object.keys(ax).forEach((axis: string) => {
                let drives = ax[axis] as Drive[];
                drives.forEach((d: Drive) => {
                    let { MachineMotionIndex, DriveNumber, MechGainValue, MicroSteps, Direction } = d;
                    let mm = my.mechanicalLayout.machines[MachineMotionIndex];
                    let p = mm.configAxis(numberToDrive(DriveNumber), MicroSteps, MechGainValue, Direction > 0 ? DIRECTION.POSITIVE : DIRECTION.NEGATIVE);
                    promises.push(p);
                });
            });

            my.mechanicalLayout.axes = axes;
            my.mechanicalLayout.io = io;

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
            my.__stateReducer({ current_box: box_index + 1, total_box: my.palletConfig.boxCoordinates.length });
        }

        return my.runPalletizerSequence(box_index).then(() => {
            let next_box_index = box_index + 1;
            if (my.palletConfig !== null && my.palletConfig.boxCoordinates.length > next_box_index) {
                return my.startPalletizer(next_box_index);
            } else {
                my.__updateStatus(PALLETIZER_STATUS.COMPLETE);
                my.__handleInformation(INFO_TYPE.STATUS, "Cycle completed. Awaiting manual restart.");
                return;
            }
        });
    };

    async runPalletizerSequence(box_index: number) {
        let my = this;
        return my.executePickSequence(box_index).then(() => {
            return my.executeDropSequence(box_index);
        });
    };

    async executeHomingSequence() {
        let my = this;
        my.cycleState = CYCLE_STATE.HOMEING;
        return my.homeVertialAxis().then(() => {
            return my.homeAllAxes();
        });
    };

    async executePickSequence(box_index: number) {
        let my = this;
        my.cycleState = CYCLE_STATE.PICK;
        if (my.palletConfig !== null) {
            let coordinate: Coordinate = my.palletConfig.boxCoordinates[box_index].pickLocation;
            return my.__moveToCoordinate(coordinate).then(() => {
                return my.__detectIO();
            }).then(() => {
                return my.__pickIO();
            });
        } else {
            return new Promise((resolve, reject) => {
                reject("Error with pallet configuration. Verify that the pallet configuration is valid.");
            });
        }
    };

    async executeDropSequence(box_index: number) {
        let my = this;
        my.cycleState = CYCLE_STATE.DROP;
        if (my.palletConfig !== null) {
            let coordinate: Coordinate = my.palletConfig.boxCoordinates[box_index].dropLocation;
            return my.__moveToCoordinate(coordinate).then(() => {
                return my.__dropIO();
            });
        } else {
            return new Promise((resolve, reject) => {
                reject("Error with pallet configuration. Verify that the pallet configuration is valid.");
            });
        }
    };

    homeVertialAxis() {
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

    homeAllAxes() {
        let my = this;
        return new Promise((resolve, reject) => {
            let { machines } = my.mechanicalLayout;
            let promises: Promise<any>[] = [];
            machines.forEach((m: MachineMotion) => {
                let p = m.emitHomeAll().then(() => {
                    return m.waitForMotionCompletion();
                });
                promises.push(p);
            });
            Promise.all(promises).then(resolve).catch(reject);
        });
    };


    // Bit of a mess -- problem is an arbitrary number of drives on an arbitrary number of machine motions.
    __moveVertical(c: Coordinate): Promise<any> {
        let z_point = c.z;

        let my = this;
        let mm_group = {} as { [key: number]: any };
        let { machines, axes } = my.mechanicalLayout;
        let z_axes = axes.Z;

        z_axes.forEach((d: Drive) => {
            let { MachineMotionIndex, DriveNumber } = d;
            if (!(MachineMotionIndex in mm_group)) {
                mm_group[MachineMotionIndex] = {}
            }
            mm_group[MachineMotionIndex][numberToDrive(DriveNumber) as string] = z_point;
        });

        let mm_ids = Object.keys(mm_group) as string[];
        let actions: Action[] = [];

        mm_ids.forEach((ids: string) => {
            let id: number = +(ids);
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

            actions.push(move_action);
            actions.push(wait_action);
        });

        // How do we resume at a nice pace
        return my.__controlSequence(actions);
    };

    __movePlanar(c: Coordinate): Promise<any> { // Move X, Y, θ.
        let my = this;

        let x_point: number = c.x;
        let y_point: number = c.y;
        let θ_point: boolean = c.θ;

        let mm_group = {} as { [key: number]: any };

        let { machines, axes } = my.mechanicalLayout;

        let x_axes = axes.X;
        let y_axes = axes.Y;
        let θ_axes = axes.θ;

        let tagged: [Drive[], number][] = [];

        tagged.push([x_axes, x_point]);
        tagged.push([y_axes, y_point]);
        tagged.push([θ_axes, θ_point ? 90 : 0]);

        for (let i = 0; i < tagged.length; i++) {
            let [drives, position] = tagged[i];
            drives.forEach((d: Drive) => {
                let { MachineMotionIndex, DriveNumber } = d;
                if (!(MachineMotionIndex in mm_group)) {
                    mm_group[MachineMotionIndex] = {}
                }
                mm_group[MachineMotionIndex][numberToDrive(DriveNumber)] = position;
            });
        }

        let mm_ids = Object.keys(mm_group) as string[];

        let actions: Action[] = [];

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
                mm.waitForMotionCompletion();
            };

            actions.push(move_action);
            actions.push(wait_action);
        };

        return my.__controlSequence(actions);
    };

    __moveToCoordinate(c: Coordinate): Promise<any> {
        let my = this;
        // zero_z is a minimized height to clear everything inside the cage. Default z = 0 (top).
        let zero_z: Coordinate = {
            x: 0,
            y: 0,
            z: 0,
            θ: false
        };

        return my.__moveVertical(zero_z).then(() => {
            return my.__movePlanar(c);
        }).then(() => {
            return my.__moveVertical(c);
        });
    };

    __pickIO() {
        let my = this;
        my.cycleState = CYCLE_STATE.PICK_IO;
        return new Promise((resolve, reject) => {
            resolve(true);
        })
    };

    __dropIO() {
        let my = this;
        my.cycleState = CYCLE_STATE.DROP_IO;
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    };

    __detectIO() {
        let my = this;
        my.cycleState = CYCLE_STATE.DETECT_IO;
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    };

    // will repeat sequence starting from top on run.
    __controlSequence(actions: Action[]) {
        if (actions.length === 0) {
            return new Promise((resolve, _) => {
                resolve();
            });
        } else {
            let my = this;
            let { status } = my.palletizerState;
            if (status === PALLETIZER_STATUS.RUNNING) {
                let first = actions.shift();
                return new Promise((resolve, reject) => {
                    first().then(() => {
                        return my.__controlSequence(actions);
                    }).then(() => {
                        resolve();
                    }).catch((e) => {
                        reject(e);
                    });
                });
            } else if (status === PALLETIZER_STATUS.PAUSED) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        my.__controlSequence(actions).then(() => {
                            resolve();
                        }).catch((e) => {
                            reject(e);
                        });
                    }, 500);
                });
            } else {
                return new Promise((_, reject) => {
                    reject("Palletizer is not in run state ", status);
                })
            }
        }
    };

};


function safeAwait(promise: Promise<any>) {
    return promise.then(data => {
        return [undefined, data];
    }).catch((e) => {
        return [e];
    });
};



