import React from "react";

import { PalletGeometry, BoxObject } from "./structures/Data";

import ContentItem, { ButtonProps } from "./ContentItem";

import { SavedPalletConfiguration } from "../TeachMode";

import Visualizer from "../Visualizer";

import "./css/ConfigurationSummary.scss";


interface SummaryCellProps {
    title: string;
    action: () => void;
    numberString: string;
};


function SummaryCell({ title, action, numberString }: SummaryCellProps) {

    return (
        <div className="Container">
            <div className="Cell">
                <div className="Title">
                    <div className="Left">
                        <span>
                            {title}
                        </span>
                    </div>
                    <div className="Right" onClick={action}>
                        <span>
                            {"Edit"}
                        </span>
                    </div>
                </div>
                <div className="Content">
                    <span>
                        {numberString}
                    </span>
                </div>
            </div>
        </div>
    );
};


interface StackProps {
    allPallets: PalletGeometry[];
    allBoxes: BoxObject[];
    instructionNumber: number;
    finalConfig: SavedPalletConfiguration;
    handleNext: () => void;
    handleBack: () => void;
};


export default function ConfigurationSummary({ allPallets, allBoxes, handleNext, handleBack, instructionNumber, finalConfig }: StackProps) {
    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let RightButton: ButtonProps = {
        name: "Save and Exit",
        action: handleNext,
        enabled: true
    };

    let instruction = "Review Configuration";

    let contentItemProps = {
        instruction,
        instructionNumber,
        LeftButton,
        RightButton
    };

    let cells: SummaryCellProps[] = [];

    let actionFn = () => {
        console.log("Action");
    };

    let [numberOfLayouts, numberOfLayers] = (() => {
        let layoutCount = 0;
        let stackCount = 0;
        allPallets.forEach((p: PalletGeometry) => {
            layoutCount += p.Layouts.length;
            stackCount += p.Stack.length;
        });
        return [layoutCount, stackCount]
    })();



    //---------------Pallets---------------
    cells.push({
        title: "Pallets",
        action: actionFn,
        numberString: "Number of pallets: " + String(allPallets.length)
    });
    //---------------Custom Layouts---------------
    cells.push({
        title: "Custom Layouts",
        action: actionFn,
        numberString: "Number of layouts: " + String(numberOfLayouts)
    })
    //---------------Boxes---------------
    cells.push({
        title: "Boxes",
        action: actionFn,
        numberString: "Number of box sizes: " + String(allBoxes.length)
    });
    //---------------Layers---------------
    cells.push({
        title: "Layers",
        action: actionFn,
        numberString: "Number of layers: " + String(numberOfLayers)
    });
    return (
        <ContentItem {...contentItemProps}>
            <div className="Summary">
                <div className="LeftSide">
                    {cells.map((c: SummaryCellProps, i: number) => {
                        return (
                            <SummaryCell {...c} key={i} />
                        )
                    })}
                </div>
                <div className="RightSide">
                    <Visualizer palletConfig={finalConfig} currentBoxNumber={Infinity} />
                    {/* <img src={RightImage} /> */}
                </div>
            </div>
        </ContentItem>

    );
}
