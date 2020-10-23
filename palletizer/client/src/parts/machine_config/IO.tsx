import React, { useState, useEffect, ChangeEvent } from "react";
import { MachineMotion } from "./MachineMotions";
import IOController from "../../jogger/IO";
import ContentItem, { ButtonProps } from "../teach/ContentItem";
import { IODeviceState } from "mm-js-api";

import "./css/IO.scss";

export interface IOState {
    MachineMotionIndex: number;
    NetworkId: number;
    Pins: IODeviceState;
};

// ALL_NETWORK_IDS
export const ALL_NETWORK_IDS: number[] = [0, 1, 2];

export interface IO {
    On: IOState[];
    Off: IOState[];
    Complete: IOState[];
};

export function defaultIO(): IO {
    return { On: [], Off: [], Complete: [] };
};

export function defaultIOState(): IOState {
    return {
        MachineMotionIndex: 0,
        NetworkId: 0, // 0, 1, 2? 
        Pins: [false, false, false, false] // 0,1,2,3
    };
};

interface IOCellProps {
    index: number;
    state: IOState;
    ioController: IOController;
    allMachines: MachineMotion[];
    handleSelectMachineMotion: (i: number) => (e: ChangeEvent) => void;
    handleSelectNetworkId: (i: number) => (e: ChangeEvent) => void;
    toggleSwitch: (index: number, pin: number) => () => void;
    removeOutput: (index: number) => () => void;
};

function IOCell({ index, ioController, state, handleSelectMachineMotion, handleSelectNetworkId, toggleSwitch, removeOutput, allMachines }: IOCellProps) {

    const [isTesting, setIsTesting] = useState<boolean>(false);

    const handleTest = () => {
        ioController.triggerTest(state).then(() => {
            setIsTesting(true);
            console.log("Starting IO Test");
        }).catch((e: any) => {
            console.log("Error trigger test", e);
        });
    };

    const handleStop = () => {
        ioController.triggerStop().then(() => {
            setIsTesting(false);
        }).catch((e: any) => {
            console.log("Error stopping io's", e);
        });
    };

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
                        <select value={state.MachineMotionIndex} onChange={handleSelectMachineMotion(index)}>
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
                        <select value={state.NetworkId} onChange={handleSelectNetworkId(index)}>
                            {ALL_NETWORK_IDS.map((v: number, i: number) => {
                                return (
                                    <option value={v} key={i}>
                                        {"Module " + String(v + 1)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                {state.Pins.map((pin: boolean, i: number) => {
                    return (
                        <div className="SwitchContainer" key={i}>

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
                    <div className="TestButton" onClick={isTesting ? handleStop : handleTest}>
                        <span>
                            {isTesting ? "Stop" : "Test"}
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

interface IOConfigProps {
    allMachines: MachineMotion[];
    io: IO;
    setIO: (io: IO) => void;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

export enum IOSteps {
    SUCTION_OFF = 0,
    SUCTION_ON = 1,
    COMPLETE_IO = 2
};
const IO_instructions: string[] = [
    "Configure digital output for suction off",
    "Configure digital output for suction on",
    "Configure digital output for completion indicator"
];


export default function IOConfig({ io, allMachines, setIO, handleBack, handleNext, instructionNumber }: IOConfigProps) {

    const [currentStateStep, setCurrentStateStep] = useState<IOSteps>(IOSteps.SUCTION_OFF);
    const [ioControllers, setioControllers] = useState<IOController[]>([]);

    useEffect(() => {
        setioControllers(allMachines.map((machine: MachineMotion) => {
            return new IOController(machine);
        }));
    }, []);

    const orDefault = (s: IOState[]) => {
        if (s && s.length > 0) {
            return s;
        } else {
            return [defaultIOState()];
        }
    };

    const getNextIOs = (cs: IOSteps) => {
        switch (cs) {
            case IOSteps.SUCTION_OFF: {
                return orDefault(io.Off);
            }
            case IOSteps.SUCTION_ON: {
                return orDefault(io.On);
            }
            case IOSteps.COMPLETE_IO: {
                return orDefault(io.Complete);
            }
            default: {
                return orDefault([]);
            }
        }
    }

    const [editingIOs, setEditingIOs] = useState<IOState[]>(getNextIOs(currentStateStep));

    let instruction: string = IO_instructions[currentStateStep];

    const LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    const changeStep = (s: IOSteps) => {
        setCurrentStateStep(s);
        setEditingIOs(getNextIOs(s));
    };

    const RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            let cp = { ...io };
            switch (currentStateStep) {
                case IOSteps.SUCTION_OFF: {
                    cp.Off = [...editingIOs];
                    setIO(cp);
                    changeStep(currentStateStep + 1);
                    break;
                }
                case IOSteps.SUCTION_ON: {
                    cp.On = [...editingIOs];
                    setIO(cp);
                    changeStep(currentStateStep + 1);
                    break;
                }
                case IOSteps.COMPLETE_IO: {
                    cp.Complete = [...editingIOs];
                    setIO(cp);
                    handleNext();
                    break;
                }
            }
        },
        enabled: true
    };

    const AddButton: ButtonProps = {
        name: "Add new output",
        action: () => {
            setEditingIOs([...editingIOs, defaultIOState()]);
        }
    };

    const contentItemProps = {
        instruction,
        instructionNumber,
        LeftButton,
        RightButton,
        AddButton
    } as any;

    const removeOutput = (index: number) => () => {
        let cp = [...editingIOs];
        cp.splice(index, 1);
        setEditingIOs([...cp]);
    };

    const toggleSwitch = (i: number, j: number) => () => {
        let cp = [...editingIOs];
        cp[i].Pins[j] = !(cp[i].Pins[j]);
        setEditingIOs([...cp]);
    };

    const handleSelectMachineMotion = (io_index: number) => (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        let cp = [...editingIOs];
        cp[io_index].MachineMotionIndex = val;
        setEditingIOs(cp);
    };

    const handleSelectNetworkId = (io_index: number) => (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        let cp = [...editingIOs];
        cp[io_index].NetworkId = val;
        setEditingIOs(cp);
    };

    const ioCellAdditionalProps = {
        handleSelectNetworkId,
        handleSelectMachineMotion,
        toggleSwitch,
        removeOutput,
        allMachines
    } as any;

    return (
        <ContentItem {...contentItemProps}>
            <div className="IOConfig">
                <div className="IOScroll">
                    {editingIOs.map((state: IOState, i: number) => {
                        return (
                            <IOCell index={i} state={state} ioController={ioControllers[state.MachineMotionIndex]} {...ioCellAdditionalProps} key={i} />
                        );
                    })}
                </div>
            </div>
        </ContentItem>
    );
};
