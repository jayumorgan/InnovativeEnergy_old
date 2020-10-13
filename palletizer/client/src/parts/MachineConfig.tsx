import React, { useState, useReducer, ReactElement } from "react";
import { Fraction } from "./teach/CompletionDots";
import Modal from "./Modal";
import { SaveMachineConfig } from "../requests/requests";
import { ControlProps } from "./shared/shared";
import { XIcon } from "./teach/PlusIcon";
import Name from "./teach/Name";
import MachineMotions, { MachineMotion } from "./machine_config/MachineMotions";
import Drives, { AxesConfiguration, defaultAxesConfiguration } from "./machine_config/Drives";
import IOConfig, { IOState, IO, defaultIO } from "./machine_config/IO";
import MachineSummary, { MachineSummaryProps } from "./machine_config/Summary";
import Detection, { DetectionProps } from "./machine_config/Detection";


//---------------Style---------------
import "./css/TeachMode.scss";

enum MachineConfigState {
    CONFIG_NAME,
    ADD_MACHINE_MOTIONS,
    AXES_CONFIG,
    IO_CONFIG,
    BOX_DETECTION,
    GOOD_PICK,
    SUMMARY
};

export interface MachineConfiguration {
    name: string;
    machines: MachineMotion[]; // String of IP Addresses
    axes: AxesConfiguration;
    io: IO;
    box_detection: IOState[];
    good_pick: IOState[];
};

export interface SavedMachineConfiguration {
    name: string;
    config: MachineConfiguration;
    complete: boolean;
}

function defaultConfiguration(index: number): MachineConfiguration {
    return {
        name: "Machine Configuration " + String(index + 1),
        machines: [] as MachineMotion[],
        axes: defaultAxesConfiguration(),
        io: defaultIO(),
        box_detection: [] as IOState[],
        good_pick: [] as IOState[],
        complete: false
    } as MachineConfiguration;
};

enum MACHINE_ACTION {
    NAME,
    MACHINES,
    AXES,
    IO,
    DETECTION,
    GOOD_PICK
};

interface ReducerAction {
    type: MACHINE_ACTION;
    payload: any;
};


function MachineReducer(state: MachineConfiguration, action: ReducerAction) {
    const actionType = action.type;

    const { payload } = action;

    switch (actionType) {
        case (MACHINE_ACTION.NAME): {
            return { ...state, name: payload as string };
        }
        case (MACHINE_ACTION.MACHINES): {
            return { ...state, machines: action.payload as MachineMotion[] };
        }
        case (MACHINE_ACTION.AXES): {
            return { ...state, axes: action.payload as AxesConfiguration };
        }
        case (MACHINE_ACTION.IO): {
            return { ...state, io: action.payload as IO };
        }
        case (MACHINE_ACTION.DETECTION): {
            return { ...state, box_detection: action.payload as IOState[] };
        }
        case (MACHINE_ACTION.GOOD_PICK): {
            return { ...state, good_pick: action.payload as IOState[] };
        }
        default: {
            return state;
        }
    }
};

interface MachineConfiguratorProps {
    close: () => void;
    index: number;
    machineConfig: null | SavedMachineConfiguration;
    id: number | null;
};

function MachineConfigurator({ close, index, machineConfig, id }: MachineConfiguratorProps) {

    let completionFraction = { n: 0, d: 6 } as Fraction;

    const [configuration, dispatch] = useReducer(MachineReducer, (() => {
        if (machineConfig) {
            return machineConfig.config
        } else {
            return defaultConfiguration(index)
        }
    })());

    const [configState, setConfigState] = useState<MachineConfigState>(MachineConfigState.CONFIG_NAME);

    const setName = (s: string) => {
        dispatch({
            type: MACHINE_ACTION.NAME,
            payload: s as any
        } as ReducerAction);
    };

    const setMachines = (m: MachineMotion[]) => {
        dispatch({
            type: MACHINE_ACTION.MACHINES,
            payload: m as any
        });
    };

    const setAxes = (a: AxesConfiguration) => {
        dispatch({
            type: MACHINE_ACTION.AXES,
            payload: a as any
        });
    };

    const setIO = (io: IO) => {
        dispatch({
            type: MACHINE_ACTION.IO,
            payload: io as any
        });
    };

    const setDetection = (detection: IOState[]) => {
        dispatch({
            type: MACHINE_ACTION.DETECTION,
            payload: detection as any
        });
    };

    const setGoodPick = (gp: IOState[]) => {
        dispatch({
            type: MACHINE_ACTION.GOOD_PICK,
            payload: gp as any
        });
    };

    const handleNext = () => {
        if (configState as number < completionFraction.d) {
            setConfigState(configState + 1);
        } else {
            const save: SavedMachineConfiguration = {
                name: configuration.name,
                config: configuration,
                complete: true
            };
            SaveMachineConfig(configuration.name, save, id, save.complete).then(() => {
                close();
            }).catch((e: any) => {
                console.log("Error saving machine configuration", e);
                close();
            });
        }
    };

    const handleBack = () => {
        if (configState > 0) {
            setConfigState(configState - 1);
        } else {
            close();
        }
    };

    completionFraction.n = configState as number;

    const modalClose = () => {
        if ((machineConfig && !machineConfig.complete) || (!machineConfig && (configState as number) > 0)) {
            const incomplete_config: SavedMachineConfiguration = {
                name: configuration.name,
                config: configuration,
                complete: false
            };
            SaveMachineConfig(incomplete_config.name, incomplete_config, id, incomplete_config.complete).then(() => {
                close();
            }).catch((e: any) => {
                console.log("Error saving incomplete machine configuration", e);
                close();
            });
        } else {
            close();
        }
    };


    let controlProps: ControlProps = {
        handleNext,
        handleBack,
        instructionNumber: completionFraction.n
    };

    let ChildElement: ReactElement = (<> </>);

    switch (configState) {
        case (MachineConfigState.CONFIG_NAME): {
            break;
        };
        case (MachineConfigState.ADD_MACHINE_MOTIONS): {
            const props = {
                allMachines: configuration.machines,
                setMachines,
                ...controlProps
            } as any;
            ChildElement = (<MachineMotions {...props} />);
            break;
        };
        case (MachineConfigState.AXES_CONFIG): {
            const props = {
                setAxes,
                Axes: configuration.axes,
                allMachines: configuration.machines,
                ...controlProps
            } as any;
            ChildElement = (<Drives {...props} />);
            break;
        };
        case (MachineConfigState.IO_CONFIG): {
            const props = {
                io: configuration.io,
                setIO,
                allMachines: configuration.machines,
                ...controlProps
            } as any;
            ChildElement = (<IOConfig {...props} />);
            break;
        };
        case (MachineConfigState.BOX_DETECTION): {
            const props: DetectionProps = {
                ...controlProps,
                setDetection,
                box_detection: configuration.box_detection,
                allMachines: configuration.machines,
                isDetection: true
            };
            ChildElement = (<Detection {...props} />);
            break;
        };
        case (MachineConfigState.GOOD_PICK): {
            console.log("Good Pick", configuration.good_pick);
            const props: DetectionProps = {
                ...controlProps,
                setDetection: setGoodPick,
                allMachines: configuration.machines,
                box_detection: configuration.good_pick,
                isDetection: false
            };
            ChildElement = (<Detection {...props} />);
            break;
        };
        case (MachineConfigState.SUMMARY): {
            const props: MachineSummaryProps = {
                machineConfig: configuration,
                ...controlProps
            };
            ChildElement = (<MachineSummary {...props} />);
            break;
        };
        default: {
            console.log("Unhandled MachineConfigState....");
        };
    };

    const disabledStop = () => { return; };

    if (configState === MachineConfigState.CONFIG_NAME) {
        let nameProps = {
            name: configuration.name,
            close,
            changeName: setName,
            handleStart: handleNext,
            existing: false,
            isPallet: false
        } as any;
        return (
            <Modal close={disabledStop}>
                <Name {...nameProps} />
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
            <Modal close={disabledStop}>
                <div className="TeachContainer">
                    <div className="TeachModeHeader">
                        <div className="TeachModeTitle">
                            <span>
                                {"Machine configurator"}
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
            </Modal>
        );
    }
};

export default MachineConfigurator;
