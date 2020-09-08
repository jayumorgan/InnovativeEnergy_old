import MM, { MachineMotionConfig } from "mm-js-api";

import { AxesConfiguration, Drive } from "../parts/machine_config/Drives";
import { MachineMotion } from "../parts/machine_config/MachineMotions";


// Note:
// MM is the controller, MachineMotion is the configuration parameters from MachineConfig (just info, no methods)

export default class Jogger {
    machineMotions: MM[] = [];
    axesConfiguration: AxesConfiguration;
    eStopped: boolean = true;

    constructor(machines: MachineMotion[], Axes: AxesConfiguration) {
        this.axesConfiguration = Axes;

        let my = this;

        machines.forEach((m: MachineMotion) => {
            let config: MachineMotionConfig = {
                machineIP: m.ipAddress,
                serverPort: 8000,
                mqttPort: 9001
            };
            // Check reminder
            console.log("Double check that jogger parameters are okay for browser side machine motion ", config);

            let mm: MM = new MM(config);
            my.machineMotions.push(mm);
        });
    };


    prepareSystem() {
        let my = this;
        let promises: Promise<any>[] = [];
        for (let i = 0; i < my.machineMotions.length; i++) {
            let m: MM = my.machineMotions[i];
            let p = new Promise((resolve, reject) => {
                m.releaseEstop().then(() => {
                    return m.resetSystem();
                }).then(() => {
                    resolve();
                }).catch((e: any) => {
                    console.log("Failed to reset system", e);
                    reject(e);
                });
            });
            promises.push(p);
        }
        return new Promise((resolve, reject) => {
            Promise.all(promises).then(() => {
                my.eStopped = false;
            }).catch((e: any) => {
                my.eStopped = true;
                reject(e);
            });
        });
    };

    startJog() {


    };

    stopJog() {


    }
};
