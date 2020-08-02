import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Modal from "./Modal";

import { PalletConfiguration } from "../services/TeachMode";


import Jogger from "./teach/Jogger";
import PickLocation from "./teach/PickLocation";
import PalletCorners from "./teach/Corners";


import CompletionDots, { Fraction } from "./teach/CompletionDots";
import BoxSize from "./teach/BoxSize";


import "./css/TeachMode.scss";
import "./css/Jogger.scss";
import "./css/BoxSize.scss";
/* <div className="JoggerCircle">
 * </div>
 *  */



enum PalletTeachState {
    PICK_LOCATION, // 0
    BOX_SIZE,
    PALLET_CORNERS,
    ASSIGN_LAYOUT,
    LAYER_SETUP,
    SUMMARY
};

interface PalletConfiguratorProps {
    close: () => void;
};

function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.PALLET_CORNERS);

    let [completionFraction, setCompletionFraction] = useState<Fraction>({ n: teachState + 1, d: 5 } as Fraction);


    let ChildElement: ReactElement = (<></>);

    let handleNext = () => {
        let state = teachState;
        setTeachState(++teachState);
        setCompletionFraction({ n: completionFraction.n + 1, d: completionFraction.d });
    };

    let handleBack = () => {
        console.log(teachState, "teach state");
        if (teachState > 0) {
            let state = teachState;
            console.log(state, "State 1");
            setTeachState(--teachState);
            console.log(state, "State 2");
            setCompletionFraction({ n: completionFraction.n - 1, d: completionFraction.d });
        } else {
            close();
        }
    };

    let instruction: string = "default instruction";

    switch (teachState) {
        case (PalletTeachState.PICK_LOCATION): {
            ChildElement = (<PickLocation />);
            instruction = "Move to box pick location and click select";
            break;
        };
        case (PalletTeachState.BOX_SIZE): {
            ChildElement = (<BoxSize />);
            instruction = "Enter the dimensions of the box"
            break;
        }
        case (PalletTeachState.PALLET_CORNERS): {
            ChildElement = (<PalletCorners />);
            instruction = "Move to and select three pallet corners";
            break;
        };
        case (PalletTeachState.LAYER_SETUP): {
            break;
        }
        case (PalletTeachState.ASSIGN_LAYOUT): {
            break;
        }
        case (PalletTeachState.SUMMARY): {
            break;
        }
        default: {
            console.log("Default Pallet Configurator Case -- unhandled");

        }
    };


    return (
        <Modal close={close}>
            <div className="TeachContainer">
                <div className="TeachModeHeader">
                    <div className="TeachButton" onClick={handleBack}>
                        <span>
                            {((teachState === PalletTeachState.PICK_LOCATION) ? "Close" : "Back")}
                        </span>
                    </div>
                    <div className="StatusBar">
                        <div className="StatusBarTitle">
                            <span>
                                Pallet Configurator
			    </span>
                        </div>
                        <CompletionDots fraction={completionFraction} />
                    </div>
                    <div className="TeachButton" onClick={handleNext}>
                        <span>
                            Next
			</span>
                    </div>
                </div>
                <div className="TeachModeInstruction">
                    <span>
                        {instruction.toLowerCase()}
                    </span>
                </div>
                <div className="TeachModeContent">
                    {ChildElement}
                </div>
            </div>
        </Modal>
    );
};

export default PalletConfigurator;



