import React, { useState, ChangeEvent } from "react";

import ContentItem, { ButtonProps } from "../teach/ContentItem";


//---------------Style---------------
import "./css/Drives.scss";
import { MachineMotion } from "./MachineMotions";

//---------------Images---------------
import palletizerImage from "./images/palletizer.png";



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

export interface Drive {
    axis: AXES;
    MachineMotionIndex: number;
    DriveNumber: DRIVE;
}


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
        DriveNumber: DRIVE.ONE
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

    /* let AddButton: ButtonProps = {
     *     name: "Add new axis",
     *     action: () => {
     *         setEditingDrives([...editingDrives, getNextDrive()]);
     *     }
     * }; */

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
        contentItemProps.instruction = "Configure drive for " + axisString(currentAxis) + " axis";

        let { MachineMotionIndex, DriveNumber } = editingDrive;

        let handleMachine = (e: ChangeEvent) => {
            let machineIndex: number = +(e.target as any).value;
            setEditingDrive({ ...editingDrive, MachineMotionIndex: machineIndex });
        };

        let handleDrive = (e: ChangeEvent) => {
            let driveNumber: number = +(e.target as any).value;
            setEditingDrive({ ...editingDrive, DriveNumber: driveNumber });
        };



        return (
            <ContentItem {...contentItemProps}>
                <div className="Drives">
                    <div className="Configure">
                        <div className="DriveConfig">
                            <div className="AxisName">
                                <span>
                                    {axisString(currentAxis) + "-Axis Configuration"}
                                </span>
                            </div>
                            <div className="ConfigInput">
                                <div className="Name">
                                    <span>
                                        {"Machine Motion:"}
                                    </span>
                                </div>
                                <div className="Input">
                                    <select value={MachineMotionIndex} onChange={handleMachine}>
                                        {allMachines.map((m: MachineMotion, i: number) => {
                                            return (
                                                <option value={i} key={i}> {m.name + ` (${m.ipAddress})`} </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="ConfigInput">
                                <div className="Name">
                                    <span>
                                        {"Drive:"}
                                    </span>
                                </div>
                                <div className="Input">
                                    <select value={DriveNumber} onChange={handleDrive}>
                                        {ALL_DRIVES.map((a: DRIVE, i: number) => {
                                            return (
                                                <option value={a} key={i}> {String(a + 1)} </option>
                                            )
                                        })}
                                    </select>
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
    }
};


export default Drives;
