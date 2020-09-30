import React, { ChangeEvent } from "react";

import { PalletGeometry, LayoutObject } from "../../geometry/geometry";

import ContentItem, { ButtonProps } from "./ContentItem";

import LayerImage from "./images/pallet-layers.png";

import plus_icon from "./images/plus.svg";

import { ControlProps } from "../shared/shared";

//---------------Styles---------------
import "./css/Stack.scss";


interface PalletLayoutProps {
    pallet: PalletGeometry;
    addLayer: () => void;
    setLayoutOnLayer: (stackIndex: number, layoutIndex: number) => void;
    removeLayer: (stackIndex: number) => () => void;
};

function PalletLayout({ pallet, addLayer, setLayoutOnLayer, removeLayer }: PalletLayoutProps) {
    let { name, Layouts, Stack } = pallet;

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
            <div className="Add">
                <div className="AddButton" onClick={addLayer} >
                    <img src={plus_icon} />
                    <span>
                        {"Add layer"}
                    </span>
                </div>
            </div>
            {[...Stack].reverse().map((s: number, i: number) => {
                return (
                    <div className="Layer" key={i}>
                        <div className="LayerName">
                            <span>
                                {"Layer " + String(Stack.length - i) + ":"}
                            </span>
                        </div>
                        <div className="Layout">
                            <select value={s} onChange={handleChange(i)}>
                                {Layouts.map((l: LayoutObject, j: number) => {
                                    return (
                                        <option value={j} key={j}> {l.name} </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div className="Trash" onClick={removeLayer(i)}>
                            <span className="icon-delete">
                            </span>
                        </div>
                    </div>
                )
            })
            }

        </div>
    );
};


interface StackProps extends ControlProps {
    allPallets: PalletGeometry[];
    setPallets: (p: PalletGeometry[]) => void;
};


export default function Stack({ instructionNumber, allPallets, setPallets, handleBack, handleNext }: StackProps) {

    const checkForStack = () => {
        let haveStack = false;
        allPallets.forEach((p: PalletGeometry) => {
            if (!haveStack && p.Stack.length > 0) {
                haveStack = true;
            }
        });
        return haveStack;
    };

    const addLayer = (palletIndex: number) => () => {
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

    const removeLayer = (palletIndex: number) => (stackIndex: number) => () => {
        let cp = [...allPallets];
        if (cp[palletIndex].Stack.length > 1) {
            cp[palletIndex].Stack.splice(stackIndex, 1);
            setPallets(cp);
        }
    };

    const setLayoutOnLayer = (palletIndex: number) => (stackIndex: number, value: number) => {
        let newPallets = [...allPallets];
        newPallets[palletIndex].Stack[stackIndex] = value;
        setPallets(newPallets);
    };

    const LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    const RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            handleNext()
        },
        enabled: checkForStack()
    };

    let instruction: string;


    instruction = "Create a pallet layout using your configured pallet layers";

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
                                        <PalletLayout key={i} pallet={p} addLayer={addLayer(i)} setLayoutOnLayer={setLayoutOnLayer(i)} removeLayer={removeLayer(i)} />
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


