import React from "react";
import { MachineConfiguration } from "../MachineConfig";
import ContentItem, { ButtonProps } from "../teach/ContentItem";


import palletizerImage from "./images/palletizer.png";
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

    return (
        <ContentItem {...contentItemProps} >
            <div className="MachineSummary">
                <div className="MachineSummaryItems">
                    <span>
                        {"Machine Configuration Summary..."}
                    </span>
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
