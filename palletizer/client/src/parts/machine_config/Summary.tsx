import React from "react";
import { MachineConfiguration } from "../MachineConfig";
import ContentItem, { ButtonProps } from "../teach/ContentItem";

import { Drive } from "./Drives";
import { IOState } from "./IO";

import palletizerImage from "./images/palletizer.png";

//---------------Styles---------------
import "./css/Summary.scss";
import "./css/Drives.scss";

export interface MachineSummaryProps {
    machineConfig: MachineConfiguration;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

export default function MachineSummary({ machineConfig, handleBack, handleNext, instructionNumber }: MachineSummaryProps) {


    let instruction = "Review Configuration";

    let RightButton: ButtonProps = {
        name: "Save and Exit",
        action: () => {
            handleNext();
        },
        enabled: true
    };

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    let contentItemProps = {
        instruction,
        instructionNumber,
        LeftButton,
        RightButton,
    } as any;


    let { axes, io, machines } = machineConfig;

    return (
        <ContentItem {...contentItemProps} >
            <div className="MachineSummary">
                <div className="MachineSummaryItems">
                    <div className="Container">
                        <div className="Cell">
                            <div className="Title">
                                <div className="Left">
                                    <span>
                                        {"Machine Motions"}
                                    </span>
                                </div>
                                <div className="Right">
                                    <span>
                                        Edit
				    </span>
                                </div>
                            </div>
                            <div className="Content">
                                <span>
                                    {String(machines.length) + " Machine Motion" + (machines.length > 1 ? "s" : "")}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="Container">
                        <div className="Cell">
                            <div className="Title">
                                <div className="Left">
                                    <span>
                                        {"Axes"}
                                    </span>
                                </div>
                                <div className="Right">
                                    <span>
                                        Edit
				    </span>
                                </div>
                            </div>
                            <div className="Content">
                                {Object.values(axes).map((da: Drive[], index: number) => {
                                    let arr = Object.keys(axes) as string[];
                                    let ism = da.length > 1;
                                    return (<span key={index}> {arr[index] + ": " + String(da.length) + " drive" + (ism ? "s" : "")} </span>)
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="Container">
                        <div className="Cell">
                            <div className="Title">
                                <div className="Left">
                                    <span>
                                        {"Output"}
                                    </span>
                                </div>
                                <div className="Right">
                                    <span>
                                        Edit
				    </span>
                                </div>
                            </div>
                            <div className="Content">
                                {Object.values(io).map((oa: IOState[], index: number) => {
                                    let arr = Object.keys(io) as string[];
                                    let ism = oa.length > 1;
                                    return (
                                        <span key={index}> {arr[index] + ": " + String(oa.length) + " module" + (ism ? "s" : "")} </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="Container">
                        <div className="Cell">
                            <div className="Title">
                                <div className="Left">
                                    <span>
                                        {"Detection"}
                                    </span>
                                </div>
                                <div className="Right">
                                    <span>
                                        Edit
				    </span>
                                </div>
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
        </ContentItem>
    );
};
