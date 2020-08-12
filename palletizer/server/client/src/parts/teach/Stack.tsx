import React, { useState, ChangeEvent } from "react";

import { PalletGeometry, LayoutObject } from "./structures/Data";

import ContentItem, { ButtonProps, ContentItemProps } from "./ContentItem";

import LayerImage from "./images/pallet-layers.png";

import PlusIcon from "./PlusIcon";

import plus_icon from "./images/plus.svg";

import "./css/Stack.scss";



interface PalletLayoutProps {
    pallet: PalletGeometry;
    addLayer: () => void;
    setLayoutOnLayer: (stackIndex: number, layoutIndex: number) => void;
}

function PalletLayout({ pallet, addLayer, setLayoutOnLayer }: PalletLayoutProps) {
    let { name, Layouts, Stack } = pallet;

    let iconSize = 15;

    let handleChange = (stackIndex: number) => (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        setLayoutOnLayer(stackIndex, val);
    };


    return (
        <div className="PalletLayout">
            <div className="Name">
                <span>
                    {name}
                </span>
            </div>
            {Stack.map((s: number, i: number) => {
                return (
                    <div className="Layer" key={i}>
                        <div className="LayerName">
                            <span>
                                {"Layer " + String(i + 1) + ":"}
                            </span>
                        </div>
                        <div className="Layout">
                            <select value={s} onChange={handleChange(i)}>
                                {Layouts.map((l: LayoutObject, j: number) => {
                                    return (
                                        <option value={j} key={j}> {l.name} </option>
                                    )
                                })}
                            </select>
                        </div>
                    </div>
                )
            })
            }
            <div className="Add">
                <div className="AddButton" onClick={addLayer} >
                    <img src={plus_icon} />
                    <span>
                        {"Add layer"}
                    </span>
                </div>
            </div>
        </div>
    );
};

interface StackProps {
    allPallets: PalletGeometry[];
    handleNext: () => void;
    handleBack: () => void;
    setPallets: (p: PalletGeometry[]) => void;
    instructionNumber: number;
};


function Stack({ instructionNumber, allPallets, setPallets, handleBack, handleNext }: StackProps) {
    //    let haveStack = false;

    let checkForStack = () => {
        let haveStack = false;
        allPallets.forEach((p: PalletGeometry) => {
            if (!haveStack && p.Stack.length > 0) {
                haveStack = true;
            }
        });
        return haveStack;
    };

    let addLayer = (palletIndex: number) => () => {
        let newPallets = [] as PalletGeometry[];
        allPallets.forEach((p: PalletGeometry, i: number) => {
            let t = { ...p };
            if (i === palletIndex) {
                t.Stack.push(0);
            }
            newPallets.push(t);
        });
        setPallets(newPallets);
    };

    let setLayoutOnLayer = (palletIndex: number) => (stackIndex: number, value: number) => {
        let newPallets = [...allPallets];
        newPallets[palletIndex].Stack[stackIndex] = value;
        setPallets(newPallets);
    };

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            handleNext()
        },
        enabled: checkForStack()
    };

    let instruction: string;


    instruction = "Assign custom layouts to your pallet layers";

    let contentItemProps = {
        instructionNumber,
        instruction,
        LeftButton,
        RightButton
    } as any;

    return (
        <ContentItem {...contentItemProps} >
            <div className="Stack">
                <div className="StackSide">
                    <div className="StackConfigurator">
                        <div className="StackScroll">
                            {allPallets.map((p: PalletGeometry, i: number) => {
                                if (p.Layouts.length > 0) {
                                    return (
                                        <PalletLayout key={i} pallet={p} addLayer={addLayer(i)} setLayoutOnLayer={setLayoutOnLayer(i)} />
                                    );
                                }
                            })}

                        </div>

                    </div>
                </div>

                <div className="DisplaySide">
                    <div className="Image">
                        <img src={LayerImage} />
                    </div>
                </div>
            </div>
        </ContentItem>
    );
};


export default Stack;


