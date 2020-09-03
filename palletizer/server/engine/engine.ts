import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';

import MachineMotion, { defaultMqttClient, vResponse } from "mm-js-api";
import { DatabaseHandler } from "../database/db";


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
    COMPLETE = "Complete"
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


export class Engine {
    mqttClient: mqtt.Client;
    databaseHandler: DatabaseHandler;
    controlTopics: { [key: string]: TopicStruct } = {};
    palletizerState: PalletizerState = {
        status: PALLETIZER_STATUS.WAITING,
        cycle: 0,
        currentBox: 0,
        totalBox: 0,
        time: 0,
        palletConfig: {}
    };
    machineConfig: any | null = null;
    palletConfig: any | null = null;

    // Only need subscribed topics. 
    __initTopics() {
        this.controlTopics[REQUEST_TOPIC] = {
            handler: this.__handleRequest,
            regex: /palletizer\/request/
        };
        this.controlTopics[CONTROL_TOPIC] = {
            handler: this.__handleControl,
            regex: /palletizer\/control/
        };
        this.controlTopics[ESTOP_TOPIC] = {
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
            client.subscribe(Object.keys(this.controlTopics), () => {
                console.log("Client " + options.clientId + "subscribed to palletizer topics.");
            });
        };

        client.on("connect", subscribe);
        let my = this;
        client.on("message", (topic: string, message_buffer: Buffer) => {

            let message: string = JSON.parse(message_buffer.toString());
            let topics: string[] = Object.keys(my.controlTopics);
            let handler: undefined | ((m: string) => void) = undefined;

            // for speed -- it necessary, just use for loop.
            if (my.controlTopics.hasOwnProperty(topic)) {
                handler = my.controlTopics[topic].handler.bind(my);
                handler(message);
            } else {
                for (let i = 0; i < topics.length; i++) {
                    let ts: TopicStruct = my.controlTopics[topics[i]];
                    if (ts.regex.test(topic)) {
                        handler = ts.handler.bind(my);
                        handler(message);
                        break;
                    }
                };
            }
        });
        this.mqttClient = client;
        this.loadConfigurations().then((b) => {
            console.log(b);
        });;
    };

    //-------MQTT Message Handlers-------

    __handleRequest(m: string) {
        let state_string = JSON.stringify(this.palletizerState);
        this.mqttClient.publish(STATE_TOPIC, state_string);
    };

    __handleControl(m: string) {
        // Handle control is the first step here.
        // we can have the command handlers in another array.


    };

    __handleEstop(m: string) {

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
                            my.machineConfig = machine_config;
                            my.palletConfig = pallet_config;
                            resolve(true);
                        }).catch(e => reject(e));
                    }).catch(e => reject(e));
                } else {
                    reject("No current configurations.");
                }
            })
        });
    };



};






