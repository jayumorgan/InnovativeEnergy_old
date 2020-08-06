import React, { useState } from "react";

import { LayerObject } from "./structures/Data";


import ContentItem, { ButtonProps, ContentItemProps } from "./ContentItem";


interface StackProps {
    allLayers: LayerObject[];
    allStacks: StackObject[];
    handleNext: () => void;
    handleBack: () => void;
};

function Stack({ allLayers, allStacks, handleBack, handleNext }: StackProps) {

    let [summaryScreen, setSummaryScreen] = useState<boolean>(allStacks.length > 0);

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let RightButton: ButtonProps = {
        name: summaryScreen ? "Save and Finish" : "Next",
        action: handleNext
    };

    let instruction: string;
    if (summaryScreen) {
        instruction = "Create and Edit Pallet Stack Configurations";
        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <span>
                    Stack Summary
		</span>
            </ContentItem>
        );

    } else {
        instruction = "Define a pallet stack";
        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <span>
                    {"Stack Screen"}
                </span>
            </ContentItem>
        );
    }
};


export default Stack;


