import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Modal from "./Modal";

import { PalletConfiguration } from "../services/TeachMode";

import ConfigurationName from "./teach/ConfigurationName";
import Jogger from "./teach/Jogger";

import PalletCorners from "./teach/Corners";
import CompletionDots, { Fraction } from "./teach/CompletionDots";
import BoxSize from "./teach/BoxSize";

import Layout from "./teach/Layers";


import { Coordinate, PalletGeometry, BoxObject } from "./teach/structures/Data";

import "./css/TeachMode.scss";
import "./css/Jogger.scss";
import "./css/BoxSize.scss";


enum PalletTeachState {
    CONFIG_NAME,
    BOX_SIZE,
    PALLET_CORNERS,
    LAYER_SETUP,
    STACK_SETUP,
    SUMMARY
};

interface PalletConfiguratorProps {
    close: () => void;
};

function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [headerTitle, setHeaderTitle] = useState<string>("Pallet Configurator");

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.LAYER_SETUP);

    let completionFraction = { n: 0, d: 6 } as Fraction;

    let ChildElement: ReactElement = (<></>);

    let handleNext = () => {
        let state = teachState;
        setTeachState(++teachState);
    };

    let handleBack = () => {
        console.log(teachState, "teach state");
        if (teachState > 0) {
            let state = teachState;
            setTeachState(--teachState);
        } else {
            close();
        }
    };

    let allBoxes = [] as BoxObject[];

    let allPallets = [] as PalletGeometry[];

    for (let i = 0; i < 10; i++) {

        let box = new BoxObject("Box " + String(i + 1), { width: 10, height: 10, length: 10 }, { x: 200, y: 200, z: 200 });
        allBoxes.push(box);

        let c1: Coordinate = {
            x: 0,
            y: 100,
            z: 0
        };
        let c2: Coordinate = {
            x: 0,
            y: 0,
            z: 0
        };
        let c3: Coordinate = {
            x: 100 * (i + 1) / 2,
            y: 0,
            z: 0
        };
        let pallet_name = "Pallet " + String(i + 1);

        let pal = new PalletGeometry(pallet_name, c1, c2, c3);

        allPallets.push(pal);
    }

    switch (teachState) {
        case (PalletTeachState.CONFIG_NAME): {
            ChildElement = (<ConfigurationName handleUpdate={setHeaderTitle} />);

            completionFraction.n = 1;
            break;
        }
        case (PalletTeachState.BOX_SIZE): {
            ChildElement = (<BoxSize allBoxes={allBoxes} />);

            completionFraction.n = 2;
            break;
        }
        case (PalletTeachState.PALLET_CORNERS): {
            ChildElement = (<PalletCorners allPallets={allPallets} />);
            completionFraction.n = 3;
            break;
        };
        case (PalletTeachState.LAYER_SETUP): {
            ChildElement = (<Layout allBoxes={allBoxes} allPallets={allPallets} />);
            completionFraction.n = 4;
            break;
        }
        case (PalletTeachState.STACK_SETUP): {
            completionFraction.n = 5;
            break;
        }
        case (PalletTeachState.SUMMARY): {
            completionFraction.n = 6;
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
                            {((teachState as number === 0) ? "Close" : "Back")}
                        </span>
                    </div>
                    <div className="StatusBar">
                        <div className="StatusBarTitle">
                            <span>
                                {headerTitle}
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
                {ChildElement}
            </div>
        </Modal>
    );
};

export default PalletConfigurator;



