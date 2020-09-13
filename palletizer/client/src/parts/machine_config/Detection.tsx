import React, { useState, ChangeEvent } from "react";
import ContentItem, { ButtonProps } from "../teach/ContentItem";
import { IOState, defaultIOState, ALL_NETWORK_IDS } from "./IO";
import { ControlProps, changeEventToNumber } from "../shared/shared";
import { MachineMotion } from "./MachineMotions";

//---------------Styles---------------
import "./css/Detection.scss";


interface DetectionCellProps {
    updateState: (state: IOState) => void;
    state: IOState;
    allMachines: MachineMotion[];
};

function DetectionCell({ state, updateState, allMachines }: DetectionCellProps) {

    const updateNetworkId = (e: ChangeEvent) => {
        let NetworkId: number = changeEventToNumber(e);
        updateState({ ...state, NetworkId });
    };

    const updateMachineMotionIndex = (e: ChangeEvent) => {
        let MachineMotionIndex: number = changeEventToNumber(e);
        updateState({ ...state, MachineMotionIndex });
    };

    // Need to get current values for this module.
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
            </div>
        </div>
    );
};


// Could extend control props.
export interface DetectionProps extends ControlProps {
    setDetection: (detection: IOState[]) => void;
    box_detection?: IOState[];
    allMachines: MachineMotion[];
};

export default function Detection({ handleNext, handleBack, instructionNumber, setDetection, box_detection, allMachines }: DetectionProps) {

    const [detectionArray, setDetectionArray] = useState<IOState[]>(box_detection ? box_detection : [] as IOState[]);

    const instruction: string = "Create an input profile for box detection or skip this step";

    const LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    const RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            handleNext();
        },
        enabled: true
    };

    const AddButton: ButtonProps = {
        name: "Add new input profile",
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

    let updateCellAtIndex = (index: number) => (state: IOState) => {
        let cp = [...detectionArray];
        cp[index] = state;
        setDetectionArray(cp);
    };

    return (
        <ContentItem {...contentItemProps} >
            <div className="Detection">
                <div className="DetectionScroll">
                    {detectionArray.map((state: IOState, i: number) => {
                        const cellProps: DetectionCellProps = {
                            updateState: updateCellAtIndex(i),
                            state,
                            allMachines
                        };
                        return (
                            <DetectionCell  {...cellProps} />
                        );
                    })}
                </div>
            </div>
        </ContentItem>
    );
};
