import MM, { MachineMotionConfig, vResponse, IODeviceState } from "mm-js-api";
import { v4 as uuidv4 } from 'uuid';
import mqtt from "mqtt";
import { MachineMotion } from "../parts/machine_config/MachineMotions";
import { IOState } from "../parts/machine_config/IO";


const TESTING = false;
console.log((TESTING ? "In" : "Not in") + " Testing environment -- (Jogger -- set machine ips.)");


function getMachineMotion(machine: MachineMotion): MM {
    let machine_ip = TESTING ? "127.0.0.1" : machine.ipAddress;

    let mqtt_uri = "ws://" + machine_ip + ":" + String(9001) + "/";

    let options: any = {
        clientId: "BrowserIOProber-" + uuidv4()
    };

    let mqttClient: mqtt.Client = mqtt.connect(mqtt_uri, options);

    let config: MachineMotionConfig = {
        machineIP: machine_ip,
        serverPort: 8000,
        mqttPort: 9001,
        mqttClient
    };

    return new MM(config);
};


export default class IO {
    machine: MachineMotion;
    machineMotion: MM;

    constructor(machine: MachineMotion) {
        this.machine = machine;
        this.machineMotion = getMachineMotion(machine);
    };

    setMachineMotion(machine: MachineMotion) {
        this.machineMotion = getMachineMotion(machine);
    };

    triggerTest(state: IOState) {
        let my = this;
        let { NetworkId, Pins } = state;
        return my.machineMotion.digitalWriteAll(NetworkId, Pins);
    };


    triggerStop() {
        let my = this;
        let devices = [0, 1, 2];
        let pins: IODeviceState = [false, false, false, false];
        let promises: Promise<vResponse>[] = [];

        devices.forEach((device: number) => {
            let p = my.machineMotion.digitalWriteAll(device, pins);
            promises.push(p);
        });

        return Promise.all(promises);
    };

    //Io Detection.
    detectInputState(networkId: number): Promise<vResponse> {
        return this.machineMotion.digitalReadAll(networkId);
    };

};
