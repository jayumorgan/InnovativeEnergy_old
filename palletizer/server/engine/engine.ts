import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';

import MachineMotion, { defaultMqttClient, vResponse } from "mm-js-api";
import { DatabaseHandler } from "../database/db";

import { SavedMachineConfiguration, MachineConfiguration, MachineMotionInfo, Axes, IO, IOState, SavedPalletConfiguration, PalletConfiguration } from "./config";


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
    ERROR = "Error"
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

        this.loadConfigurations().then((b) => {
            console.log(b);
        });;
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
                resolve(true);
            })
        });
    };

    //-------Palletizer State Reducer-------
    __stateReducer(update: any) {
        this.palletizerState = { ...this.palletizerState, ...update };
        this.__handleSendState();
    };

    //-------Engine Controls-------
    handleStart() {
        //Load configuration, then...



    };

    handlePause() {

    };

    handleStop() {

    };
};






