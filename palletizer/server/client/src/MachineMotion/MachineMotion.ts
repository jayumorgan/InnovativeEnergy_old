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
    myConfiguration: NetworkConfiguration;
    axes = {
        1: "X",
        2: "Y",
        3: "Z"
    } as { [key: number]: string };

    constructor(networkConfig: NetworkConfiguration) {
        this.myConfiguration = networkConfig as NetworkConfiguration;
    };

    HTTPSend(port: string, path: string, data: any | null, callback?: (res: AxiosResponse) => void) {
        let url = "http://" + this.myConfiguration.machineIp + ":" + port + "/" + path;

        console.log(url);

        if (data) {
            axios.post(url, data).then((res: AxiosResponse) => {
                //  console.log(`POST Response (${url}): `, res);
                callback && callback(res);
            }).catch((e: any) => {
                console.log(`POST Error (${url})`, e);
            });
        } else {
            axios.get(url).then((res: AxiosResponse) => {
                //   console.log(`GET Response (${url}): `, res);
                callback && callback(res);
            }).catch((e: any) => {
                console.log(`GET Error (${url})`, e);
            });
        }
    };

    emitGCode(gCode: string, callback?: (res: AxiosResponse) => void) {
        let data = { "gcode": gCode } as any;

        let encoded_path = Object.keys(data).map(key => key + '=' + data[key]).join('&');


        // console.log("Encoded path: ", encoded_path);

        this.HTTPSend("8000", "gcode?" + encoded_path, null, callback);
    };

    async emitGCodeSync(gCode: string) {

        let data = { "gcode": gCode } as any;

        let encoded_path = Object.keys(data).map(key => key + '=' + data[key]).join('&');
        encoded_path = "gcode?" + encoded_path;

        //   console.log("Encoded path: ", encoded_path);

        let url = "http://" + this.myConfiguration.machineIp + ":8000" + "/" + encoded_path;

        console.log("Sync url: ", url);

        let res = await axios.get(url);
        return res.data;
    }

    emitRelativeMove(axis: number, position: number) {

        let a = this.axes[axis];

        //  console.log(`Emit relative axis= ${axis}, a = ${a}`);
        this.emitGCode("G91", (res: AxiosResponse) => {
            this.emitGCode("G0 " + a + String(position));
        });
    };

    configAxis(drive: number, gain: number) {
        let value = 200 * 8 / gain;

        let gcode = "M92 " + String(drive) + String(value);
        this.emitGCode(gcode, () => {
            console.log("Set the gcode gain...");
        });

    }

    emitSpeed(speed: number) {
        let gcode = "G0 F" + String(60 * speed);
        this.emitGCode(gcode);
    };

    async getCurrentPositions() {

        let gcode = "M114";
        let response: string = await this.emitGCodeSync(gcode);

        let Xreg: RegExp = /X:([\d\.\-]+)/;
        let Yreg: RegExp = /Y:([\d\.\-]+)/;
        let Zreg: RegExp = /Z:([\d\.\-]+)/;

        let XMatch = Xreg.exec(response);
        let YMatch = Yreg.exec(response);
        let ZMatch = Zreg.exec(response);

        if (XMatch && YMatch && ZMatch) {

            let XVal: number = + XMatch[1];
            let YVal: number = + YMatch[1];
            let ZVal: number = + ZMatch[1];
            let vals = [XVal, YVal, ZVal] as number[];
            return vals;

        } else
            console.log("Regex Error", response);
        return [0, 0, 0];
    }

};



// Define some wrappers for actual control.

interface Axes {
    x: number;
    y: number;
    z: number;
};

export enum AxesDirections {
    X = "X",
    Y = "Y",
    Z = "Z"
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

    setSpeed(newSpeed: number) {
        this.speed = newSpeed;
        this.mm.emitSpeed(this.speed);
    };

    setDistance(newDistance: number) {
        this.distance = newDistance;
        this.mm.emitSpeed(this.distance);
    }


    async getPosition() {
        console.log("inside teach");
        let p = await this.mm.getCurrentPositions();
        return p;
    };

    Move(drive: number, positive: boolean) {
        this.mm.emitRelativeMove(drive, positive ? this.distance : -1 * this.distance);
    };
};
