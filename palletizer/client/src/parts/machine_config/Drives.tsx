import React, { useState, ChangeEvent } from "react";

import ContentItem, { ButtonProps } from "../teach/ContentItem";

import { MachineMotion } from "./MachineMotions";

import palletizerImage from "./images/palletizer.png";

import plus_icon from "../teach/images/plus.svg";

import "./css/Drives.scss";


function changeVal(e: ChangeEvent): string {
    let val: string = (e.target as any).value;
    return val;
};

enum AXES {
    X,
    Y,
    Z,
    θ
};

enum DRIVE {
    ONE,
    TWO,
    THREE,
    FOUR
};

const ALL_DRIVES = [DRIVE.ONE, DRIVE.TWO, DRIVE.THREE, DRIVE.FOUR];

enum MICRO_STEPS {
    ustep_full = 1,
    ustep_2 = 2,
    ustep_4 = 4,
    ustep_8 = 8,
    ustep_16 = 16,
};

const ALL_MICRO_STEPS = [MICRO_STEPS.ustep_full, MICRO_STEPS.ustep_2, MICRO_STEPS.ustep_4, MICRO_STEPS.ustep_8, MICRO_STEPS.ustep_16];

enum DIRECTION {
    NORMAL = 1,
    REVERSE = -1
};

const ALL_DIRECTIONS = { "Normal": DIRECTION.NORMAL, "Reverse": DIRECTION.REVERSE } as { [key: string]: DIRECTION };

const MECH_GAIN = {
    timing_belt_150mm_turn: [150, "Timing Belt"],
    legacy_timing_belt_200_mm_turn: [200, "Legacy Timing Belt"],
    enclosed_timing_belt_mm_turn: [208, "Enclosed Timing Belt"],
    ballscrew_10mm_turn: [10, "Ball Screw"],
    legacy_ballscrew_5_mm_turn: [5, "Legacy Ball Screw"],
    indexer_deg_turn: [85, "Indexer Degree Turn"],
    indexer_v2_deg_turn: [36, "Indexer V2 Degree Turn"],
    roller_conveyor_mm_turn: [157, "Roller Conveyor"],
    belt_conveyor_mm_turn: [73.563, "Belt Conveyor"],
    rack_pinion_mm_turn: [157.08, "Rack & Pinion"]
} as { [key: string]: [number, string] };


export interface Drive {
    MachineMotionIndex: number;
    DriveNumber: DRIVE;
    MechGainKey: string;
    MicroSteps: MICRO_STEPS;
    Direction: DIRECTION
};

export interface AxesConfiguration {
    X: Drive[];
    Y: Drive[];
    Z: Drive[];
    θ: Drive[];
};

export function defaultAxesConfiguration() {
    return {
        X: [],
        Y: [],
        Z: [],
        θ: []
    } as AxesConfiguration;
};

function nextDrive(a: AxesConfiguration, m: MachineMotion[]) {
    let allDrives = [...a.X, ...a.Y, ...a.Z, ...a.θ];


    let d: Drive = {
        MachineMotionIndex: 0,
        DriveNumber: DRIVE.ONE,
        MechGainKey: Object.keys(MECH_GAIN)[0] as string,
        MicroSteps: MICRO_STEPS.ustep_8,
        Direction: DIRECTION.NORMAL
    };
    return d;
};

interface DrivesProps {
    Axes: AxesConfiguration;
    allMachines: MachineMotion[];
    setAxes: (a: AxesConfiguration) => void;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

function axisString(ax: AXES): string {
    let arr = ["X", "Y", "Z", "θ"] as string[];
    return arr[ax as number];
};

interface DriveCellProps {
    drive: Drive,
    index: number;
};

function Drives({ Axes, setAxes, allMachines, handleBack, handleNext, instructionNumber }: DrivesProps) {

    let haveAllDrives = () => {
        let { X, Y, Z, θ } = Axes;
        let all = (X.length > 0 && Y.length > 0 && Z.length > 0 && θ.length > 0);
        return all;
    };

    let getNextDrive = () => {
        return nextDrive(Axes, allMachines);
    };

    let [editingDrives, setEditingDrives] = useState<Drive[]>([getNextDrive()]);
    let [summaryScreen, setSummaryScreen] = useState<boolean>(haveAllDrives());
    let [currentAxis, setCurrentAxis] = useState<AXES>(AXES.X);

    let instruction: string = "Add and configure the palletizer X, Y, Z and θ axes.";

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                if (editingDrives.length > 0) {
                    let cp: AxesConfiguration = { ...Axes };
                    let cAxis: AXES = AXES.X;
                    switch (currentAxis) {
                        case (AXES.X): {
                            cp.X = [...editingDrives];
                            cAxis = AXES.Y;
                            break;
                        };
                        case (AXES.Y): {
                            cp.Y = [...editingDrives];
                            cAxis = AXES.Z;
                            break;
                        };
                        case (AXES.Z): {
                            cp.Z = [...editingDrives];
                            cAxis = AXES.θ;
                            break;
                        };
                        case (AXES.θ): {
                            cp.θ = [...editingDrives];
                            break;
                        };
                    };
                    setAxes(cp);
                    setCurrentAxis(cAxis);
                    // Increment the current axis
                    setEditingDrives([getNextDrive()]);

                    if (currentAxis === AXES.θ) {
                        setSummaryScreen(true);
                    };
                }
            }
        },
        enabled: summaryScreen || (editingDrives.length > 0)
    };

    let contentItemProps = {
        instruction,
        instructionNumber,
        LeftButton,
        RightButton,
    } as any;

    if (summaryScreen) {
        return (
            <ContentItem {...contentItemProps} >
                <div className="Drives">
                    <div className="DriveScrollcontainer">
                        <div className="DriveScroll">
                            {editingDrives.map((d: Drive, index: number) => {
                                return (
                                    <div className="DriveCellContainer">
                                        <div className="DriveCell">

                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    } else {
        contentItemProps.instruction = "Configure drives for " + axisString(currentAxis) + " axis";

        // Axis Cells Are Needed Now;
        let DriveCell = ({ drive, index }: DriveCellProps) => {

            let { MachineMotionIndex, DriveNumber, MechGainKey, MicroSteps, Direction } = drive;

            let selectMachineMotion = (e: ChangeEvent) => {
                let val: number = +(changeVal(e));
                let cp = [...editingDrives];
                cp[index].MachineMotionIndex = val;
                setEditingDrives([...cp]);
            };

            let selectDrive = (e: ChangeEvent) => {
                let d_num: number = +(changeVal(e));
                let cp = [...editingDrives];
                cp[index].DriveNumber = d_num as DRIVE;
                setEditingDrives([...cp]);
            };

            let selectGain = (e: ChangeEvent) => {
                let key: string = changeVal(e);
                let cp = [...editingDrives];
                cp[index].MechGainKey = key;
                setEditingDrives([...cp]);
            };

            let selectMicroSteps = (e: ChangeEvent) => {
                let steps: number = +(changeVal(e));
                let cp = [...editingDrives];
                cp[index].MicroSteps = steps;
                setEditingDrives([...cp]);
            };

            let selectDirection = (e: ChangeEvent) => {
                let direction: number = +(changeVal(e));
                let cp = [...editingDrives];
                cp[index].Direction = direction as DIRECTION;
                setEditingDrives([...cp]);
            };

            let removeDrive = () => {
                if (editingDrives.length > 1) {
                    let cp = [...editingDrives];
                    cp.splice(index, 1);
                    setEditingDrives([...cp]);
                }
            };

            return (
                <div className="DriveConfigCell">
                    <div className="DriveCell">
                        <div className="Input">
                            <div className="Title">
                                <span>
                                    {"Machine Motion"}
                                </span>
                            </div>
                            <div className="DropDown">
                                <select value={MachineMotionIndex} onChange={selectMachineMotion}>
                                    {allMachines.map((mm: MachineMotion, i: number) => {
                                        return (
                                            <option value={i} key={i}>
                                                {mm.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="Input">
                            <div className="Title">
                                <span>
                                    {"Drive"}
                                </span>
                            </div>
                            <div className="DropDown">
                                <select value={DriveNumber} onChange={selectDrive}>
                                    {ALL_DRIVES.map((d: DRIVE, i: number) => {
                                        if (i < (allMachines[MachineMotionIndex].version as number)) {
                                            return (
                                                <option value={d as number} key={i}>
                                                    {"Drive " + String((d as number) + 1)}
                                                </option>
                                            );
                                        } else {
                                            return null;
                                        }
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="Input">
                            <div className="Title">
                                <span>
                                    {"Type"}
                                </span>
                            </div>
                            <div className="DropDown">
                                <select value={MechGainKey} onChange={selectGain}>
                                    {Object.keys(MECH_GAIN).map((key: string, i: number) => {
                                        let [gain, display_name] = MECH_GAIN[key] as [number, string];
                                        return (
                                            <option value={key} key={i}>
                                                {display_name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="Input">
                            <div className="Title">
                                <span>
                                    {"Micro Steps"}
                                </span>
                            </div>
                            <div className="DropDown">
                                <select value={MicroSteps} onChange={selectMicroSteps}>
                                    {ALL_MICRO_STEPS.map((m: MICRO_STEPS, i: number) => {
                                        return (
                                            <option value={m} key={i}>
                                                {m}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="Input">
                            <div className="Title">
                                <span>
                                    {"Direction"}
                                </span>
                            </div>
                            <div className="DropDown">
                                <select value={Direction} onChange={selectDirection}>
                                    {Object.keys(ALL_DIRECTIONS).map((key: string, i: number) => {
                                        return (
                                            <option value={ALL_DIRECTIONS[key] as number} key={i}>
                                                {key}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="Trash">
                        <span className="icon-delete" onClick={removeDrive}>
                        </span>
                    </div>
                </div>
            );
        };

        let addDrive = () => {
            let newDrive = getNextDrive();
            setEditingDrives([...editingDrives, newDrive]);
        };

        return (
            <ContentItem {...contentItemProps}>
                <div className="Drives">
                    <div className="Configure">
                        <div className="DriveContainer">
                            {editingDrives.map((d: Drive, i: number) => {
                                return (
                                    <DriveCell drive={d} index={i} key={i} />
                                );
                            })}
                            <div className="NewDriveCell">
                                <div className="NewDriveCell">
                                    <div className="AddButton" onClick={addDrive} >
                                        <img src={plus_icon} />
                                        <span>
                                            {"Add drive"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="DisplayContainer">
                            <div className="Display">
                                <img src={palletizerImage} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    };
};



export default Drives;
