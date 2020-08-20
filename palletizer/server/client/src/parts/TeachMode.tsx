import React, { useReducer, useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Modal from "./Modal";

//import { PalletConfiguration } from "../services/TeachMode";
import { SavePalletConfig } from "../requests/requests";

import { Coordinate, PalletGeometry, BoxObject, LayoutObject, BoxPosition2D, Coordinate2D, getPalletDimensions, Subtract3D, MultiplyScalar, Add3D, Norm, BoxCoordinates, BoxPositionObject } from "./teach/structures/Data";

//import ConfigurationName from "./teach/ConfigurationName";
import Jogger from "./teach/Jogger";
import PalletCorners from "./teach/Pallet";
import CompletionDots, { Fraction } from "./teach/CompletionDots";
import BoxSize from "./teach/BoxSize";
import Layout from "./teach/Layouts";
import Stack from "./teach/Stack";
import Name from "./teach/Name";

import ConfigurationSummary from "./teach/ConfigurationSummary";

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
    index: number;
    palletConfig: SavedPalletConfiguration | null;
};

//---------------Pallet Configuration Class---------------
export interface PalletConfiguration {
    name: string;
    boxes: BoxObject[];
    pallets: PalletGeometry[];
};


export interface SavedPalletConfiguration {
    config: PalletConfiguration;
    boxCoordinates: BoxCoordinates[];

};

function newPalletConfiguration(name: string) {
    return {
        name,
        boxes: [],
        pallets: [],
    } as PalletConfiguration;
}

enum CONF_ACTION {
    SET_NAME,
    SET_BOXES,
    SET_PALLETS,
};

type ConfigAction = {
    type: CONF_ACTION;
    payload: any
};

function configurationReducer(state: PalletConfiguration, action: ConfigAction) {
    let { payload } = action;
    switch (action.type) {
        case (CONF_ACTION.SET_NAME): {
            return { ...state, name: payload as string };
        };
        case (CONF_ACTION.SET_BOXES): {
            return { ...state, boxes: payload as BoxObject[] };
        };
        case (CONF_ACTION.SET_PALLETS): {
            return { ...state, pallets: payload as PalletGeometry[] };
        };
        default: {
            return state;
        };
    };
};

export function GenerateFinalConfig(config: PalletConfiguration) {
    let { name, pallets } = config;
    // We should also write the entire file.
    let boxCoordinates: BoxCoordinates[] = [];

    pallets.forEach((p: PalletGeometry, palletIndex: number) => {
        let { width, length } = getPalletDimensions(p);
        let { Layouts, Stack } = p;

        let { corner1, corner2, corner3 } = p;
        let palletHeight = (corner1.z + corner2.z + corner3.z) / 3;

        let currentHeightIncrement = palletHeight;

        Stack.forEach((n: number, index: number) => {

            let { boxPositions, height } = Layouts[n];

            // Change this to minus if Z-home is at the top of the machine.
            currentHeightIncrement -= height;

            boxPositions.forEach((b: BoxPositionObject) => {
                let { box, position, rotated } = b;
                let { pickLocation } = box;
                let { x, y } = position; // These are fractions from the left of the pallet.

                let { width, height } = box.dimensions;

                let boxWidth = box.dimensions.width;
                let boxLength = box.dimensions.length;
                let temp = boxWidth;
                boxWidth = rotated ? boxLength : boxWidth;
                boxLength = rotated ? temp : boxLength;

                //compute the middle of the box shift.
                let boxXmid = boxWidth / 2;
                let boxYmid = boxLength / 2;
                let boxHeight = height; // Assume Same Height;

                // Move along the X axis defined by the pallet.
                let Ydirection = Subtract3D(corner1, corner2);
                let Xdirection = Subtract3D(corner3, corner2);

                console.log(Xdirection, Ydirection);
                // form the two vectors that specify the position
                let x_pos = MultiplyScalar(Xdirection, x);
                let y_pos = MultiplyScalar(Ydirection, 1 - y); // Due to top left -> bottom left coordinate shift on y-axis.

                console.log("First X, Y pos", x_pos, y_pos);

                let Xunit = MultiplyScalar(Xdirection, 1 / Norm(Xdirection));
                let Yunit = MultiplyScalar(Ydirection, 1 / Norm(Ydirection));

                console.log(Xunit, Yunit, "Unit Vectors");

                console.log("Box Mids X,Y", boxXmid, boxYmid);


                x_pos = Add3D(x_pos, MultiplyScalar(Xunit, boxXmid));
                y_pos = Add3D(y_pos, MultiplyScalar(Yunit, -boxYmid)); // Again; top left -> bottom left coordinate shift.

                let averagePosition = Add3D(x_pos, y_pos);

                averagePosition = Add3D(averagePosition, corner2);

		/* 
		 * x_pos = Add3D(x_pos, corner2);
		 * y_pos = Add3D(y_pos, corner2); */

                let z_add = currentHeightIncrement;

                averagePosition.z = z_add;

                //console.log(z_add);

                // console.log(x_pos, y_pos, "x , y pos");

                // let box_position = Add3D(x_pos, Add3D(y_pos, { x: 0, y: 0, z: z_add } as Coordinate));
                // console.log(box_position, "Box Position");
                // box_position.z = z_add;
                //

                boxCoordinates.push({
                    pickLocation,
                    dropLocation: { ...averagePosition, i: rotated },
                    dimensions: box.dimensions,
                    palletIndex
                } as BoxCoordinates);
            });
        });
    });

    console.log("Final Box Coordinates ", boxCoordinates);

    let configuration = {
        config,
        boxCoordinates
    } as SavedPalletConfiguration;

    return configuration;
    // Save the file...
};

function SaveFinalConfig(name: string, configuration: SavedPalletConfiguration) {
    SavePalletConfig(name, configuration);
}

//---------------Pallet Configurator Component---------------
function PalletConfigurator({ close, index, palletConfig }: PalletConfiguratorProps) {

    let [configuration, dispatchConfiguration] = useReducer(configurationReducer, palletConfig ? palletConfig.config : newPalletConfiguration("Pallet Configuration " + String(index + 1)));

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.CONFIG_NAME);

    let completionFraction = { n: 0, d: 5 } as Fraction;

    let ChildElement: ReactElement = (<></>);

    let setName = (name: string) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_NAME, payload: name as any } as ConfigAction);
    };

    let setBoxes = (boxes: BoxObject[]) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_BOXES, payload: boxes as any });
    };

    let setPallets = (pallets: PalletGeometry[]) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_PALLETS, payload: pallets as any });
    };

    let handleNext = () => {
        if (teachState === PalletTeachState.SUMMARY) {
            let finalConfig = GenerateFinalConfig(configuration);
            let { name } = configuration;
            SaveFinalConfig(name, finalConfig);
            close();
        } else {
            setTeachState(++teachState);
        }
    };

    let handleBack = () => {
        if (teachState > 0) {
            let state = teachState;
            setTeachState(--teachState);
        } else {
            close();
        }
    };

    completionFraction.n = teachState as number;

    let controlProps: any = {
        handleNext,
        handleBack,
        instructionNumber: completionFraction.n
    };

    let allBoxes = configuration.boxes;
    let allPallets = configuration.pallets;


    switch (teachState) {
        case (PalletTeachState.CONFIG_NAME): {
            ChildElement = (<></>);
            break;
        }
        case (PalletTeachState.BOX_SIZE): {
            ChildElement = (<BoxSize allBoxes={allBoxes} setBoxes={setBoxes} {...controlProps} />);

            break;
        }
        case (PalletTeachState.PALLET_CORNERS): {
            ChildElement = (<PalletCorners allPallets={allPallets} setPallets={setPallets} {...controlProps} />);
            break;
        };
        case (PalletTeachState.LAYER_SETUP): {
            ChildElement = (<Layout allBoxes={allBoxes} allPallets={allPallets} setPallets={setPallets} {...controlProps} />);
            break;
        }
        case (PalletTeachState.STACK_SETUP): {
            ChildElement = (<Stack allPallets={allPallets} setPallets={setPallets} {...controlProps} />)
            break;
        }
        case (PalletTeachState.SUMMARY): {
            ChildElement = (<ConfigurationSummary allPallets={allPallets} finalConfig={GenerateFinalConfig(configuration)} allBoxes={allBoxes} {...controlProps} />)
            break;
        }
        default: {
            console.log("Default Pallet Configurator Case -- unhandled");

        }
    };

    if (teachState === PalletTeachState.CONFIG_NAME) {
        return (
            <Modal close={close}>
                <Name name={configuration.name} close={close} changeName={setName} handleStart={handleNext} existing={palletConfig !== null} isPallet={true} />
            </Modal>
        );
    } else {
        let { n, d } = completionFraction;
        let completionString = `Step ${n}/${d}`;
        let widthPercentage = Math.round(n / d * 100);
        let widthString = `${widthPercentage}%`;
        let barStyle = {
            minWidth: widthString,
            width: widthString
        } as any;

        return (
            <Modal close={close}>
                <div className="TeachContainer">
                    <div className="TeachModeHeader">
                        <div className="TeachModeTitle">
                            <span>
                                {"Pallet configurator"}
                            </span>
                        </div>
                        <div className="TeachModeCompletion">
                            <div className="CompletionLabel">
                                <span>
                                    {completionString}
                                </span>
                            </div>
                            <div className="CompletionDisplay">
                                <div className="CompletionBar">
                                    <div className="CompletionFilled" style={barStyle}>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {ChildElement}
                </div>
            </Modal >
        );
    }
};

export default PalletConfigurator;
