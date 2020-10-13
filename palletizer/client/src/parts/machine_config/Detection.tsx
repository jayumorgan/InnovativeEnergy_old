import React, { useState, useEffect, ChangeEvent } from "react";
import { IODeviceState, vResponse } from "mm-js-api";
import ContentItem, { ButtonProps } from "../teach/ContentItem";
import { IOState, defaultIOState, ALL_NETWORK_IDS } from "./IO";
import { ControlProps, changeEventToNumber } from "../shared/shared";
import { MachineMotion } from "./MachineMotions";
import IOController from "../../jogger/IO";

//---------------Styles---------------
import "./css/Detection.scss";


function SplashScreen() {
    return (
        <div className="SplashScreen">
            <span>
                {"No input profiles configured"}
            </span>
        </div>
    );
};

interface DetectionCellProps {
    updateState: (state: IOState) => void;
    state: IOState;
    allMachines: MachineMotion[];
    ioController: IOController;
    removeDetectionCell: () => void;
};

function DetectionCell({ state, updateState, allMachines, ioController, removeDetectionCell }: DetectionCellProps) {

    const [currentPinValues, setCurrentPinValues] = useState<IODeviceState>([false, false, false, false]);

    const handleIoValueUpdate = (device_id: number, s: IODeviceState) => {
        if (device_id === state.NetworkId) {
            setCurrentPinValues(s);
        }
    };

    useEffect(() => {
        ioController.machineMotion.setIoValueUpdateCallback(handleIoValueUpdate);
        ioController.detectInputState(state.NetworkId).then((res: vResponse) => {
            let s: IODeviceState = res.result as IODeviceState;
            setCurrentPinValues(s);
        }).catch((e: any) => {
            console.log("Error retrieving device input state", e);
        })
    }, []);

    const updateNetworkId = (e: ChangeEvent) => {
        let NetworkId: number = changeEventToNumber(e);
        updateState({ ...state, NetworkId });
    };

    const updateMachineMotionIndex = (e: ChangeEvent) => {
        let MachineMotionIndex: number = changeEventToNumber(e);
        updateState({ ...state, MachineMotionIndex });
    };

    const togglePin = (pin_index: number) => () => {
        let s = { ...state };
        s.Pins[pin_index] = !(s.Pins[pin_index]);
        updateState(s);
    };

    return (
        <div className="DetectionCellContainer">
            <div className="DetectionCell">
                <div className="Input">
                    <div className="Title">
                        <span>
                            {"Machine Motion"}
                        </span>
                    </div>
                    <div className="DropDown">
                        <select value={state.MachineMotionIndex} onChange={updateMachineMotionIndex}>
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
                        <select value={state.NetworkId} onChange={updateNetworkId}>
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
                            <div className="Current">
                                <span id="label">
                                    {"Current:"}
                                </span>
                                <span>
                                    {currentPinValues[i] ? "1" : "0"}
                                </span>
                            </div>
                            <div className="Status">
                                <div className="Switch" onClick={togglePin(i)}>
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

            </div>
            <div className="Trash">
                <span className="icon-delete" onClick={removeDetectionCell}>
                </span>
            </div>
        </div>
    );
};


export interface DetectionProps extends ControlProps {
    setDetection: (detection: IOState[]) => void;
    box_detection?: IOState[];
    allMachines: MachineMotion[];
    isDetection: boolean; // Toggle between io state setup for box detection and good pick
};

export default function Detection({ handleNext, handleBack, instructionNumber, setDetection, box_detection, allMachines, isDetection }: DetectionProps) {

    const [detectionArray, setDetectionArray] = useState<IOState[]>(box_detection ? box_detection : [] as IOState[]);

    useEffect(() => {
        setDetectionArray(box_detection ? box_detection : [] as IOState[]);
    }, [box_detection]);

    const getIOControllers = () => {
        let ios: IOController[] = allMachines.map((machine: MachineMotion) => {
            return new IOController(machine);
        });
        return ios;
    };

    const [ioControllers, setioControllers] = useState<IOController[]>(getIOControllers());

    useEffect(() => {
        setioControllers(getIOControllers());
    }, [allMachines]);

    const instruction: string = `Create an input profile for ${isDetection ? "box detection" : "picked box"}`;

    const LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    const RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            setDetection(detectionArray);
            handleNext();
        },
        enabled: true
    };

    const AddButton: ButtonProps = {
        name: "Add new input",
        action: () => {
            let cp = [...detectionArray];
            cp.push(defaultIOState());
            setDetectionArray(cp);
        }
    };

    const contentItemProps: any = {
        LeftButton,
        RightButton,
        AddButton,
        instruction,
        instructionNumber
    };

    const updateCellAtIndex = (index: number) => (state: IOState) => {
        let cp = [...detectionArray];
        cp[index] = state;
        setDetectionArray(cp);
    };

    const removeCell = (index: number) => () => {
        let cp = [...detectionArray];
        cp.splice(index, 1);
        setDetectionArray(cp);
    };

    return (
        <ContentItem {...contentItemProps} >
            <div className="Detection">
                <div className="DetectionScroll">
                    {detectionArray.length === 0 ?
                        (<SplashScreen />)
                        :
                        detectionArray.map((state: IOState, i: number) => {
                            const cellProps: DetectionCellProps = {
                                updateState: updateCellAtIndex(i),
                                state,
                                allMachines,
                                ioController: ioControllers[state.MachineMotionIndex],
                                removeDetectionCell: removeCell(i)
                            };
                            return (
                                <DetectionCell  {...cellProps} />
                            );
                        })
                    }
                </div>
            </div>
        </ContentItem>
    );
};
