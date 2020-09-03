import React, { useState, useReducer, ReactElement } from "react";


import { Fraction } from "./teach/CompletionDots";

import Modal from "./Modal";

import { SaveMachineConfig } from "../requests/requests";

//---------------Configuration Steps---------------

import Name from "./teach/Name";
import MachineMotions, { MachineMotion } from "./machine_config/MachineMotions";
import Drives, { Drive, AxesConfiguration, defaultAxesConfiguration } from "./machine_config/Drives";
import IOConfig, { IOState, IO, defaultIO } from "./machine_config/IO";
import MachineSummary, { MachineSummaryProps } from "./machine_config/Summary";

//---------------Style---------------

import "./css/TeachMode.scss";


enum MachineConfigState {
    CONFIG_NAME,
    ADD_MACHINE_MOTIONS,
    AXES_CONFIG,
    IO_CONFIG,
    SUMMARY
};

export interface MachineConfiguration {
    name: string;
    machines: MachineMotion[]; // String of IP Addresses
    axes: AxesConfiguration;
    io: IO;
};


export interface SavedMachineConfiguration {
    name: string;
    config: MachineConfiguration;
}

function defaultConfiguration(index: number): MachineConfiguration {
    return {
        name: "Machine Configuration " + String(index + 1),
        machines: [] as MachineMotion[],
        axes: defaultAxesConfiguration(),
        io: defaultIO()
    } as MachineConfiguration;
};

enum MACHINE_ACTION {
    NAME,
    MACHINES,
    AXES,
    IO
};

interface ReducerAction {
    type: MACHINE_ACTION;
    payload: any;
};


function MachineReducer(state: MachineConfiguration, action: ReducerAction) {
    let actionType = action.type;

    let { payload } = action;

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

    let completionFraction = { n: 0, d: 4 } as Fraction;

    let [configuration, dispatch] = useReducer(MachineReducer, (() => {
        if (machineConfig) {
            console.log(machineConfig, "REturning this values...");
            return machineConfig.config
        } else {
            return defaultConfiguration(index)
        }
    })());

    let [configState, setConfigState] = useState<MachineConfigState>(MachineConfigState.CONFIG_NAME);

    let setName = (s: string) => {
        dispatch({
            type: MACHINE_ACTION.NAME,
            payload: s as any
        } as ReducerAction);
    };

    let setMachines = (m: MachineMotion[]) => {
        dispatch({
            type: MACHINE_ACTION.MACHINES,
            payload: m as any
        });
    };

    let setAxes = (a: AxesConfiguration) => {
        dispatch({
            type: MACHINE_ACTION.AXES,
            payload: a as any
        });
    };

    let setIO = (io: IO) => {
        dispatch({
            type: MACHINE_ACTION.IO,
            payload: io as any
        });
    };

    let handleNext = () => {
        if (configState as number < completionFraction.d) {
            setConfigState(++configState);
        } else {
            let save: SavedMachineConfiguration = {
                name: configuration.name,
                config: configuration
            };
            SaveMachineConfig(configuration.name, save, id);
            close();
        }
    };

    let handleBack = () => {
        if (configState > 0) {
            setConfigState(--configState);
        } else {
            close();
        }
    };

    completionFraction.n = configState as number;

    let controlProps: any = {
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
            let props = {
                allMachines: configuration.machines,
                setMachines,
                ...controlProps
            } as any;
            ChildElement = (<MachineMotions {...props} />);
            break;
        };
        case (MachineConfigState.AXES_CONFIG): {
            let props = {
                setAxes,
                Axes: configuration.axes,
                allMachines: configuration.machines,
                ...controlProps
            } as any;
            ChildElement = (<Drives {...props} />);
            break;
        };
        case (MachineConfigState.IO_CONFIG): {
            let props = {
                io: configuration.io,
                setIO,
                allMachines: configuration.machines,
                ...controlProps
            } as any;
            ChildElement = (<IOConfig {...props} />);
            break;
        };
        case (MachineConfigState.SUMMARY): {
            let props: MachineSummaryProps = {
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
            <Modal close={close}>
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

        return (
            <Modal close={close}>
                <div className="TeachContainer">
                    <div className="TeachModeHeader">
                        <div className="TeachModeTitle">
                            <span>
                                {"Machine configurator"}
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
            </Modal>
        );
    }
};

export default MachineConfigurator;
