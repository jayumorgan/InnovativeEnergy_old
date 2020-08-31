//---------------Machine Motion Javascript---------------

import axios, { AxiosResponse } from "axios";
import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';

import {
    vResponse,
    echo_okay_response,
    get_positions_response,
    end_stop_sensors_response,
    motion_completion_response,
    mqtt_Message,
    parse_mqtt_message,
    MQTT_Event,
    MQTT_EVENT_TYPE
} from "./MMResponse";


export enum DIRECTION {
    POSITIVE = "positive",
    NEGATIVE = "negative",
    NORMAL = "positive",
    REVERSE = "negative",
    CLOCKWISE = "positive",
    COUNTERCLOCKWISE = "negative"
};


export enum NETWORK_MODE {
    static = "static",
    dhcp = "dhcp"
};

export enum MICRO_STEPS {
    ustep_full = 1,
    ustep_2 = 2,
    ustep_4 = 4,
    ustep_8 = 8,
    ustep_16 = 16,
};


export enum MECH_GAIN {
    timing_belt_150mm_turn = 150,
    legacy_timing_belt_200_mm_turn = 200,
    enclosed_timing_belt_mm_turn = 208,
    ballscrew_10mm_turn = 10,
    legacy_ballscrew_5_mm_turn = 5,
    indexer_deg_turn = 85,
    indexer_v2_deg_turn = 36,
    roller_conveyor_mm_turn = 157,
    belt_conveyor_mm_turn = 73.563,
    rack_pinion_mm_turn = 157.08,
};

export enum STEPPER_MOTOR {
    steps_per_turn = 200.
};


export enum MQTT {
    TIMEOUT = 10.0
};

export enum MQTT_PATH {
    ESTOP = "estop",
    ESTOP_STATUS = "estop" + "/status",
    ESTOP_TRIGGER_REQUEST = "estop" + "/trigger/request",
    ESTOP_TRIGGER_RESPONSE = "estop" + "/trigger/response",
    ESTOP_RELEASE_REQUEST = "estop" + "/release/request",
    ESTOP_RELEASE_RESPONSE = "estop" + "/release/response",
    ESTOP_SYSTEMRESET_REQUEST = "estop" + "/systemreset/request",
    ESTOP_SYSTEMRESET_RESPONSE = "estop" + "/systemreset/response"
};

export enum AXES {
    X = "X",
    Y = "Y",
    Z = "Z"
};


//---------------Class Properties---------------
interface GAINS {
    X: MECH_GAIN;
    Y: MECH_GAIN;
    Z: MECH_GAIN;
};

interface STEPS {
    X: MICRO_STEPS;
    Y: MICRO_STEPS;
    Z: MICRO_STEPS;
};

//---------------Machine Motion gCode Translator---------------


interface NetworkParameters {
    ipAddress: string;
    port: string;
};

interface gCodeItem {
    gCode: string;
    responseHandler: (res: string) => vResponse;
};

class MotionController {
    gCodeHandler: (gCodes: gCodeItem[]) => Promise<vResponse>;

    mechGain: GAINS = {
        X: MECH_GAIN.timing_belt_150mm_turn,
        Y: MECH_GAIN.timing_belt_150mm_turn,
        Z: MECH_GAIN.timing_belt_150mm_turn
    };

    uStep: STEPS = {
        X: MICRO_STEPS.ustep_8,
        Y: MICRO_STEPS.ustep_8,
        Z: MICRO_STEPS.ustep_8
    };

    //    baseUrl = "http://192.168.7.2:8000/";

    constructor(gCode_handler: (gCodes: gCodeItem[]) => Promise<vResponse>) {
        this.gCodeHandler = gCode_handler;
    };

    __getAccelParameter(axis: AXES, acceleration: number): number {
        let a: number = acceleration / this.mechGain[axis] * STEPPER_MOTOR.steps_per_turn * this.uStep[axis];
        return a;
    };

    __getSpeedParameter(axis: AXES, speed: number): number {
        let s: number = speed / this.mechGain[axis] * STEPPER_MOTOR.steps_per_turn * this.uStep[axis];
        return s;
    };

    setContinuousMove(axis: AXES, speed: number, acceleration: number = 100): Promise<vResponse> {
        // Return multiple promises.
        let gCodes: gCodeItem[] = [];

        gCodes.push({
            gCode: "V5 " + String(axis) + "2",
            responseHandler: echo_okay_response
        } as gCodeItem);

        let s = this.__getSpeedParameter(axis, speed);
        let a = this.__getAccelParameter(axis, acceleration);

        gCodes.push({
            gCode: "V4 S" + String(s) + " A" + String(a) + " " + String(axis),
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    stopContinuousMove(axis: AXES, acceleration: number = 100): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];
        let a = this.__getAccelParameter(axis, acceleration);

        gCodes.push({
            gCode: "V4 S0 A" + String(a) + " " + String(axis),
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    getCurrentPositions(): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "M114",
            responseHandler: get_positions_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    getEndStopState(): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "M119",
            responseHandler: end_stop_sensors_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    emitStop(): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "M410",
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    emitHomeAll(): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "G28",
            responseHandler: echo_okay_response
        } as gCodeItem);
        return this.gCodeHandler(gCodes);
    };

    emitHome(axis: AXES): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "G28 " + String(axis),
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    emitSpeed(speed: number): Promise<vResponse> { // in mm/s
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "G0 F" + String(speed * 60),
            responseHandler: echo_okay_response
        });

        return this.gCodeHandler(gCodes);
    };

    emitAcceleration(acceleration: number): Promise<vResponse> { // in mm/s^2
        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "M204 T" + String(acceleration),
            responseHandler: echo_okay_response
        });

        return this.gCodeHandler(gCodes);
    };

    emitAbsoluteMove(axis: AXES, postion: number): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];

        gCodes.push({
            gCode: "G90",
            responseHandler: echo_okay_response
        } as gCodeItem);

        gCodes.push({
            gCode: "G0 " + String(axis) + String(postion),
            responseHandler: echo_okay_response
        } as gCodeItem)

        return this.gCodeHandler(gCodes);
    };

    emitCombinesAxesAbsoluteMove(axes: AXES[], positions: number[]): Promise<vResponse> {
        if (axes.length === positions.length) {
            let modeCmd = "G90";
            let moveCmd = "G0 ";
            for (let i = 0; i < axes.length; i++) {
                moveCmd += String(axes[i]) + String(positions[i]) + " ";
            }

            let gCodes: gCodeItem[] = [];

            gCodes.push({
                gCode: modeCmd,
                responseHandler: echo_okay_response
            } as gCodeItem);

            gCodes.push({
                gCode: moveCmd,
                responseHandler: echo_okay_response
            } as gCodeItem);

            return this.gCodeHandler(gCodes);
        } else {
            return new Promise<vResponse>((resolve, reject) => {
                reject({
                    success: false,
                    result: "Different array lengths"
                } as vResponse);
            });
        }
    };

    emitRelativeMove(axis: AXES, direction: DIRECTION, distance: number): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];

        gCodes.push({
            gCode: "G91",
            responseHandler: echo_okay_response
        } as gCodeItem);

        let d: string = (String(direction) === String(DIRECTION.POSITIVE)) ? String(distance) : "-" + String(distance);
        let moveCmd = "G0 " + String(axis) + d;

        gCodes.push({
            gCode: moveCmd,
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    emitCombinedAxisRelativeMode(axes: AXES[], directions: DIRECTION[], distances: number[]): Promise<vResponse> {
        if (axes.length === directions.length && axes.length === distances.length) {

            let gCodes: gCodeItem[] = [];

            gCodes.push({
                gCode: "G91",
                responseHandler: echo_okay_response
            } as gCodeItem);

            let moveCmd = "G0 ";

            for (let i = 0; i < axes.length; i++) {
                let direction = directions[i];
                let distance = distances[i];
                let axis = axes[i];
                let d: string = (String(direction) === String(DIRECTION.POSITIVE)) ? String(distance) : "-" + String(distance);
                moveCmd += String(axis) + d + " ";
            }

            gCodes.push({
                gCode: moveCmd,
                responseHandler: echo_okay_response
            } as gCodeItem);

            return this.gCodeHandler(gCodes);

        } else {
            return new Promise<vResponse>((resolve, reject) => {
                reject({
                    success: false,
                    result: "Different array lengths"
                } as vResponse);
            });
        }
    };

    setPosition(axis: AXES, position: number): Promise<vResponse> {
        let gCodes: gCodeItem[] = [];

        gCodes.push({
            gCode: "G92 " + String(axis) + String(position),
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    emitgCode(gCode: string): Promise<vResponse> {

        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode,
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    configAxis(axis: AXES, uStep: MICRO_STEPS, mechGain: MECH_GAIN, direction: DIRECTION): Promise<vResponse> {
        this.uStep[axis] = uStep;
        this.mechGain[axis] = mechGain;
        let steps_mm = ((direction === DIRECTION.POSITIVE) ? "" : "-") + STEPPER_MOTOR.steps_per_turn * this.uStep[axis] / this.mechGain[axis];

        let configCmd = "M92 " + String(axis) + String(steps_mm);

        let gCodes: gCodeItem[] = [];

        gCodes.push({
            gCode: configCmd,
            responseHandler: echo_okay_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    isMotionCompleted(): Promise<vResponse> {

        let gCodes: gCodeItem[] = [];
        gCodes.push({
            gCode: "V0",
            responseHandler: motion_completion_response
        } as gCodeItem);

        return this.gCodeHandler(gCodes);
    };

    // Doesn't make much sense in node
    // waitForMotionCompletion(): string[] {
    //     let motionCmd = "V0";
    //     // Loop and retry.
    //     return [motionCmd];
    // };

    configHomingSpeed(axes: AXES[], speeds: number[]): Promise<vResponse> { // mm / s
        if (axes.length === speeds.length) {
            let speedCmd = "V2";

            for (let i = 0; i < axes.length; i++) {
                speedCmd += " " + String(axes[i]) + String(speeds[i] * 60);
            }

            let gCodes: gCodeItem[] = [];
            gCodes.push({
                gCode: speedCmd,
                responseHandler: echo_okay_response
            } as gCodeItem);

            return this.gCodeHandler(gCodes);

        } else {
            return new Promise<vResponse>((resolve, reject) => {
                reject({
                    success: false,
                    result: "Different array lengths"
                } as vResponse);
            });
        }
    };
};


//---------------MQTT Message Controller---------------
interface MessageControllerInterface {
    client: mqtt.Client,
    digitalWrite: (device: number, pin: number, value: boolean) => void;
};

function MessageController(server_ip: string, mqtt_port: string, message_handler: (event: MQTT_Event) => void) {

    let mqtt_uri = "mqtt://" + server_ip + ":" + mqtt_port;

    let options: any = {
        clientId: "MessageController/" + String(uuidv4())
    };

    let client: mqtt.Client = mqtt.connect(mqtt_uri, options);

    let topics: string[] = [
        "devices/io-expander/+/available",
        "devices/io-expander/+/digital-input/#",
        "devices/encoder/+/realtime-position",
        String(MQTT_PATH.ESTOP_STATUS)
    ];

    client.on("connect", () => {
        for (let i = 0; i < topics.length; i++) {
            let t: string = topics[i];
            client.subscribe(t, () => {
                console.log("Message Controller: " + options.clientId + " subscribed to: " + t);
            });
        }
    });

    client.on("message", (topic: string, message_buffer: Buffer) => {
        let mqtt_message: mqtt_Message = {
            topic,
            message: JSON.parse(message_buffer.toString())
        };
        let event: MQTT_Event = parse_mqtt_message(mqtt_message);
        message_handler(event);
    });

    let digitalWrite = (device: number, pin: number, value: boolean) => {
        let topic = "devices/io-expander/" + String(device) + "/digital-output/" + String(pin);
        let msg = value ? "1" : "0";
        client.publish(topic, msg);
    }

    return {
        client,
        digitalWrite
    } as MessageControllerInterface;
};


function generateGCodeHandler(server_ip: string, server_port: string = "8000"): (gCodes: gCodeItem[]) => Promise<vResponse> {

    let baseUri: string = "http://" + server_ip + ":" + server_port + "/";

    let url_gen = (gcode: string) => {
        let data: any = { gcode };
        let encoded_path: string = "gcode?" + Object.keys(data).map(key => key + "=" + data[key]).join("&");

        return baseUri + encoded_path;
    };

    let handler = (gCodes: gCodeItem[]) => {

        return new Promise<vResponse>((resolve, reject) => {
            let next = (index: number) => {
                let { gCode, responseHandler } = gCodes[index];
                let gUri = url_gen(gCode);
                axios.get(gUri).then((res: AxiosResponse) => {
                    let { data } = res;
                    let vRes = responseHandler(data);
                    if (vRes.success) {
                        if (index === gCodes.length - 1) {
                            resolve(vRes);
                        } else {
                            next(index + 1);
                        }
                    } else {
                        reject(vRes);
                    }
                }).catch((e: any) => {
                    reject({
                        success: false,
                        result: "Failed Axios Request: " + gUri
                    } as vResponse);
                });
            };
            next(0);
        });
    };
    return handler;
};



// Refactor shortly. 
//---------------Machine Motion---------------

export interface MM_Network {
    machineIP: string;
    serverPort: string;
    mqttPort: string;
};

export default class MachineMotion extends MotionController {

    constructor({ machineIP, serverPort, mqttPort }: MM_Network) {

        super(generateGCodeHandler(machineIP, serverPort));

        this.__messageHandler = this.__messageHandler.bind(this);

        let { client, digitalWrite } = MessageController(machineIP, mqttPort, this.__messageHandler);

        this.digitalWrite = digitalWrite;
    };

    digitalInputs: { [key: number]: { [key: number]: boolean } } = {};
    myEncoderRealtimePositions = [0, 0, 0];
    myIoExpanderAvailabilityState = [false, false, false, false];

    digitalWrite = (device: number, pin: number, value: boolean) => {
        console.log("Digital write not initialized.");
    };

    digitalRead(device: number, pin: number): boolean {
        if (this.digitalInputs.hasOwnProperty(device) && this.digitalInputs[device].hasOwnProperty(pin)) {
            return this.digitalInputs[device][pin];
        } else {
            return false;
        }
    }

    eStopCallback = () => {
        console.log("Estop!");
    };

    bindEstopEvent(fn: () => void) {
        this.eStopCallback = fn;
    };

    __messageHandler(event: MQTT_Event) {
        let { type, payload } = event;
        switch (type) {
            case (MQTT_EVENT_TYPE.NONE): {
                break;
            };
            case (MQTT_EVENT_TYPE.ESTOP_EVENT): {
                this.eStopCallback();
                break;
            };
            case (MQTT_EVENT_TYPE.ENCODER_POSITION): {
                let { device, position } = payload;
                this.myEncoderRealtimePositions[device] = position;
                break;
            };
            case (MQTT_EVENT_TYPE.IO_AVAILABILITY): {
                let { device, availability } = payload;
                this.myIoExpanderAvailabilityState[device] = availability;
                break;
            };
            case (MQTT_EVENT_TYPE.IO_VALUE): {
                let { device, pin, value } = payload;
                if (!this.digitalInputs.hasOwnProperty(pin)) {
                    this.digitalInputs[device] = {};
                }
                this.digitalInputs[device][pin] = value;
                break;
            };
            default: {
                break;
            };
        };
    };
}




