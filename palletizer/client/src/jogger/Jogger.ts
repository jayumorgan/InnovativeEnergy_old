import MM, { MachineMotionConfig, DRIVE, DRIVES, DIRECTION, vResponse } from "mm-js-api";

import { AxesConfiguration, Drive, AXES } from "../parts/machine_config/Drives";
import { MachineMotion } from "../parts/machine_config/MachineMotions";

// Note:
// MM is the controller, MachineMotion is the configuration parameters from MachineConfig (just info, no methods)

function driveNumberToDRIVE(driveNumber: number): DRIVE {
    switch (driveNumber) {
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
            return DRIVES.ONE;
        };
    };
};

export default class Jogger {

    machineMotions: MM[] = [];
    axesConfiguration: AxesConfiguration;
    eStopped: boolean = true;
    isMoving: boolean = false;

    positionHandler: (positions: any) => void;

    jogIncrement: number = 50; //mm
    jogSpeed: number = 100; // mm/s

    constructor(machines: MachineMotion[], Axes: AxesConfiguration, onPositionUpdate: (positions: any) => void) {
        this.axesConfiguration = Axes;
        this.positionHandler = onPositionUpdate;

        let my = this;

        machines.forEach((m: MachineMotion) => {
            let config: MachineMotionConfig = {
                machineIP: m.ipAddress,
                serverPort: 8000,
                mqttPort: 9001
            };

            // Check reminder.
            console.log("Double check that jogger parameters are okay for browser side machine motion ", config);

            let mm: MM = new MM(config);
            my.machineMotions.push(mm);
        });

        my.configureAxes().then(() => {
            return my.setJogSpeed(my.jogSpeed);
        }).then(() => {
            console.log("Jogger configured");
        }).catch((e: any) => {
            console.log("Error setting up jogger", e);
        });
    };

    setJogIncrement(increment: number) {
        this.jogIncrement = increment;
    };

    setJogSpeed(speed: number) {
        let my = this;
        my.jogSpeed = speed;

        let promises: Promise<vResponse>[] = [];
        my.machineMotions.forEach((m: MM) => {
            let p = m.emitSpeed(my.jogSpeed);
            promises.push(p);
        });

        return Promise.all(promises);
    };

    stopMotion() {
        let my = this;
        let promises: Promise<vResponse>[] = [];

        my.machineMotions.forEach((m: MM) => {
            let p = m.emitStop();
            promises.push(p);
        });

        return Promise.all(promises);
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
                resolve();
            }).catch((e: any) => {
                my.eStopped = true;
                reject(e);
            });
        });
    };


    configureAxes() {
        let my = this;
        let keys = Object.keys(my.axesConfiguration);
        let promises: Promise<vResponse>[] = [];

        keys.forEach((k: string) => {
            let ds: Drive[] = (my.axesConfiguration as any)[k] as Drive[];
            ds.forEach((d: Drive) => {
                let { MachineMotionIndex, DriveNumber, MechGainValue, MicroSteps, Direction } = d;
                let mm: MM = my.machineMotions[MachineMotionIndex];
                let p = mm.configAxis(driveNumberToDRIVE(DriveNumber), MicroSteps, MechGainValue, Direction);
                promises.push(p);
            });
        });

        return Promise.all(promises);
    };

    startJog(axis: AXES | string, direction: number | DIRECTION) {
        let my = this;
        if (my.isMoving) {
            return new Promise((_, reject) => {
                reject("Already in motion");
            })
        } else {
            my.isMoving = true;
        }

        let mm_group = {} as { [key: number]: DRIVE[] };
        let axes_keys: string[] = Object.keys(my.axesConfiguration);
        let axes_values: Drive[][] = Object.values(my.axesConfiguration);
        let axis_index = axes_keys.indexOf(String(axis));
        let ds: Drive[] = axes_values[axis_index];

        ds.forEach((d: Drive) => {
            let { MachineMotionIndex, DriveNumber } = d;
            if (!(MachineMotionIndex in mm_group)) {
                mm_group[MachineMotionIndex] = [] as DRIVE[];
            }
            mm_group[MachineMotionIndex].push(driveNumberToDRIVE(DriveNumber));
        });

        let mm_indices = Object.keys(mm_group) as string[];
        let promises: Promise<any>[] = [];

        mm_indices.forEach((is: string) => {
            let i: number = +is;
            let drives: DRIVE[] = mm_group[i];
            let mm: MM = my.machineMotions[i];
            let p = new Promise((resolve, reject) => {
                let directions: DIRECTION[] = new Array(drives.length).fill(direction as DIRECTION);
                let positions: number[] = new Array(drives.length).fill(my.jogIncrement);
                mm.emitCombinedAxesRelativeMove(drives, directions, positions).then(() => {
                    return mm.waitForMotionCompletion();
                }).then(() => {
                    resolve();
                }).catch((e: any) => {
                    reject(e);
                });
            });
            promises.push(p);
        });

        return new Promise((resolve, reject) => {
            Promise.all(promises).then(() => {
                my.isMoving = false;
                resolve();
            }).catch((e: any) => {
                my.isMoving = false;
                reject(e);
            });
        });
    };

    triggerEstop() {
        let my = this;
        my.machineMotions.forEach((m: MM) => {
            m.triggerEstop().then(() => {
                // Do nothing.
            }).catch((e: any) => {
                console.log("Error trigger estop ", e);
            });
        });
        // assuming it worked.
        my.eStopped = true;
    };

};
