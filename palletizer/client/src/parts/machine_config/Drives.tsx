import React, { useState, ChangeEvent, useEffect } from "react";

import ContentItem, { ButtonProps } from "../teach/ContentItem";

import { MachineMotion } from "./MachineMotions";

import SolidArrow, { ROTATION } from "../teach/SolidArrow";

import { DIRECTION } from "mm-js-api";

import JogController from "../../jogger/Jogger";

//---------------Images---------------
import palletizerImage from "./images/palletizer.png";
import plus_icon from "../teach/images/plus.svg";
//---------------Styles---------------
import "./css/Drives.scss";
import { wrapChangeEventNumber, wrapChangeEventString } from "../shared/shared";

function changeVal(e: ChangeEvent): string {
    let val: string = (e.target as any).value;
    return val;
};

export enum AXES {
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

enum NumericalDirection {
    NORMAL = 1,
    REVERSE = -1
};

enum MICRO_STEPS {
    ustep_full = 1,
    ustep_2 = 2,
    ustep_4 = 4,
    ustep_8 = 8,
    ustep_16 = 16,
};

const ALL_MICRO_STEPS = [MICRO_STEPS.ustep_full, MICRO_STEPS.ustep_2, MICRO_STEPS.ustep_4, MICRO_STEPS.ustep_8, MICRO_STEPS.ustep_16];

const ALL_DIRECTIONS = { "Normal": NumericalDirection.NORMAL, "Reverse": NumericalDirection.REVERSE } as { [key: string]: NumericalDirection };

const MECH_GAIN = {
    timing_belt_150mm_turn: [150, "Timing Belt"],
//    legacy_timing_belt_200_mm_turn: [200, "Legacy Timing Belt"],
    enclosed_timing_belt_mm_turn: [208, "Enclosed Timing Belt"],
    ballscrew_10mm_turn: [10, "Ball Screw"],
//    legacy_ballscrew_5_mm_turn: [5, "Legacy Ball Screw"],
//    indexer_deg_turn: [85, "Indexer Degree Turn"],
    indexer_v2_deg_turn: [36, "Rotary Actuator"], // Rename to rotary actuator.
    roller_conveyor_mm_turn: [157, "Roller Conveyor"],
    belt_conveyor_mm_turn: [73.563, "Belt Conveyor"],
    rack_pinion_mm_turn: [157.08, "Rack & Pinion"]
} as { [key: string]: [number, string] };

/* 
 * Max in mm/min.
 * HARDWARE_MIN_HOMING_FEEDRATE =251 
 * HARDWARE_MAX_HOMING_FEEDRATE= 15999 */
export interface Drive {
    MachineMotionIndex: number;
    DriveNumber: DRIVE;
    MechGainKey: string;
    MechGainValue: number;
    MicroSteps: MICRO_STEPS;
    Gearbox: boolean;
    Direction: NumericalDirection;
    HomingSpeed: number;
    Speed: number;
    Acceleration: number;
};

//---------------Fix This To Avoid The Horrific Switch Statements---------------
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

export interface DriveSummaryProps {
    Axes: AxesConfiguration;
    Machines: MachineMotion[];
    handleEditAxis: (a: AXES) => () => void;
    noEdit?: boolean;
};

export function DriveSummary({ Axes, handleEditAxis, Machines, noEdit }: DriveSummaryProps) {
    const [jogController, setJogController] = useState<JogController | null>(null);
    const [isMoving, setIsMoving] = useState<boolean>(false);
    const [isEstopped, setIsEstopped] = useState<boolean>(false);

    useEffect(() => {
        let jc = new JogController(Machines, Axes, (_: any) => { }, setIsMoving, setIsEstopped);
        jc.setJogSpeed(50).catch(() => { });
        jc.setJogIncrement(50).catch(() => { });
        setJogController(jc);
    }, [Axes, Machines]);

    const handleMove = (axis_string: string, direction: DIRECTION) => () => {
        if (jogController !== null) {
            if (axis_string === "θ") {
                jogController.startRotation(direction === DIRECTION.NORMAL).catch(() => { });
            } else {
                jogController.startJog(axis_string, direction).catch(() => { });
            }
        }
    };

    interface AxisListingProps {
        drives: Drive[];
        title: string;
        handleEdit: () => void;
    };

    const stop_jog = (_: string) => () => {
        if (jogController !== null) {
            jogController.stopMotion().catch(e => console.log(e));
        }
    };

    const reset_jog = (_: string) => () => {
        if (jogController !== null) {
            jogController.prepareSystem().catch(e => console.log(e));
        }
    };

    const home_jog = (axis: string) => () => {
        if (jogController !== null) {
            jogController.startHome(axis).catch(e => console.log(e));
        }
    };

    const [button_string, button_action] = (() => {
        if (isMoving) {
            return ["Stop", stop_jog];
        } else if (isEstopped) {
            return ["Reset", reset_jog];
        } else {
            return ["Home", home_jog];
        }
    })() as [string, ((s: string) => () => void)];

    const showEdit: boolean = (() => {
        if (noEdit) {
            return false;
        } else {
            return true;
        }
    })();


    let AxisListing = ({ drives, title, handleEdit }: AxisListingProps) => {
        return (
            <div className="AxisListing">
                <div className={"AxisListingCell" + (showEdit ? "" : "NoEdit")}>
                    <div className="Title">
                        <span>
                            {title + " Axis"}
                        </span>
                    </div>
                    <div className="DetailsContainer">
                        <div className="Details">
                            <span>
                                {String(drives.length) + " Drive" + (drives.length > 1 ? "s" : "")}
                            </span>
                        </div>
                    </div>
                    <div className="AxisJog">
                        <div className="ArrowLeft" onClick={handleMove(title, DIRECTION.REVERSE)}>
                            <SolidArrow size={70} longer={110} rotation={ROTATION.LEFT} />
                        </div>
                        <div className="ButtonCenter">
                            <div className="Button" onClick={button_action(title)}>
                                <span>
                                    {button_string}
                                </span>
                            </div>
                        </div>
                        <div className="ArrowRight" onClick={handleMove(title, DIRECTION.NORMAL)}>
                            <SolidArrow size={70} longer={110} rotation={ROTATION.RIGHT} />
                        </div>
                    </div>
                    {showEdit &&
                        <div className="Edit">
                            <div className="EditButton" onClick={handleEdit}>
                                <span>
                                    {"Edit"}
                                </span>
                            </div>
                        </div>}
                </div>
            </div>
        );
    };

    return (
        <div className="AxesSummary">
            <div className="AxesScroll">
                <AxisListing drives={Axes.X} title={"X"} handleEdit={handleEditAxis(AXES.X)} />
                <AxisListing drives={Axes.Y} title={"Y"} handleEdit={handleEditAxis(AXES.Y)} />
                <AxisListing drives={Axes.Z} title={"Z"} handleEdit={handleEditAxis(AXES.Z)} />
                <AxisListing drives={Axes.θ} title={"θ"} handleEdit={handleEditAxis(AXES.θ)} />
            </div>
            <div className="DisplayContainer">
                <div className="Display">
                    <img src={palletizerImage} />
                </div>
            </div>
        </div>
    );
};


function getAllDrives(a: AxesConfiguration) {
    return [...a.X, ...a.Y, ...a.Z, ...a.θ];
};

function nextDrive(a: AxesConfiguration, m: MachineMotion[]): Drive {
    // limit to available drives.
    const allDrives = getAllDrives(a);
    const gain_key = Object.keys(MECH_GAIN)[0] as string;
    return {
        MachineMotionIndex: 0,
        DriveNumber: DRIVE.ONE,
        MechGainKey: gain_key,
        MechGainValue: MECH_GAIN[gain_key][0],
        MicroSteps: MICRO_STEPS.ustep_8,
        Direction: NumericalDirection.NORMAL,
        Gearbox: false,
        HomingSpeed: 300,
        Speed: 400,
        Acceleration: 400
    };
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
    editingDrives: Drive[];
    allMachines: MachineMotion[];
    setEditingDrives: (ds: Drive[]) => void;
};

function DriveCell({ drive, index, editingDrives, setEditingDrives, allMachines }: DriveCellProps) {

    const { MachineMotionIndex, DriveNumber, MechGainKey, MicroSteps, Direction, Gearbox } = drive;

    const selectMachineMotion = wrapChangeEventNumber((mm_i: number) => {
        let cp = [...editingDrives];
        cp[index].MachineMotionIndex = mm_i;
        setEditingDrives(cp);
    });

    const selectDrive = wrapChangeEventNumber((d_num: number) => {
        let cp = [...editingDrives];
        cp[index].DriveNumber = d_num as DRIVE;
        setEditingDrives(cp);
    });

    const selectGain = wrapChangeEventString((key: string) => {
        let cp = [...editingDrives];
        cp[index].MechGainKey = key;
        cp[index].MechGainValue = MECH_GAIN[key][0];
        setEditingDrives(cp);
    });

    const selectMicroSteps = wrapChangeEventNumber((steps: number) => {
        let cp = [...editingDrives];
        cp[index].MicroSteps = steps;
        setEditingDrives(cp);
    });

    const selectDirection = wrapChangeEventNumber((direction: number) => {
        let cp = [...editingDrives];
        cp[index].Direction = direction as NumericalDirection;
        setEditingDrives(cp);
    });

    const handleGearbox = () => {
        let cp = [...editingDrives];
        cp[index].Gearbox = !Gearbox;
        setEditingDrives(cp);
    };

    const setSpeed = wrapChangeEventNumber((speed: number) => {
        let cp = [...editingDrives];
        cp[index].Speed = speed;
        setEditingDrives(cp);
    });

    const setAcceleration = wrapChangeEventNumber((acceleration: number) => {
        let cp = [...editingDrives];
        cp[index].Acceleration = acceleration;
        setEditingDrives(cp);
    });

    const setHomingSpeed = wrapChangeEventNumber((speed: number) => {
        let cp = [...editingDrives];
        cp[index].HomingSpeed = speed;
        setEditingDrives(cp);
    });

    const removeDrive = () => {
        if (editingDrives.length > 1) {
            let cp = [...editingDrives];
            cp.splice(index, 1);
            setEditingDrives([...cp]);
        }
    };

    const { Speed, HomingSpeed, Acceleration } = editingDrives[index];

    return (
        <div className="DriveConfigCell">
            <div className="DriveCell">
                <div className="DriveCellContent">
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
                                {"Actuator Type"}
                            </span>
                        </div>
                        <div className="DropDown">
                            <select value={MechGainKey} onChange={selectGain}>
                                {Object.keys(MECH_GAIN).map((key: string, i: number) => {
                                    let [_, display_name] = MECH_GAIN[key] as [number, string];
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
                                {"Gearbox"}
                            </span>
                        </div>
                        <div className="CheckBox">
                            <input type="checkbox" checked={Gearbox} onChange={handleGearbox} />
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
                <div className="DriveCellContent" style={{ justifyContent: "center" }}>
                    <div className="Input">
                        <div className="Title">
                            <span>
                                {"Speed (mm/s)"}
                            </span>
                        </div>
                        <div className="Input">
                            <input type="number" onChange={setSpeed} value={Speed} />
                        </div>
                    </div>
                    <div className="Input">
                        <div className="Title">
                            <span>
                                {"Acceleration (mm/s²)"}
                            </span>
                        </div>
                        <div className="Input">
                            <input type="number" onChange={setAcceleration} value={Acceleration} />
                        </div>
                    </div>
                    <div className="Input">
                        <div className="Title">
                            <span>
                                {"Homing Speed (mm/s)"}
                            </span>
                        </div>
                        <div className="Input">
                            <input type="number" onChange={setHomingSpeed} value={HomingSpeed} />
                        </div>
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


function Drives({ Axes, setAxes, allMachines, handleBack, handleNext, instructionNumber }: DrivesProps) {

    let haveAllDrives = () => {
        let { X, Y, Z, θ } = Axes;
        let all = (X.length > 0 && Y.length > 0 && Z.length > 0 && θ.length > 0);
        return all;
    };

    let getNextDrive = () => {
        return nextDrive(Axes, allMachines);
    };

    const [editingDrives, setEditingDrives] = useState<Drive[]>([getNextDrive()]);
    const [summaryScreen, setSummaryScreen] = useState<boolean>(haveAllDrives());
    const [currentAxis, setCurrentAxis] = useState<AXES>(AXES.X);
    const [fromSummary, setFromSummary] = useState<boolean>(summaryScreen);

    let instruction: string = "Test palletizer X, Y, Z and θ axes by jogging the actuators";

    let handleEdit = (a: AXES) => () => {
        let eDrives: Drive[] = [];

        switch (a) {
            case (AXES.X): {
                eDrives = [...Axes.X];
                break;
            };
            case (AXES.Y): {
                eDrives = [...Axes.Y];
                break;
            };
            case (AXES.Z): {
                eDrives = [...Axes.Z];
                break;
            };
            case (AXES.θ): {
                eDrives = [...Axes.θ];
                break;
            };
        };

        setEditingDrives(eDrives.length > 0 ? eDrives : [getNextDrive()]);
        setCurrentAxis(a);
        setSummaryScreen(false);
    };

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            if (fromSummary && !summaryScreen) {
                setSummaryScreen(true);
            } else if (summaryScreen || currentAxis === AXES.X) {
                handleBack();
            } else {
                handleEdit((currentAxis as number) - 1)();
            }
        }
    };

    let RightButton: ButtonProps = {
        name: (fromSummary && !summaryScreen) || (summaryScreen) ? "Done" : "Next",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                if (editingDrives.length > 0) {
                    let cp: AxesConfiguration = { ...Axes };
                    let cAxis: AXES = AXES.X;
                    let eDrives: Drive[] = [];
                    switch (currentAxis) {
                        case (AXES.X): {
                            cp.X = [...editingDrives];
                            cAxis = AXES.Y;
                            eDrives = [...Axes.Y];
                            break;
                        };
                        case (AXES.Y): {
                            cp.Y = [...editingDrives];
                            cAxis = AXES.Z;
                            eDrives = [...Axes.Z];
                            break;
                        };
                        case (AXES.Z): {
                            cp.Z = [...editingDrives];
                            cAxis = AXES.θ;
                            eDrives = [...Axes.Z];
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
                    setEditingDrives(eDrives.length > 0 ? eDrives : [getNextDrive()]);
                    if (currentAxis === AXES.θ || fromSummary) {
                        setSummaryScreen(true);
                        setFromSummary(true);
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

        let driveSummaryProps: DriveSummaryProps = {
            Axes,
            Machines: allMachines,
            handleEditAxis: handleEdit
        };

        return (
            <ContentItem {...contentItemProps}>
                <DriveSummary {...driveSummaryProps} />
            </ContentItem>
        );

    } else {
        contentItemProps.instruction = "Configure drives for " + axisString(currentAxis) + " axis";

        // Drive Cell Component

        const addDrive = () => {
            let newDrive = getNextDrive();
            setEditingDrives([...editingDrives, newDrive]);
        };

        return (
            <ContentItem {...contentItemProps}>
                <div className="Drives">
                    <div className="Configure">
                        <div className="DriveContainer">
                            {editingDrives.map((d: Drive, i: number) => {
                                const dc_props: DriveCellProps = {
                                    index: i,
                                    drive: d,
                                    allMachines,
                                    editingDrives,
                                    setEditingDrives
                                };
                                return (
                                    <DriveCell {...dc_props} key={i} />
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
