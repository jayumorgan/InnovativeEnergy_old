import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';

import MachineMotion, { defaultMqttClient, vResponse } from "mm-js-api";
import { DatabaseHandler } from "../database/db";

import { SavedMachineConfiguration, MachineConfiguration, MachineMotionInfo, Axes, IO, IOState } from "./config";


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

interface PalletizerState {
    status: PALLETIZER_STATUS,
    cycle: number;
    currentBox: number;
    totalBox: number;
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
        currentBox: 0,
        totalBox: 0,
        time: 0,
        palletConfig: {}
    };
    machineConfigId: number = 0;
    palletConfigId: number = 0;

    machineConfig: SavedMachineConfiguration | null = null;
    palletConfig: any | null = null;

    mechanicalLayout: MechanicalLayout = defaultMechanicalLayout();


    // Only need subscribed topics. 
    __initTopics() {
        this.subscribeTopics[REQUEST_TOPIC] = {
            handler: this.__handleRequestState,
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
                console.log("Client " + options.clientId + "subscribed to palletizer topics.");
            });
        };

        client.on("connect", subscribe);
        let my = this;
        client.on("message", (topic: string, message_buffer: Buffer) => {

            let message: string = JSON.parse(message_buffer.toString());
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

    __handleRequestState(m?: string) {
        let state_string = JSON.stringify(this.palletizerState);
        this.mqttClient.publish(STATE_TOPIC, state_string);
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

    };

    __loadMachine(smc: SavedMachineConfiguration | null, id: number) {
        // queue it up if machine is not loaded.
        this.machineConfig = smc;
        this.machineConfigId = id;
    };

    __loadPallet(spc: any | null, id: number) {
        // queue it up if machine is not loaded.
        this.palletConfig = spc;
        this.palletConfigId = id;
    };

    // Should return a promise on success.
    loadConfigurations(): Promise<boolean> {
        let my = this;
        return new Promise((resolve, reject) => {
            my.databaseHandler.getCurrentConfigs().then((curr: any) => {
                let { machine, pallet } = curr;
                if (machine && pallet) {
                    my.databaseHandler.getMachineConfig(machine).then((machine_config: any) => {
                        my.databaseHandler.getPalletConfig(pallet).then((pallet_config: any) => {
                            my.__loadMachine(machine_config ? machine_config as SavedMachineConfiguration : null, machine);
                            my.__loadPallet(pallet_config ? pallet_config : null, pallet);
                            resolve(true);
                        }).catch(e => reject(e));
                    }).catch(e => reject(e));
                } else {
                    reject("No current configurations.");
                }
            })
        });
    };

    //-------Palletizer State Reducer-------
    __stateReducer(update: any) {
        this.palletizerState = { ...this.palletizerState, ...update };
        this.__handleRequestState();
    };

    //-------Engine Controls-------
    handleStart() {

    };

    handlePause() {

    };

    handleStop() {

    };


};






