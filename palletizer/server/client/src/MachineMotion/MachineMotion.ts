//-----Axios HTTP Requests------
import axios, { AxiosResponse } from "axios";

import { Coordinate } from "../parts/teach/structures/Data";



axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.defaults.headers.get['Content-Type'] = "application/x-www-form-urlencoded";





export enum NETWORK_MODE {
    dhcp,
    static
};

export interface NetworkConfiguration {
    mode: NETWORK_MODE;
    machineIp: string;
    machineNetmask: string;
    machineGateway: string;
};


class MachineMotion {
    myConfiguration: NetworkConfiguration

    // =
    //     mode: NETWORK_MODE.dhcp,
    //     machineIp: "192.169.7.2",
    //     machineNetmask: "",
    //     machineGateway: ""
    // };


    constructor(networkConfig: NetworkConfiguration) {
        this.myConfiguration = networkConfig as NetworkConfiguration;
    };


    HTTPSend(port: string, path: string, data: any | null, callback?: (res: AxiosResponse) => void) {
        let url = "http://" + this.myConfiguration.machineIp + ":" + port + "/" + path;

        if (data) {
            axios.post(url, data).then((res: AxiosResponse) => {
                console.log(`POST Response (${url}): `, res);
                callback && callback(res);
            }).catch((e: any) => {
                console.log(`POST Error (${url})`, e);
            });
        } else {
            axios.get(url).then((res: AxiosResponse) => {
                console.log(`GET Response (${url}): `, res);
                callback && callback(res);
            }).catch((e: any) => {
                console.log(`GET Error (${url})`, e);
            });
        }
    };

    emitGCode(gCode: string, callback?: (res: AxiosResponse) => void) {
        let data = { "gcode": gCode } as any;

        let encoded_path = Object.keys(data).map(key => key + '=' + data[key]).join('&');

        console.log("Encoded path: ", encoded_path);

        this.HTTPSend("8000", "gcode?" + encoded_path, null, callback);
    };

    emitRelativeMove(axis: number, position: number) {
        let axes = {
            1: "X",
            2: "Y",
            3: "Z"
        } as { [key: number]: string };


        let a = axes[axis];


        this.emitGCode("G91", (res: AxiosResponse) => {
            this.emitGCode("G0 " + a + String(position));
        });
    };

    emitSpeed(speed: number) {
        let gcode = "G0 F" + String(60 * speed);
        this.emitGCode(gcode);
    };



    getCurrentPositions(callback: (positions: Coordinate) => void) {
        let gcode = "M114";
        this.emitGCode(gcode, (res: AxiosResponse) => {
            console.log("Get positions callback -- transform into coordinate", res);
            let response = res.data as string;
            //echo:N1831 M114*28 ↵X:100.00 Y:100.00 Z:100.00 E:0.00 Count X: -1067 Y:1353 Z:-1067 ↵ok
            // positions[1] = float(reply[reply.find('X')+2:(reply.find('Y')-1)])
            // positions[2] = float(reply[reply.find('Y')+2:(reply.find('Z')-1)])
            // positions[3] = float(reply[reply.find('Z')+2:(reply.find('E')-1)])
            let Xreg: RegExp = /X:([\d\.]+)/;
            let Yreg: RegExp = /Y:([\d\.]+)/;
            let Zreg: RegExp = /Z:([\d\.]+)/;

            let XMatch = Xreg.exec(response);
            let YMatch = Yreg.exec(response);
            let ZMatch = Zreg.exec(response);

            if (XMatch && YMatch && ZMatch) {
                let XVal: number = + XMatch[1];
                let YVal: number = + YMatch[1];
                let ZVal: number = + ZMatch[1];

                console.log(XMatch, YMatch, ZMatch);

                console.log(XVal, YVal, ZVal);

                callback({ x: 100, y: 0, z: 100 } as Coordinate);
            }
        });
    };
};


// Define some wrappers for actual control.

interface Axes {
    x: number;
    y: number;
    z: number;
};

export enum AxesDirections {
    X,
    Y,
    Z
};


export class TeachModeController {
    mm: MachineMotion;
    speed: number;
    distance: number;
    axes: Axes;


    constructor(net: NetworkConfiguration, speed: number, distance: number) {
        this.mm = new MachineMotion(net);
        this.speed = speed;
        this.mm.emitSpeed(this.speed); // in mm/second
        this.distance = distance;
        this.axes = {
            x: 2,
            y: 3,
            z: 1
        } as Axes;
    }


    getPosition(callback: (positions: Coordinate) => void) {

        this.mm.getCurrentPositions(callback);
    };

    Move(direction: AxesDirections, positive: boolean) {
        let axis: number;
        switch (direction) {
            case AxesDirections.X: {
                axis = this.axes.x
                break;
            };
            case AxesDirections.Y: {
                axis = this.axes.y
                break;
            };
            case AxesDirections.Z: {
                axis = this.axes.z;
                break;
            };
            default: {
                console.log("Move Error", direction);
                axis = 10;
            };
        }
        this.mm.emitRelativeMove(axis, positive ? this.distance : -1 * this.distance);
    }

};
