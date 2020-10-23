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
    getXAxisAngle,
    LayoutObject
} from "../geometry/geometry";
import { Fraction } from "./teach/CompletionDots";
import { ControlProps } from "./shared/shared";
import { PalletName, PalletNameProps } from "./teach/Name";
import HomingStep, { HomingStepProps } from "./teach/HomingStep";
import BoxSize from "./teach/BoxSize";
import PalletCorners from "./teach/Pallet";
import Layout from "./teach/Layouts";
import Stack from "./teach/Stack";
import ConfigurationSummary from "./teach/ConfigurationSummary";
import { XIcon } from "./teach/PlusIcon";

//---------------Styles---------------
import "./css/TeachMode.scss";
import "./css/Jogger.scss";
import "./css/BoxSize.scss";

enum PalletTeachState {
    CONFIG_NAME,
    HOMING_STEP,
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
    complete: boolean;
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

//-------Custom Reducers To Deal With Forward Breaking Changes-------
function boxReducer(state: PalletConfiguration, boxes: BoxObject[]): PalletConfiguration {
    // 1.  Deleted,
    // 2.  Edited with change flag.
    // 3.  Added
    if (boxes.length > state.boxes.length) { // Added
        console.log("Added");
        return { ...state, boxes };
    }

    let changedIndex: number | null = null;

    // Shift boxes down.

    const filterPallets = (modifiedBoxIndex: number, deleted: boolean) => {
        return state.pallets.map((po: PalletGeometry) => {
            let deleted_layouts: number[] = [];

            po.Layouts = po.Layouts.filter((lo: LayoutObject, i: number) => {
                const checkBox = (n: number): boolean => {
                    if (n >= lo.boxPositions.length) {
                        return false;
                    }
                    if (lo.boxPositions[n].index === modifiedBoxIndex) {
                        return true;
                    }
                    return checkBox(n + 1);
                };

                if (!checkBox(0)) {
                    return true;
                }

                deleted_layouts.push(i);
                return false;
            });

            if (deleted) {
                po.Layouts = po.Layouts.map((lo: LayoutObject) => {
                    lo.boxPositions = lo.boxPositions.map((bpo: BoxPositionObject) => {
                        if (bpo.index > modifiedBoxIndex) {
                            bpo.index--;
                        }
                        return bpo;
                    });
                    return lo;
                });
            }

            deleted_layouts.sort((a, b) => { return b - a });

            po.Stack = po.Stack.filter((li: number) => {
                return deleted_layouts.indexOf(li) < 0; // not in deleted
            });

            deleted_layouts.forEach((dl: number) => {
                po.Stack = po.Stack.map((li: number) => {
                    if (li > dl) {
                        return --li;
                    }
                    return li;

                });
            });

            return po;
        });
    };

    if (boxes.length < state.boxes.length) {
        changedIndex = boxes.length; // the last index (box that was removed).
    }
    let delete_flag = false;

    boxes = boxes.map((b: BoxObject, i: number) => {
        if (b.changed === true) {
            changedIndex = i;
        }

        if (b.deleted === true) {
            changedIndex = i;
            delete_flag = true;
        }
        delete b.changed;
        return b;
    }).filter((b: BoxObject) => {
        return !(b.deleted === true);
    });

    if (changedIndex !== null) {
        const pallets = filterPallets(changedIndex, delete_flag);
        console.log(pallets, "Pallet update");
        return { ...state, pallets, boxes };
    }

    return { ...state, boxes };
};


function configurationReducer(state: PalletConfiguration, action: ConfigAction) {
    const { payload } = action;
    switch (action.type) {
        case (CONF_ACTION.SET_NAME): {
            return { ...state, name: payload as string };
        }
        case (CONF_ACTION.SET_BOXES): {
            return boxReducer(state, payload as BoxObject[]);
        }
        case (CONF_ACTION.SET_PALLETS): {
            return { ...state, pallets: payload as PalletGeometry[] };
        }
        case (CONF_ACTION.SET_MACHINE_CONFIG_ID): {
            return { ...state, machine_config_id: payload as number };
        }
        default: {
            return state;
        }
    };
};

export function GenerateFinalConfig(startingConfig: PalletConfiguration) {
    const config = { ...startingConfig };

    const { pallets } = config;
    let boxCoordinates: BoxCoordinates[] = [];

    const stackShifts: number[] = new Array<number>(config.boxes.length).fill(0);

    pallets.forEach((p: PalletGeometry, palletIndex: number) => {
        const { Layouts, Stack, corner1, corner2, corner3 } = p;
        const palletHeight = (corner1.z + corner2.z + corner3.z) / 3;

        const Ydirection = Subtract3D(corner1, corner2);
        const Xdirection = Subtract3D(corner3, corner2);
        const φ_pallet = getXAxisAngle(Xdirection);

        let currentHeightIncrement = palletHeight; // Pallet Height Is Height of first box on pallet. --> This is not universal.

        Stack.forEach((n: number, stackIndex: number) => {

            const { boxPositions, height } = Layouts[n];

            boxPositions.forEach((b: BoxPositionObject) => {
                const { position, rotated } = b;
                const box = config.boxes[b.index];
                const pickLocation = { ...box.pickLocation }; // Get pick location from actual boxes.
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

                if (stackIndex > 0) { // If not first stack, add box height.
                    z_add -= box.dimensions.height;
                }

                averagePosition.z = z_add;

                const θ_drop: number = (rotated ? 90 : 0) + φ_pallet;
                let dropLocation: CoordinateRot = { ...averagePosition, θ: θ_drop };
                let linearPathDistance: number = Norm(Subtract3D(pickLocation, dropLocation));

                if (box.pickFromStack) { // If picking from stack, subtract a box height.
                    pickLocation.z += box.dimensions.height * stackShifts[b.index];
                    stackShifts[b.index]++;
                }

                boxCoordinates.push({
                    pickLocation: { ...pickLocation },
                    dropLocation,
                    dimensions: box.dimensions,
                    boxIndex: b.index,
                    palletIndex,
                    stackIndex,
                    linearPathDistance,
                    boxDetection: box.boxDetection
                } as BoxCoordinates);


            });

            if (stackIndex > 0) { // don't add if first row.
                currentHeightIncrement -= height;
            }
        });
    });
    console.log("Final Box Coordinates ", boxCoordinates);

    return {
        config: startingConfig,
        boxCoordinates,
        complete: true
    } as SavedPalletConfiguration;
};


function generateIncompleteConfig(config: PalletConfiguration): SavedPalletConfiguration {
    return {
        config,
        boxCoordinates: [],
        complete: false
    };
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

    const setName = (name: string) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_NAME, payload: name as any } as ConfigAction);
    };

    const setBoxes = (boxes: BoxObject[]) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_BOXES, payload: boxes as any });
    };

    const setPallets = (pallets: PalletGeometry[]) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_PALLETS, payload: pallets as any });
    };

    const setMachineConfigId = (id: number) => {
        dispatchConfiguration({ type: CONF_ACTION.SET_MACHINE_CONFIG_ID, payload: id as any });
    };

    const handleNext = () => {
        if (teachState === PalletTeachState.SUMMARY) {
            let finalConfig = GenerateFinalConfig(configuration);
            let { name } = configuration;
            SavePalletConfig(name, finalConfig, id, finalConfig.complete).then(() => {
                close();
            }).catch((e: any) => {
                console.log("error saving pallet configuration", e);
                close();
            });
        } else {
            setTeachState(1 + teachState);
        }
    };

    const handleBack = () => {
        if (teachState > 0) {
            setTeachState(-1 + teachState);
        } else {
            close();
        }
    };

    const modalClose = () => {
        // close should not be async to prevent duplication on double click.
        const minSaveStep = Number(PalletTeachState.HOMING_STEP); // Threshold for saving a partial configuration.
        if ((palletConfig && !(palletConfig.complete)) || (!palletConfig && (teachState as number) > minSaveStep)) {
            const incomplete_config: SavedPalletConfiguration = generateIncompleteConfig(configuration);
            const { name } = configuration;
            SavePalletConfig(name, incomplete_config, id, incomplete_config.complete).then(() => {
                close();
            }).catch((e: any) => {
                console.log("Error saving incomplete pallet configuration", e);
                close();
            });
        } else {
            close();
        }
    };

    completionFraction.n = teachState as number;

    const controlProps: ControlProps = {
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
        case (PalletTeachState.HOMING_STEP): {
            const homingStepProps: HomingStepProps = {
                machineConfigId,
                ...controlProps
            };
            ChildElement = (<HomingStep {...homingStepProps} />);
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
            break;
        };
    };

    const disabledClose = () => { return; };

    if (teachState === PalletTeachState.CONFIG_NAME) {

        const palletNameProps: PalletNameProps = {
            name: configuration.name,
            close: close,
            setName,
            setMachineConfigId,
            existing: palletConfig !== null,
            handleNext,
            machineConfigs: machine_configs,
            machineConfigId: configuration.machine_config_id
        };

        return (
            <Modal close={disabledClose}>
                <PalletName {...palletNameProps} />
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

        const iconSize = 25;

        return (
            <Modal close={disabledClose}>
                <div className="TeachContainer">
                    <div className="TeachModeHeader">
                        <div className="TeachModeTitle">
                            <span>
                                {"Pallet configurator"}
                            </span>
                        </div>
                        <div className="TeachModeCompletion">
                            <div className="CloseButton">
                                <div className="Button" onClick={modalClose}>
                                    <XIcon height={iconSize} width={iconSize} />
                                </div>
                            </div>
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
