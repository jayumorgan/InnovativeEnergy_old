//---------------gCode Response Parser---------------


//---------------Vention Response---------------
export interface vResponse {
    success: boolean;
    result: any;
};

function make_vResponse(success: boolean, result?: any) {
    let vres: vResponse = {
        success,
        result: result ? result : null
    };
    return vres;
};


//---------------Functions to parse response types---------------
export function echo_okay_response(res: string): vResponse {
    // regex for both types.
    let echo_test: RegExp = /echo/im;
    let ok_test: RegExp = /ok/im;

    let success: boolean = echo_test.test(res) && ok_test.test(res);

    return make_vResponse(success);
};

interface AxesPositions {
    X: number;
    Y: number;
    Z: number;
};

export function get_positions_response(res: string): vResponse {

    let { success } = echo_okay_response(res);

    if (!success) {
        return make_vResponse(success);
    }

    let Xreg: RegExp = /X:([\d\.\-]+)/;
    let Yreg: RegExp = /Y:([\d\.\-]+)/;
    let Zreg: RegExp = /Z:([\d\.\-]+)/;

    let XMatch = Xreg.exec(res);
    let YMatch = Yreg.exec(res);
    let ZMatch = Zreg.exec(res);

    success = success && (XMatch && YMatch && ZMatch);

    if (!success) {
        return make_vResponse(success);
    }

    let X: number = + XMatch[1];
    let Y: number = + YMatch[1];
    let Z: number = + ZMatch[1];

    let axesPositions: AxesPositions = {
        X,
        Y,
        Z
    };

    return make_vResponse(success, axesPositions as any);
};

interface EndStopState {
    X_MIN: boolean,
    X_MAX: boolean,
    Y_MIN: boolean,
    Y_MAX: boolean,
    Z_MIN: boolean,
    Z_MAX: boolean
};

export function end_stop_sensors_response(res: string): vResponse {

    let { success } = echo_okay_response(res);

    if (!success) {
        return make_vResponse(success);
    }

    let Xm_Reg: RegExp = /x_min: ([^\n]+)/mi;
    let XM_Reg: RegExp = /x_max: ([^\n]+)/mi;
    let Ym_Reg: RegExp = /y_min: ([^\n]+)/mi;
    let YM_Reg: RegExp = /y_max: ([^\n]+)/mi;
    let Zm_Reg: RegExp = /z_min: ([^\n]+)/mi;
    let ZM_Reg: RegExp = /z_max: ([^\n]+)/mi;

    let Xm_Match = Xm_Reg.exec(res);
    let XM_Match = XM_Reg.exec(res);
    let Ym_Match = Ym_Reg.exec(res);
    let YM_Match = YM_Reg.exec(res);
    let Zm_Match = Zm_Reg.exec(res);
    let ZM_Match = ZM_Reg.exec(res);

    success = success && Xm_Match && XM_Match && Ym_Match && YM_Match && Zm_Match && ZM_Match;

    if (!success) {
        return make_vResponse(success);
    }

    // Check that this is the correct format on the Machine Motion.
    let test_triggered = (m: string) => {
        let trigger_test: RegExp = /TRIGGERED/mi;
        return trigger_test.test(m);
    };

    let X_MIN = test_triggered(Xm_Match[1]);
    let X_MAX = test_triggered(XM_Match[1]);
    let Y_MIN = test_triggered(Ym_Match[1]);
    let Y_MAX = test_triggered(YM_Match[1]);
    let Z_MIN = test_triggered(Zm_Match[1]);
    let Z_MAX = test_triggered(ZM_Match[1]);

    let sensorState: EndStopState = {
        X_MIN,
        X_MAX,
        Y_MIN,
        Y_MAX,
        Z_MIN,
        Z_MAX
    };

    // Testing Reminder:
    console.log("end_stop_sensors_response: ", res, sensorState);

    return make_vResponse(success, sensorState as any);
};


interface MotionCompletion {
    completed: boolean;
}

export function motion_completion_response(res: string): vResponse {

    let { success } = echo_okay_response(res);

    if (!success) {
        return make_vResponse(success);
    }

    let C_Reg: RegExp = /COMPLETED/mi;

    let completed = C_Reg.test(res);

    let motionCompletion: MotionCompletion = {
        completed
    };

    return make_vResponse(success, motionCompletion as any);
};


//---------------MQTT Parser---------------

export interface mqtt_Message {
    topic: string;
    message: string;
};

// Enum possible parsing types, then work from there.
function parse_topic(msg: mqtt_Message) {
    let topic_parts: string[] = msg.topic.split('/');
};
