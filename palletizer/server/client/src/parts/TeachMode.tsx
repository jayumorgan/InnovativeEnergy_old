import React, { useReducer, useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Modal from "./Modal";

//import { PalletConfiguration } from "../services/TeachMode";
import { SavePalletConfig } from "../requests/requests";

import { Coordinate, PalletGeometry, BoxObject, LayoutObject, BoxPosition2D, Coordinate2D, getPalletDimensions, Subtract3D, MultiplyScalar, Add3D, Norm, BoxCoordinates } from "./teach/structures/Data";

//import ConfigurationName from "./teach/ConfigurationName";
import Jogger from "./teach/Jogger";
import PalletCorners from "./teach/Pallet";
import CompletionDots, { Fraction } from "./teach/CompletionDots";
import BoxSize from "./teach/BoxSize";
import Layout from "./teach/Layouts";
import Stack from "./teach/Stack";
import Name from "./teach/Name";




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

//---------------Pallet Configuration Class---------------
interface PalletConfiguration {
    name: string;
    boxes: BoxObject[];
    pallets: PalletGeometry[];
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

function GenerateAndSaveConfig(config: PalletConfiguration) {

    let { name, pallets } = config;
    // We should also write the entire file.
    let boxCoordinates: BoxCoordinates[] = [];

    pallets.forEach((p: PalletGeometry) => {
        let { width, length } = getPalletDimensions(p);
        let { Layouts, Stack } = p;

        Stack.forEach((n: number, index: number) => {

            let { boxPositions, height } = Layouts[n];

            boxPositions.forEach((b: BoxPosition2D) => {

                let { box, position } = b;
                let { pickLocation } = box;
                let { x, y } = position; // These are fractions from the left of the pallet.
                let { corner1, corner2, corner3 } = p;

                let palletHeight = (corner1.z + corner2.z + corner3.z) / 3;

                //compute the middle of the box shift.
                let boxXmid = box.dimensions.width / 2;
                let boxYmid = box.dimensions.length / 2;
                let boxHeight = height; // Assume Same Height;

                // Move along the X axis defined by the pallet.
                let Ydirection = Subtract3D(corner1, corner2);
                let Xdirection = Subtract3D(corner3, corner2);
                // form the two vectors that specify the position

                let x_pos = MultiplyScalar(Xdirection, x);
                let y_pos = MultiplyScalar(Ydirection, 1 - y); // Due to top left -> bottom left coordinate shift on y-axis.

                let Xunit = MultiplyScalar(Xdirection, 1 / Norm(Xdirection));
                let Yunit = MultiplyScalar(Ydirection, 1 / Norm(Ydirection));

                x_pos = Add3D(x_pos, MultiplyScalar(Xunit, boxXmid));
                y_pos = Add3D(y_pos, MultiplyScalar(Yunit, -boxYmid)); // Again; top left -> bottom left coordinate shift.

                x_pos = Add3D(x_pos, corner2);
                y_pos = Add3D(y_pos, corner2);


                let z_add = (1 + index) * boxHeight + palletHeight;

                let box_position = Add3D(x_pos, Add3D(y_pos, { x: 0, y: 0, z: z_add } as Coordinate));

                box_position = {
                    x: Math.round(box_position.x * 100) / 100,
                    y: Math.round(box_position.y * 100) / 100,
                    z: Math.round(box_position.z * 100) / 100
                } as Coordinate;

                boxCoordinates.push({
                    pickLocation,
                    dropLocation: box_position
                } as BoxCoordinates);
            });
        });
    });

    console.log("Final Box Coordinates ", boxCoordinates);

    let configuration = {
        config,
        boxCoordinates
    } as any;

    // Save the file...
    SavePalletConfig(name, configuration);
};




//---------------Pallet Configurator Component---------------
function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [configuration, dispatchConfiguration] = useReducer(configurationReducer, newPalletConfiguration("Pallet Configurator"));

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.CONFIG_NAME);

    let completionFraction = { n: 0, d: 6 } as Fraction;

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
        if (teachState === PalletTeachState.STACK_SETUP) {
            GenerateAndSaveConfig(configuration);
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
            break;
        }
        default: {
            console.log("Default Pallet Configurator Case -- unhandled");

        }
    };




    if (teachState === PalletTeachState.CONFIG_NAME) {
        return (
            <Modal close={close}>
                <Name name={configuration.name} close={close} changeName={setName} handleStart={handleNext} />
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

/*
 * let allBoxes = [] as BoxObject[];
 *
 * let allPallets = [] as PalletGeometry[];
 *
 * for (let i = 0; i < 10; i++) {
 *
 *     let box = new BoxObject("Box " + String(i + 1), { width: 25, height: 25, length: 25 }, { x: 200, y: 200, z: 200 });
 *     allBoxes.push(box);
 *
 *     let c1: Coordinate = {
 *         x: 0,
 *         y: 100,
 *         z: 0
 *     };
 *     let c2: Coordinate = {
 *         x: 0,
 *         y: 0,
 *         z: 0
 *     };
 *     let c3: Coordinate = {
 *         x: 100,
 *         y: 0,
 *         z: 0
 *     };
 *     let pallet_name = "Pallet " + String(i + 1);
 *
 *     let pal = new PalletGeometry(pallet_name, c1, c2, c3);
 *
 *     allPallets.push(pal);
 * }
 *  */


