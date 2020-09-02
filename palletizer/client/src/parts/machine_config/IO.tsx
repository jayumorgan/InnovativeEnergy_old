import React, { useState } from "react";

import { MachineMotion } from "./MachineMotions";
import ContentItem, { ButtonProps } from "../teach/ContentItem";

import plus_icon from "../teach/images/plus.svg";

import "./css/IO.scss";

export interface IOState {
    MachineMotionIndex: number;
    NetworkId: number;
    Pins: [boolean, boolean, boolean, boolean];
};

const ALL_NETWORK_IDS: number[] = [0, 1, 2];

export interface IO {
    On: IOState[];
    Off: IOState[];
};

export function defaultIO(): IO {
    return {
        On: [],
        Off: []
    };
};

function defaultIOState(): IOState {
    return {
        MachineMotionIndex: 0,
        NetworkId: 0, // 0, 1, 2? 
        Pins: [false, false, false, false] // 0,1,2,3
    };
};

interface IOConfigProps {
    allMachines: MachineMotion[];
    io: IO;
    setIO: (io: IO) => void;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

export default function IOConfig({ io, allMachines, setIO, handleBack, handleNext, instructionNumber }: IOConfigProps) {

    let [currentStateStep, setCurrentStateStep] = useState<boolean>(false);

    let [editingIOs, setEditingIOs] = useState<IOState[]>((() => {
        let curr: IOState[] = [];
        if (currentStateStep) {
            curr = [...io.On];
        } else {
            curr = [...io.Off];
        }
        if (curr.length === 0) {
            curr.push(defaultIOState());
        }
        return curr;
    })());

    let instruction: string = (currentStateStep) ? "Configure the digital outputs for active (suction on)" : "Configure the digital outputs for idle (suction off)";

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            let cp = { ...io };
            if (currentStateStep) {
                cp.On = [...editingIOs];
                setIO(cp);
                handleNext();
            } else {
                // save them.
                let cp = { ...io };
                cp.Off = [...editingIOs];
                setIO(cp);
                setCurrentStateStep(true);
                setEditingIOs(io.On.length > 0 ? [...io.On] : [defaultIOState()]);
            }
        },
        enabled: true
    };


    let AddButton: ButtonProps = {
        name: "Add new output",
        action: () => {
            setEditingIOs([...editingIOs, defaultIOState()]);
        }
    };

    let contentItemProps = {
        instruction,
        instructionNumber,
        LeftButton,
        RightButton,
        AddButton
    } as any;

    let removeOutput = (index: number) => () => {
        let cp = [...editingIOs];
        cp.splice(index, 1);
        setEditingIOs([...cp]);
    };

    let addIOState = () => {
        setEditingIOs([...editingIOs, defaultIOState()]);
    };

    interface IOCellProps {
        index: number;
        state: IOState;
    };

    let handleTest = (i: number) => () => {
        let s: IOState = editingIOs[i];
        console.log("Test io module ", s.MachineMotionIndex, s.NetworkId, s.Pins);
    };

    let toggleSwitch = (i: number, j: number) => () => {
        let cp = [...editingIOs];
        cp[i].Pins[j] = !(cp[i].Pins[j]);
        setEditingIOs([...cp]);
    };

    //-------IO Cell-------
    let IOCell = ({ index, state }: IOCellProps) => {

        return (
            <div className="IOCellContainer">
                <div className="IOCell">
                    <div className="Input">
                        <div className="Title">
                            <span>
                                {"Machine Motion"}
                            </span>
                        </div>
                        <div className="DropDown">
                            <select value={state.MachineMotionIndex}>
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
                                {"IO Module"}
                            </span>
                        </div>
                        <div className="DropDown">
                            <select value={state.NetworkId}>
                                {ALL_NETWORK_IDS.map((v: number, i: number) => {
                                    return (
                                        <option value={v} key={i}>
                                            {"Module " + String(v)}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                    {state.Pins.map((pin: boolean, i: number) => {
                        return (
                            <div className="SwitchContainer">

                                <div className="Name">
                                    <span>
                                        {"Pin " + String(i)}
                                    </span>
                                </div>

                                <div className="Status">
                                    <div className="Switch" onClick={toggleSwitch(index, i)}>
                                        {pin &&
                                            <div className="NumberContainer">
                                                <div className="Number">
                                                    <span> {"1"} </span>
                                                </div>
                                            </div>}
                                        {pin && <div className="SwitchHandle"></div>}
                                        {(!pin) && <div className="SwitchHandle"> </div>}
                                        {(!pin) &&
                                            <div className="NumberContainer">
                                                <div className="Number">
                                                    <span> {"0"} </span>
                                                </div>
                                            </div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="Test">
                        <div className="TestButton" onClick={handleTest(index)}>
                            <span>
                                {"Test"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="Trash">
                    <span className="icon-delete" onClick={removeOutput(index)}>
                    </span>
                </div>
            </div>
        );
    };

    return (
        <ContentItem {...contentItemProps}>
            <div className="IOConfig">
                <div className="IOScroll">
                    {editingIOs.map((state: IOState, i: number) => {
                        return (
                            <IOCell index={i} state={state} key={i} />
                        );
                    })}

                </div>
            </div>
        </ContentItem>
    );
}
/*
 * <div className="NewIOCell">
 * <div className="NewIOCell">
 * <div className="AddButton" onClick={addIOState} >
 * <img src={plus_icon} />
 * <span>
 * {"Add Output Module"}
 * </span>
 * </div>
 * </div>
 * </div> */
