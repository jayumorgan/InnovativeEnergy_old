//---------------Machine Motion Javascript---------------
import { vResponse } from "./MMResponse";


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

// Motion Controller
export class MotionController {
    gCodeHandler: (gCode: string) => Promise<vResponse>;

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

    constructor(gCode_handler: (gCode: string) => Promise<vResponse>) {
        this.gCodeHandler = gCode_handler;
    };

    getAccelParameter(axis: AXES, acceleration: number): number {
        let a: number = acceleration / this.mechGain[axis] * STEPPER_MOTOR.steps_per_turn * this.uStep[axis];
        return a;
    };

    getSpeedParameter(axis: AXES, speed: number): number {
        let s: number = speed / this.mechGain[axis] * STEPPER_MOTOR.steps_per_turn * this.uStep[axis];
        return s;
    };

    setContinuousMove(axis: AXES, speed: number, acceleration: number = 100): string[] {
        // Return multiple promises.
        let modeCmd: string = "V5 " + String(axis) + "2";

        let s = this.getSpeedParameter(axis, speed);
        let a = this.getAccelParameter(axis, acceleration);

        let moveCmd: string = "V4 S" + String(s) + " A" + String(a) + " " + String(axis);

        return [modeCmd, moveCmd];
    };

    stopContinuousMove(axis: AXES, acceleration: number = 100): string[] {
        let a = this.getAccelParameter(axis, acceleration);
        let stopCmd: string = "V4 S0 A" + String(a) + " " + String(axis);
        return [stopCmd];
    };

    getCurrentPositions(): string[] {
        let positionCmd = "M114";
        return [positionCmd];
        // Parse
    };

    getEndStopState(): string[] {
        let stateCmd = "M119";
        return [stateCmd];
    };

    emitStop(): string[] {
        let stopCmd = "M410";
        return [stopCmd];
    };

    emitHomeAll(): string[] {
        let homeCmd = "G28";
        return [homeCmd];
    };

    emitHome(axis: AXES): string[] {
        let homeCmd = "G28 " + String(axis);
        return homeCmd;
    };

    emitSpeed(speed: number): string[] { // in mm/s
        let speedCmd = "G0 F" + String(speed * 60);
        return [speedCmd];
    };

    emitAcceleration(acceleration: number): string[] { // in mm/s^2
        let accelCmd = "M204 T" + String(acceleration);
        return [accelCmd];
    };

    emitAbsoluteMove(axis: AXES, postion: number): string[] {
        let modeCmd = "G90";

        let moveCmd = "G0 " + String(axis) + String(position);
        return [modeCmd, moveCmd];
    };

    emitCombinesAxesAbsoluteMove(axes: AXES[], positions: number[]): string[] {
        if (axes.length === positions.length) {
            let modeCmd = "G90";
            let moveCmd = "G0 ";
            for (let i = 0; i < axes.length; i++) {
                moveCmd += String(axes[i]) + String(positions[i]) + " ";
            }
            return [modeCmd, moveCmd];
        } else {
            return [] as string[];
            // Error
        }
    };

    emitRelativeMove(axis: AXES, direction: DIRECTION, distance: number): string[] {
        let modeCmd = "G91";
        let d: string = (String(direction) === String(DIRECTION.POSITIVE)) ? String(distance) : "-" + String(distance);
        let moveCmd = "G0 " + String(axis) + d;
        return [modeCmd, moveCmd];
    };

    emitCombinedAxisRelativeMode(axes: AXES[], directions: DIRECTION[], distances: number[]): string[] {
        if (axes.length === directions.length && axes.length === distances.length) {
            let modeCmd = "G91";

            let moveCmd = "G0 ";

            for (let i = 0; i < axes.length; i++) {
                let direction = directions[i];
                let distance = distances[i];
                let axis = axes[i];
                let d: string = (String(direction) === String(DIRECTION.POSITIVE)) ? String(distance) : "-" + String(distance);
                moveCmd += String(axis) + d + " ";
            }
            return [modeCmd, moveCmd];

        } else {
            return [] as string[];
            // Error
        }
    };

    setPosition(axis: AXES, position: number): string[] {
        let posCmd = "G92 " + String(axis) + String(position);
        return [posCmd];
    };

    emitgCode(gCode: string): string[] {
        let Cmd = gCode;
        return [Cmd];
    };

    configAxis(axis: AXES, uStep: MICRO_STEPS, mechGain: MECH_GAIN, direction: DIRECTION): string[] {
        this.uStep[axis] = uStep;
        this.mechGain[axis] = mechGain;
        let steps_mm = ((direction === DIRECTION.POSITIVE) ? "" : "-") + STEPPER_MOTOR.steps_per_turn * this.uStep[axis] / this.mechGain[axis];

        let configCmd = "M92 " + String(axis) + String(steps_mm);
        return [configCmd];

    };

    isMotionCompleted(): string[] {
        let motionCmd = "V0";
        // PARSE
        return [motionCmd];
    };

    waitForMotionCompletion(): string[] {
        let motionCmd = "V0";
        // Loop and retry.
        return [motionCmd];

    };


    configHomingSpeed(axes: AXES[], speeds: number[]): string[] { // mm / s
        if (axes.length === speeds.length) {
            let speedCmd = "V2";

            for (let i = 0; i < axes.length; i++) {
                speedCmd += " " + String(axes[i]) + String(speeds[i] * 60);
            }

            return [speedCmd];

        } else {
            // Error
            return [] as string[];
        }
    };
}



