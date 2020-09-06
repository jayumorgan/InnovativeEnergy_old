import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';

import MachineMotion, { defaultMqttClient, vResponse, AXES, DIRECTION } from "mm-js-api";
import { DatabaseHandler } from "../database/db";

import { SavedMachineConfiguration, MachineConfiguration, MachineMotionInfo, Axes, IO, IOState, SavedPalletConfiguration, PalletConfiguration, Drive } from "./config";
import { MachineMotionConfig } from "mm-js-api/dist/MachineMotion";

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
    WAITING = "Waiting",
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
}


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
}


export class Engine {
    mqttClient: mqtt.Client;
    databaseHandler: DatabaseHandler;
    subscribeTopics: { [key: string]: TopicStruct } = {};
    palletizerState: PalletizerState = {
        status: PALLETIZER_STATUS.WAITING,
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
    palletConfig: any | null = null;

    mechanicalLayout: MechanicalLayout = defaultMechanicalLayout();


    // Only need subscribed topics. 
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
        //-------Initialize the database handler-------
        this.databaseHandler = handler;

        //-------Initialize the engine client-------
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

        // this.loadConfigurations().then((b) => {
        //     console.log(b);
        // });;
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
    }

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
        this.palletConfigId = id;
        let is_null = this.palletConfig === null;
        let info_status: INFO_TYPE = (is_null) ? INFO_TYPE.ERROR : INFO_TYPE.STATUS;
        let info_description = (is_null) ? "No pallet configuration found. Navigate to the Configuration tab and create a pallet configuration before use" : "Successfully loaded pallet configuration: " + this.palletConfig.config.name;

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
    __stateReducer(update: any) {
        this.palletizerState = { ...this.palletizerState, ...update };
        this.__handleSendState();
    };

    //-------Engine Controls-------
    // NOTE:  When you return something from a then() callback, it's a bit magic. If you return a value, the next then() is called with that value. However, if you return something promise-like, the next then() waits on it, and is only called when that promise settles (succeeds/fails).

    handleStart() {
        // Define unique error commands that can be sent to the user + logged to console.
        let my = this;
        let { status } = my.palletizerState;


        my.handleStop(); // stop all motion.
        this.loadConfigurations().then(() => {
            return my.configureMachine()
        }).then(() => {
            // run sequence.
            // Group by axes, X,Y can run together.

        }).catch((e) => {
            my.__handleInformation(INFO_TYPE.ERROR, "Unable to start machine. Verify that configurations are valid");
            console.log("Failed in handle start", e);
        });
    };

    handlePause() {

    };

    handleStop() {

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

    //-------Motion Sequence Control-------
    runPalletizerSequence() {



    };

};






