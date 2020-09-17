import React, { useReducer, useState, ReactElement } from 'react';

import Modal from "./Modal";

import { SavePalletConfig } from "../requests/requests";

import { ConfigItem } from "../types/Types";

import {
    PalletGeometry,
    BoxObject,
    Subtract3D,
    MultiplyScalar,
    Add3D,
    Norm,
    BoxCoordinates,
    BoxPositionObject,
    CoordinateRot,
    getXAxisAngle
} from "../geometry/geometry";

import { Fraction } from "./teach/CompletionDots";
import { ControlProps } from "./shared/shared";

import Name from "./teach/Name";
import MachineSelect from "./teach/MachineSelect";
import BoxSize from "./teach/BoxSize";
import PalletCorners from "./teach/Pallet";
import Layout from "./teach/Layouts";
import Stack from "./teach/Stack";
import ConfigurationSummary from "./teach/ConfigurationSummary";

//---------------Styles---------------
import "./css/TeachMode.scss";
import "./css/Jogger.scss";
import "./css/BoxSize.scss";

enum PalletTeachState {
    CONFIG_NAME,
    SELECT_MACHINE_CONFIG,
    BOX_SIZE,
    PALLET_CORNERS,
    LAYER_SETUP,
    STACK_SETUP,
    SUMMARY
};

export interface PalletConfiguration {
    name: string;
    boxes: BoxObject[];
    pallets: PalletGeometry[];
    machine_config_id: number;
};

export interface SavedPalletConfiguration {
    config: PalletConfiguration;
    boxCoordinates: BoxCoordinates[];
};

function newPalletConfiguration(name: string, machine_config_id: number) {
    return {
        name,
        boxes: [],
        pallets: [],
        machine_config_id
    } as PalletConfiguration;
};

enum CONF_ACTION {
    SET_NAME,
    SET_BOXES,
    SET_PALLETS,
    SET_MACHINE_CONFIG_ID
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
        case (CONF_ACTION.SET_MACHINE_CONFIG_ID): {
            return { ...state, machine_config_id: payload as number };
        };
        default: {
            return state;
        };
    };
};

export function GenerateFinalConfig(config: PalletConfiguration) {
    const { pallets } = config;
    let boxCoordinates: BoxCoordinates[] = [];

    pallets.forEach((p: PalletGeometry, palletIndex: number) => {
        const { Layouts, Stack, corner1, corner2, corner3 } = p;
        const palletHeight = (corner1.z + corner2.z + corner3.z) / 3;

        const Ydirection = Subtract3D(corner1, corner2);
        const Xdirection = Subtract3D(corner3, corner2);

        // Pallet angle rotation.
        const φ_pallet = getXAxisAngle(Xdirection);

        let currentHeightIncrement = palletHeight;

        Stack.forEach((n: number, stackIndex: number) => {

            const { boxPositions, height } = Layouts[n];

            // Change this to minus if Z-home is at the top of the machine.
            currentHeightIncrement -= height;

            boxPositions.forEach((b: BoxPositionObject) => {
                const { box, position, rotated } = b;
                const { pickLocation } = box;
                const { x, y } = position; // These are fractions from the left of the pallet.

                let boxWidth = box.dimensions.width;
                let boxLength = box.dimensions.length;
                let temp = boxWidth;

                boxWidth = rotated ? boxLength : boxWidth;
                boxLength = rotated ? temp : boxLength;

                let boxXmid = boxWidth / 2;
                let boxYmid = boxLength / 2;

                let x_pos = MultiplyScalar(Xdirection, x);
                let y_pos = MultiplyScalar(Ydirection, 1 - y); // Due to top left -> bottom left coordinate shift on y-axis.

                let Xunit = MultiplyScalar(Xdirection, 1 / Norm(Xdirection));
                let Yunit = MultiplyScalar(Ydirection, 1 / Norm(Ydirection));

                x_pos = Add3D(x_pos, MultiplyScalar(Xunit, boxXmid));
                y_pos = Add3D(y_pos, MultiplyScalar(Yunit, -boxYmid)); // Again; top left -> bottom left coordinate shift.

                let averagePosition = Add3D(x_pos, y_pos);

                averagePosition = Add3D(averagePosition, corner2);

                let z_add = currentHeightIncrement;

                averagePosition.z = z_add;

                let θ_drop: number = (rotated ? 90 : 0) + φ_pallet;
                let dropLocation: CoordinateRot = { ...averagePosition, θ: θ_drop };
                let linearPathDistance: number = Norm(Subtract3D(pickLocation, dropLocation));

                boxCoordinates.push({
                    pickLocation,
                    dropLocation,
                    dimensions: box.dimensions,
                    palletIndex,
                    stackIndex,
                    linearPathDistance
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
};


//---------------Pallet Configurator Component---------------
interface PalletConfiguratorProps {
    close: () => void;
    index: number;
    palletConfig: SavedPalletConfiguration | null;
    id: number | null;
    machine_configs: ConfigItem[];
};

function PalletConfigurator({ close, index, palletConfig, id, machine_configs }: PalletConfiguratorProps) {

    const [configuration, dispatchConfiguration] = useReducer(configurationReducer, palletConfig ? palletConfig.config : newPalletConfiguration("Pallet Configuration " + String(index + 1), machine_configs[0].id));

    const [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.CONFIG_NAME);

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

    let setMachineConfigId = (id: number) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_MACHINE_CONFIG_ID, payload: id as any });
    };

    let handleNext = () => {
        if (teachState === PalletTeachState.SUMMARY) {
            let finalConfig = GenerateFinalConfig(configuration);
            let { name } = configuration;
            SavePalletConfig(name, finalConfig, id);
            close();
        } else {
            setTeachState(1 + teachState);
        }
    };

    let handleBack = () => {
        if (teachState > 0) {
            setTeachState(-1 + teachState);
        } else {
            close();
        }
    };

    completionFraction.n = teachState as number;

    let controlProps: ControlProps = {
        handleNext,
        handleBack,
        instructionNumber: completionFraction.n
    };

    let allBoxes = configuration.boxes;
    let allPallets = configuration.pallets;
    let machineConfigId = configuration.machine_config_id;

    switch (teachState) {
        case (PalletTeachState.CONFIG_NAME): {
            ChildElement = (<></>);
            break;
        };
        case (PalletTeachState.SELECT_MACHINE_CONFIG): {
            ChildElement = (<MachineSelect machine_configs={machine_configs} machineConfigId={machineConfigId} setMachineConfigId={setMachineConfigId} {...controlProps} />)
            break;
        };
        case (PalletTeachState.BOX_SIZE): {
            ChildElement = (<BoxSize allBoxes={allBoxes} setBoxes={setBoxes} machineConfigId={machineConfigId} {...controlProps} />);
            break;
        };
        case (PalletTeachState.PALLET_CORNERS): {
            ChildElement = (<PalletCorners allPallets={allPallets} setPallets={setPallets} machineConfigId={machineConfigId} {...controlProps} />);
            break;
        };
        case (PalletTeachState.LAYER_SETUP): {
            ChildElement = (<Layout allBoxes={allBoxes} allPallets={allPallets} setPallets={setPallets} {...controlProps} />);
            break;
        };
        case (PalletTeachState.STACK_SETUP): {
            ChildElement = (<Stack allPallets={allPallets} setPallets={setPallets} {...controlProps} />)
            break;
        };
        case (PalletTeachState.SUMMARY): {
            ChildElement = (<ConfigurationSummary allPallets={allPallets} finalConfig={GenerateFinalConfig(configuration)} allBoxes={allBoxes} {...controlProps} />)
            break;
        };
        default: {
            console.log("Default Pallet Configurator Case -- unhandled");
        };
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
