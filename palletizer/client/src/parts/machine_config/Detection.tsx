import React, { useState, useEffect, ChangeEvent } from "react";
import { IODeviceState, vResponse } from "mm-js-api";
import ContentItem, { ButtonProps } from "../teach/ContentItem";
import { IOState, defaultIOState, ALL_NETWORK_IDS } from "./IO";
import { ControlProps, changeEventToNumber, wrapChangeEventNumber } from "../shared/shared";
import { MachineMotion } from "./MachineMotions";
import IOController from "../../jogger/IO";

//---------------Styles---------------
import "./css/Detection.scss";

const ALL_PIN_IDS: number[] = [0, 1, 2, 3];

export interface IOOutputPin {
    MachineMotionIndex: number;
    NetworkId: number; // 1,2,3
    PinId: number; // 0, 1, 2, 3
    PinVal: boolean;
};

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
    updateState: (state: IOOutputPin) => void;
    state: IOOutputPin;
    allMachines: MachineMotion[];
    removeDetectionCell: () => void;
};


function DetectionCell({ state, updateState, allMachines, removeDetectionCell }: DetectionCellProps) {
    const [currentPinValue, setCurrentPinValue] = useState<boolean>(false);
    const [ioController, setIOController] = useState<IOController>(new IOController(allMachines[state.MachineMotionIndex]));
    const [currentMMIndex, setCurrentMMIndex] = useState<number>(-1);

    const handleIoValueUpdate = (device_id: number, s: IODeviceState) => {
        console.log("IO Value callback!", s, device_id);
        if (device_id === state.NetworkId) {
            setCurrentPinValue(s[state.PinId]);
        }
    };

    useEffect(() => {
        if (currentMMIndex !== state.MachineMotionIndex) {
            ioController.setMachineMotion(allMachines[state.MachineMotionIndex]);
            ioController.machineMotion.setIoValueUpdateCallback(handleIoValueUpdate);
            ioController.detectInputState(state.NetworkId).then((v: vResponse) => {
                const ioState = v.result as IODeviceState;
                setCurrentPinValue(ioState[state.PinId]);
            }).catch((e: any) => {
                console.log("Error detect input state", e);
            });
            setCurrentMMIndex(state.MachineMotionIndex);
        }
    }, [ioController, state]);

    const updateNetworkId = (e: ChangeEvent) => {
        let NetworkId: number = changeEventToNumber(e);
        updateState({ ...state, NetworkId });
    };

    const updateMachineMotionIndex = (e: ChangeEvent) => {
        let MachineMotionIndex: number = changeEventToNumber(e);
        updateState({ ...state, MachineMotionIndex });
    };

    const updatePinId = wrapChangeEventNumber((pin_id: number) => {
        let s = { ...state };
        s.PinVal = false;
        s.PinId = pin_id;
        updateState(s);
    });

    const togglePin = () => {
        let s = { ...state };
        s.PinVal = !(s.PinVal);
        updateState(s);
    };

    console.log("Current Pin Value: ", currentPinValue);

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
                <div className="Input">
                    <div className="Title">
                        <span>
                            {"Pin"}
                        </span>
                    </div>
                    <div className="DropDown">
                        <select value={state.PinId} onChange={updatePinId}>
                            {ALL_PIN_IDS.map((pin_id: number, i: number) => {
                                return (
                                    <option value={pin_id} key={i}>
                                        {"Pin " + String(pin_id)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                <div className="Input">
                    <div className="Title">
                        <span>
                            {"Current"}
                        </span>
                    </div>
                    <div className="Value">
                        <span>
                            {"0"}
                        </span>
                    </div>
                </div>
                <div className="Input">
                    <div className="Title">
                        <span>
                            {"Target"}
                        </span>
                    </div>
                    <div className="Status">
                        <div className="Switch" onClick={togglePin}>
                            {state.PinVal &&
                                <div className="NumberContainer">
                                    <div className="Number">
                                        <span> {"1"} </span>
                                    </div>
                                </div>}
                            {state.PinVal && <div className="SwitchHandle"></div>}
                            {(!state.PinVal) && <div className="SwitchHandle"> </div>}
                            {(!state.PinVal) &&
                                <div className="NumberContainer">
                                    <div className="Number">
                                        <span> {"0"} </span>
                                    </div>
                                </div>}
                        </div>
                    </div>
                </div>
            </div >
            <div className="Trash">
                <span className="icon-delete" onClick={removeDetectionCell}>
                </span>
            </div>
        </div >
    );
};

export interface DetectionProps extends ControlProps {
    setDetection: (detection: IOOutputPin[]) => void;
    box_detection?: IOOutputPin[];
    allMachines: MachineMotion[];
    isDetection: boolean; // Toggle between io state setup for box detection and good pick
};


function defaultOuputPin(): IOOutputPin {
    return {
        MachineMotionIndex: 0,
        NetworkId: 0,
        PinId: 0,
        PinVal: false
    };
};


export default function Detection({ handleNext, handleBack, instructionNumber, setDetection, box_detection, allMachines, isDetection }: DetectionProps) {

    const [detectionArray, setDetectionArray] = useState<IOOutputPin[]>(box_detection ? box_detection : [] as IOOutputPin[]);

    useEffect(() => {
        setDetectionArray(box_detection ? box_detection : [] as IOOutputPin[]);
    }, [box_detection]);

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
            let cp = [...detectionArray, defaultOuputPin()];
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

    const updateCellAtIndex = (index: number) => (state: IOOutputPin) => {
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
                        detectionArray.map((state: IOOutputPin, i: number) => {
                            const cellProps: DetectionCellProps = {
                                updateState: updateCellAtIndex(i),
                                state,
                                allMachines,
                                removeDetectionCell: removeCell(i)
                            };
                            return (
                                <DetectionCell  {...cellProps} key={i} />
                            );
                        })
                    }
                </div>
            </div>
        </ContentItem>
    );
};
