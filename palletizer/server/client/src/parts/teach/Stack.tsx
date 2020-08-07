import React, { useState } from "react";

import { PalletGeometry, LayerObject } from "./structures/Data";

import ContentItem, { ButtonProps, ContentItemProps } from "./ContentItem";

import "./css/Stack.scss";



interface StackProps {
    allPallets: PalletGeometry[];
    handleNext: () => void;
    handleBack: () => void;
    setPallets: (p: PalletGeometry[]) => void;
};

function Stack({ allPallets, setPallets, handleBack, handleNext }: StackProps) {

    let haveStack = false;

    allPallets.forEach((p: PalletGeometry) => {
        if (!haveStack && p.Stack.length > 0) {
            haveStack = true;
        }
    });

    let [currentPalletIndex, setCurrentPalletIndex] = useState<number>(0);

    let [summaryScreen, setSummaryScreen] = useState<boolean>(haveStack);

    let [currentStack, setCurrentStack] = useState<number[]>(allPallets[currentPalletIndex].Stack);

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let RightButton: ButtonProps = {
        name: summaryScreen ? "Save and Finish" : "Next",
        action: handleNext
    };

    let addRow = () => {

    }

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
        let currentPallet = allPallets[currentPalletIndex];

        let { name, Layers, Stack } = currentPallet;

        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <div className="StackGrid">
                    <div className="PalletName">
                        <div className="PalletDropDown">
                            <select value={currentPalletIndex}>
                                {allPallets.map((p: PalletGeometry, i: number) => {
                                    if (p.Layers.length > 0) {
                                        return (
                                            <option value={i} key={i}> {p.name} </option>
                                        );
                                    }
                                })}
                            </select>
                        </div>
                    </div>
                    <div className="StackContainer">
                        {currentStack.map((s: number, index: number) => {
                            <div className="StackRow">
                                <div className="RowName">
                                    {"Level 1"}
                                </div>
                                <div className="LayerSelector">
                                    <select value={s}>
                                        {Layers.map((l: LayerObject, j: number) => {
                                            return (
                                                <option value={j}> l.name </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        })}
                        <div className="AddStack">
                            <span>
                                {"Add a new row"}
                            </span>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};


export default Stack;


