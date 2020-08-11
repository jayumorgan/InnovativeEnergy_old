import React, { useState, ChangeEvent } from "react";

import { PalletGeometry, LayoutObject } from "./structures/Data";

import ContentItem, { ButtonProps, ContentItemProps } from "./ContentItem";

import "./css/Stack.scss";



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
        let haveStack = false
        allPallets.forEach((p: PalletGeometry) => {
            if (!haveStack && p.Stack.length > 0) {
                haveStack = true;
            }
        });
        return haveStack;
    };

    let [currentPalletIndex, setCurrentPalletIndex] = useState<number>(0);
    let [summaryScreen, setSummaryScreen] = useState<boolean>(checkForStack());
    let [currentStack, setCurrentStack] = useState<number[]>(allPallets[currentPalletIndex].Stack);

    let saveStack = () => {
        let pallets: PalletGeometry[] = [];
        allPallets.forEach((p: PalletGeometry, i: number) => {
            let t = { ...p };
            if (i === currentPalletIndex) {
                t.Stack = [...currentStack];
            }
            pallets.push(t);
        });
        setPallets(pallets);
    };

    let changeCurrentPallet = (to: number) => {
        saveStack();
        setCurrentStack(allPallets[to].Stack);
        setCurrentPalletIndex(to);
    };

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let RightButton: ButtonProps = {
        name: summaryScreen ? "Save and Finish" : "Next",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                saveStack();
                if (currentStack.length > 0 || checkForStack()) {
                    setSummaryScreen(true);
                }
            };
        },
        enabled: currentStack.length > 0 || checkForStack()
    };

    let addRow = () => {
        setCurrentStack([...currentStack, 0]);
    };

    let setStackValue = (index: number) => (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        let t = [...currentStack];
        t[index] = val;
        setCurrentStack(t);
    };

    let instruction: string;

    if (summaryScreen) {
        instruction = "Create and Edit Pallet Stack Configurations";
        return (
            <ContentItem instructionNumber={instructionNumber} instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <span>
                    Stack Summary
		</span>
            </ContentItem>
        );
    } else {
        instruction = "Define a pallet stack";
        let currentPallet = allPallets[currentPalletIndex];
        let { name, Layouts } = currentPallet;

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
                    </div>

                    <div className="DisplaySide">
                        <div className="Image">
                            <img />

                        </div>
                    </div>
                </div>
            </ContentItem>
        );



        /* return (
	 *     <ContentItem instructionNumber={instructionNumber} instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
	 *         <div className="StackGrid">
	 *             <div className="PalletName">
	 *                 <div className="PalletDropDown">
	 *                     <select value={currentPalletIndex}>
	 *                         {allPallets.map((p: PalletGeometry, i: number) => {
	 *                             if (p.Layouts.length > 0) {
	 *                                 return (
	 *                                     <option value={i} key={i}> {p.name} </option>
	 *                                 );
	 *                             }
	 *                         })}
	 *                     </select>
	 *                 </div>
	 *             </div>
	 *             <div className="StackContainer">
	 *                 {currentStack.map((s: number, index: number) => {
	 *                     return (
	 *                         <div className="StackRow" key={index}>
	 *                             <div className="RowName">
	 *                                 <span>
	 *                                     {"Level " + String(index)}
	 *                                 </span>
	 *                             </div>
	 *                             <div className="LayoutSelector">
	 *                                 <select value={s} onChange={setStackValue(index)}>
	 *                                     {Layouts.map((l: LayoutObject, j: number) => {
	 *                                         return (
	 *                                             <option key={j} value={j}> {l.name} </option>
	 *                                         )
	 *                                     })}
	 *                                 </select>
	 *                             </div>
	 *                         </div>
	 *                     )
	 *                 })}
	 *                 <div className="AddStack" onClick={addRow} >
	 *                     <span>
	 *                         {"Add a new row"}
	 *                     </span>
	 *                 </div>
	 *             </div>
	 *         </div>
	 *     </ContentItem>
	 * ); */
    }
};


export default Stack;


