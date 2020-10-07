import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';
import MM, { MachineMotionConfig, DriveType, DRIVES, DIRECTION, vResponse } from "mm-js-api";
import { AxesConfiguration, Drive, AXES } from "../parts/machine_config/Drives";
import { MachineMotion } from "../parts/machine_config/MachineMotions";
import { CoordinateRot } from "../geometry/geometry";


var TESTING = false;
if (process.env.REACT_APP_ENVIRONMENT === "DEVELOPMENT") {
    TESTING = true;
}
console.log((TESTING ? "In" : "Not in") + " Testing environment -- (Jogger -- set machine ips.)");
// MM is the controller, MachineMotion is the configuration parameters from MachineConfig (just info, no methods)

// Machine Motion Specific
function driveNumberToDRIVE(driveNumber: number): DriveType {
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

// Machine Specific (for axesconfiguration)
function axisNumbertoAxisString(axisNumber: number | AXES): string {
    switch (axisNumber) {
        case (0): {
            return "X";
        };
        case (1): {
            return "Y";
        };
        case (2): {
            return "Z";
        };
        case (3): {
            return "W";
        };
        default: {
            return "Z";
        };
    };
};

export enum PalletizerAxes {
    X = "X",
    Y = "Y",
    Z = "Z",
    θ = "θ"
};

export default class Jogger {

    machineMotions: MM[] = [];
    axesConfiguration: AxesConfiguration;
    eStopped: boolean = true;
    isMoving: boolean = false;

    positionHandler: (positions: any) => void;

    jogIncrement: number = 50; //mm
    jogSpeed: number = 100; // mm/s

    onEstop: (b: boolean) => void = (_: boolean) => { };
    onIsMoving: (b: boolean) => void = (_: boolean) => { };

    __setIsMoving(b: boolean) {
        this.isMoving = b;
        this.onIsMoving(this.isMoving);
    };

    __setEstopped(b: boolean) {
        this.eStopped = b;
        this.onEstop(this.eStopped);
    };

    constructor(machines: MachineMotion[], Axes: AxesConfiguration, onPositionUpdate: (positions: any) => void, bindIsMoving?: (b: boolean) => void, bindEstopped?: (b: boolean) => void) {

        console.log(machines, "Machien in controller");
        this.axesConfiguration = Axes;
        this.positionHandler = onPositionUpdate;

        let my = this;

        if (bindIsMoving) {
            my.onIsMoving = bindIsMoving;
        }

        if (bindEstopped) {
            my.onEstop = bindEstopped;
        }

        machines.forEach((m: MachineMotion) => {
            let machine_ip = TESTING ? "127.0.0.1" : m.ipAddress;

            let mqtt_uri = "ws://" + machine_ip + ":" + String(9001) + "/";

            let options: any = {
                clientId: "BrowserMachineMotion-" + uuidv4()
            };

            let mqttClient: mqtt.Client = mqtt.connect(mqtt_uri, options);

            let config: MachineMotionConfig = {
                machineIP: machine_ip,
                serverPort: 8000,
                mqttPort: 9001,
                mqttClient
            };

            // Check reminder.
            console.log("Double check that jogger parameters are okay for browser side machine motion ", config);

            let mm: MM = new MM(config);
            my.machineMotions.push(mm);
        });

        my.prepareSystem().then(() => {
            console.log("Prepared system");
            return my.configureAxes();
        }).then(() => {
            console.log("Confiured axes");
            return my.setJogSpeed(my.jogSpeed);
        }).then(() => {
            console.log("Set jog speed");
            my.getPosition();
        }).then(() => {
            console.log("Successfully setup jogger.");
        }).catch((e: any) => {
            console.log("Error setting up jogger", e);
        });
    };

    setJogIncrement(increment: number) {
        this.jogIncrement = increment;
        return new Promise((resolve, _) => {
            resolve();
        });
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

    //NOTE: In the future -- rotation will be a number (absolute position).
    rotateToAngle(angle: number) {
        const my = this;
        if (my.isMoving) {
            return Promise.reject("Already in motion");
        } else {
            my.__setIsMoving(true);

            let { θ } = my.axesConfiguration;
            let promises: Promise<any>[] = [];

            θ.forEach((d: Drive) => {
                let { MachineMotionIndex, DriveNumber } = d;
                let p = new Promise((resolve, reject) => {
                    my.machineMotions[MachineMotionIndex].emitAbsoluteMove(driveNumberToDRIVE(DriveNumber), angle).then(() => {
                        return my.machineMotions[MachineMotionIndex].waitForMotionCompletion();
                    }).then(() => {
                        my.getPosition();
                        resolve();
                    }).catch((e: any) => {
                        my.getPosition();
                        reject(e);
                    })
                });
                promises.push(p);
            });

            return new Promise((resolve, reject) => {
                Promise.all(promises).then(() => {
                    my.__setIsMoving(false);
                    resolve();
                }).catch((e: any) => {
                    my.__setIsMoving(false);
                    reject(e);
                });
            });
        }
    };

    startRotation(rotate: boolean) {
        return this.rotateToAngle(rotate ? 90 : 0);
    };

    stopMotion() {
        let my = this;
        let promises: Promise<vResponse>[] = [];

        my.machineMotions.forEach((m: MM) => {
            let p = m.emitStop();
            promises.push(p);
        });

        my.getPosition();
        return Promise.all(promises);
    };

    prepareSystem() {
        let my = this;

        console.log("Starting Prepare System");
        return new Promise((resolve, reject) => {
            Promise.all(my.machineMotions.map((mm: MM) => {
                return mm.releaseAndReset();
            })).then(() => {
                my.__setIsMoving(false);
                my.__setIsMoving(false);
                resolve();
            }).catch((e: any) => {
                console.log("Failed prepare system", e);
                my.__setIsMoving(false);
                my.__setEstopped(false);
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
                let drive: string = driveNumberToDRIVE(DriveNumber);
                // DONE: get this adjustment from a 'gearbox' property instead!
                let gearbox_multiple: number = d.Gearbox ? 5 : 1;
                let p = mm.configAxis(drive, MicroSteps * gearbox_multiple, MechGainValue, (Direction > 0 ? DIRECTION.NORMAL : DIRECTION.REVERSE));
                promises.push(p);
            });
        });

        return Promise.all(promises);
    };

    startHome(axis: PalletizerAxes | string): Promise<any> {
        let my = this;

        if (my.isMoving) {
            return Promise.reject("Already in motion");
        } else {
            my.__setIsMoving(true);
        }

        let drives: Drive[] = (my.axesConfiguration as any)[axis as string];

        let promises = [] as Promise<any>[];

        drives.forEach((d: Drive) => {
            let mm: MM = my.machineMotions[d.MachineMotionIndex];
            let drive_index = driveNumberToDRIVE(d.DriveNumber);
            let p = new Promise((resolve, reject) => {
                // Test
                mm.emitHome(drive_index).then(() => {
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
                my.getPosition();
                my.__setIsMoving(false);
                resolve();
            }).catch((e: any) => {
                my.getPosition();
                my.__setIsMoving(false);
                reject(e);
            });
        });
    };

    __getMMGroup(axis: PalletizerAxes | string): { [key: number]: DriveType[] } {
        let my = this;

        let mm_group = {} as { [key: number]: DriveType[] };
        let axes_keys: string[] = Object.keys(my.axesConfiguration);
        let axes_values: Drive[][] = Object.values(my.axesConfiguration);

        let axis_index = axes_keys.indexOf(axis);
        let ds: Drive[] = axes_values[axis_index];
        ds.forEach((d: Drive) => {
            let { MachineMotionIndex, DriveNumber } = d;
            if (!(MachineMotionIndex in mm_group)) {
                mm_group[MachineMotionIndex] = [] as DriveType[];
            }
            mm_group[MachineMotionIndex].push(driveNumberToDRIVE(DriveNumber));
        });

        return mm_group;
    };

    startJog(axis: PalletizerAxes | string, direction: number | DIRECTION) {
        let my = this;

        if (my.isMoving) {
            return Promise.reject("Already in motion");
        } else {
            my.isMoving = true;
        }

        let mm_group = my.__getMMGroup(axis);
        let mm_indices = Object.keys(mm_group) as string[];
        let promises: Promise<any>[] = [];

        mm_indices.forEach((is: string) => {
            let i: number = +is;
            let drives: DriveType[] = mm_group[i];
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
                my.getPosition();
                my.isMoving = false;
                resolve();
            }).catch((e: any) => {
                my.getPosition();
                my.isMoving = false;
                reject(e);
            });
        });
    };

    async homeAllAxes(): Promise<any> {
        const my = this;
        return my.startHome(PalletizerAxes.Z).then(() => {
            const axes = [PalletizerAxes.X, PalletizerAxes.Y, PalletizerAxes.θ];
            return Promise.all(axes.map((a: PalletizerAxes) => {
                return my.startHome(a);
            }));
        });
    };


    getPosition() {
        // This assumes only a single drive per axis. If we want to run multiple drives per axis, we need to deal with:
        // (A) synchronization of drive motion.
        // (B) higher-dimensional recording of taught positions and box coordinates. I have left some space to do this (change all coordinate to arrays of coordinates, organize by drive index).
        let my = this;
        let { X, Y, Z, θ } = my.axesConfiguration;

        // here is where we assume a single drive;
        let x_drive: Drive = X[0];
        let y_drive: Drive = Y[0];
        let z_drive: Drive = Z[0];
        let θ_drive: Drive = θ[0];

        let x_prom = my.machineMotions[x_drive.MachineMotionIndex].getCurrentPositions();
        let y_prom = my.machineMotions[y_drive.MachineMotionIndex].getCurrentPositions();
        let z_prom = my.machineMotions[z_drive.MachineMotionIndex].getCurrentPositions();
        let θ_prom = my.machineMotions[θ_drive.MachineMotionIndex].getCurrentPositions();

        Promise.all([x_prom, y_prom, z_prom, θ_prom]).then((res: vResponse[]) => {
            // likely unreliable
            let position: CoordinateRot = {
                x: (res[0].result as any)[axisNumbertoAxisString(x_drive.DriveNumber)] as number,
                y: (res[1].result as any)[axisNumbertoAxisString(y_drive.DriveNumber)] as number,
                z: (res[2].result as any)[axisNumbertoAxisString(z_drive.DriveNumber)] as number,
                θ: (res[3].result as any)[axisNumbertoAxisString(θ_drive.DriveNumber)] as number
            };
            my.positionHandler(position as any);
        }).catch((e: any) => {
            console.log("Error get position", e);
        })
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
        my.__setEstopped(true);
    };

};
