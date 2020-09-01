import React, { useState, ChangeEvent } from "react";

import ContentItem, { ButtonProps } from "../teach/ContentItem";

import { MachineMotion } from "./MachineMotions";

import palletizerImage from "./images/palletizer.png";

import plus_icon from "../teach/images/plus.svg";

import "./css/Drives.scss";

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

enum DIRECTION {
    NORMAL = 1,
    REVERSE = -1
};
/* enum MECH_GAIN {
 *     timing_belt_150mm_turn = 150,
 *     legacy_timing_belt_200_mm_turn = 200,
 *     enclosed_timing_belt_mm_turn = 208,
 *     ballscrew_10mm_turn = 10,
 *     legacy_ballscrew_5_mm_turn = 5,
 *     indexer_deg_turn = 85,
 *     indexer_v2_deg_turn = 36,
 *     roller_conveyor_mm_turn = 157,
 *     belt_conveyor_mm_turn = 73.563,
 *     rack_pinion_mm_turn = 157.08,
 * };
 *  */

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
    axis: AXES;
    MachineMotionIndex: number;
    DriveNumber: DRIVE;
    MechGainKey: string;
    MicroSteps: MICRO_STEPS;
    Direction: DIRECTION
};

interface DriveCellProps {
    drive: Drive,
    updateDrive: (d: Drive) => void;
};

// We could enforce an order to the madness. 
function DriveCell({ drive, updateDrive }: DriveCellProps) {

};

function getNextDrive() {
    // Increments are key here.
    let d: Drive = {
        axis: AXES.X,
        MachineMotionIndex: 0,
        DriveNumber: DRIVE.ONE,
        MechGainKey: Object.keys(MECH_GAIN)[0] as string,
        MicroSteps: MICRO_STEPS.ustep_8,
        Direction: DIRECTION.NORMAL
    };
    return d;
};

interface DrivesProps {
    allDrives: Drive[];
    allMachines: MachineMotion[];
    setDrives: (d: Drive[]) => void;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};


function axisString(ax: AXES): string {
    let arr = ["X", "Y", "Z", "θ"] as string[];
    return arr[ax as number];
}


function Drives({ allDrives, setDrives, allMachines, handleBack, handleNext, instructionNumber }: DrivesProps) {


    let haveAllDrives = () => {
        return false;
    };

    let [editingDrives, setEditingDrives] = useState<Drive[]>(allDrives.length > 0 ? [...allDrives] : [getNextDrive()]);
    let [summaryScreen, setSummaryScreen] = useState<boolean>(haveAllDrives());
    let [currentAxis, setCurrentAxis] = useState<AXES>(AXES.X);
    let [editingDrive, setEditingDrive] = useState<Drive>(getNextDrive());

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
            if (haveAllDrives()) {
                handleNext();
            }
        },
        enabled: haveAllDrives()
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

        let { MachineMotionIndex, DriveNumber } = editingDrive;

        let handleMachine = (e: ChangeEvent) => {
            let machineIndex: number = +(e.target as any).value;
            setEditingDrive({ ...editingDrive, MachineMotionIndex: machineIndex });
        };

        let handleDrive = (e: ChangeEvent) => {
            let driveNumber: number = +(e.target as any).value;
            setEditingDrive({ ...editingDrive, DriveNumber: driveNumber });
        };

        // Axis Cells Are Needed Now;
        let DriveCell = ({ axis }: Drive) => {
            return (
                <div className="DriveConfigCell">
                    {axis}
                </div>
            );
        };

        return (
            <ContentItem {...contentItemProps}>
                <div className="Drives">
                    <div className="Configure">
                        <div className="AxisContainer">
                            {allDrives.map((d: Drive, i: number) => {
                                return (
                                    <DriveCell {...d} />
                                );
                            })}
                            <div className="DriveConfigCell">
                                <div className="NewDriveCell">

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
