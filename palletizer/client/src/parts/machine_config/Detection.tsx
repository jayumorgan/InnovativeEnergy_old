import React from "react";
import ContentItem, { ButtonProps } from "../teach/ContentItem";
import { IOState } from "./IO";
import { ControlProps } from "../shared/shared";


// Could extend control props.
export interface DetectionProps extends ControlProps {
    setDetection: (detection: IOState[]) => void;
};

export default function Detection({ handleNext, handleBack, instructionNumber, setDetection }: DetectionProps) {

    let instruction: string = "Create an input profile for box detection or skip this step";

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            handleNext();
        },
        enabled: true
    };


    let AddButton: ButtonProps = {
        name: "Add new input profile",
        action: () => {

        }
    };


    let contentItemProps: any = {
        LeftButton,
        RightButton,
        instruction,
        instructionNumber
    };

    return (
        <ContentItem {...contentItemProps} >
            <div>
                Stuff
            </div>
        </ContentItem>
    );
};
