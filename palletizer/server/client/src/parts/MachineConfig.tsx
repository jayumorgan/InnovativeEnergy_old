import React, { useState, useReducer, ReactElement } from "react";


import { Fraction } from "./teach/CompletionDots";

import Modal from "./Modal";

import Name from "./teach/Name";

import MachineMotions, { MachineMotion } from "./machine_config/MachineMotions";



import "./css/TeachMode.scss";


interface MachineConfiguratorProps {
    close: () => void;
    index: number;
    machineConfig: null;
};

enum MachineConfigState {
    CONFIG_NAME,
    ADD_MACHINE_MOTIONS,
};


interface MachineConfiguration {
    name: string;
    machines: MachineMotion[]; // String of IP Addresses
};


function defaultConfiguration(index: number): MachineConfiguration {
    return {
        name: "Machine Configuration " + String(index + 1),
        machines: [] as MachineMotion[]
    } as MachineConfiguration;
};

enum MACHINE_ACTION {
    NAME,
    MACHINES,
};

interface ReducerAction {
    type: MACHINE_ACTION;
    payload: any;
};


function MachineReducer(state: MachineConfiguration, action: ReducerAction) {
    let actionType = action.type;

    let { payload } = action;

    switch (actionType) {
        case MACHINE_ACTION.NAME: {
            return { ...state, name: payload as string };
        }
        case MACHINE_ACTION.MACHINES: {
            return { ...state, machines: action.payload as MachineMotion[] };
        }
        default: {
            return state;
        }
    }
};



function MachineConfigurator({ close, index, machineConfig }: MachineConfiguratorProps) {

    let completionFraction = { n: 0, d: 5 } as Fraction;

    let [configuration, dispatch] = useReducer(MachineReducer, defaultConfiguration(index));

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

    let handleNext = () => {
        setConfigState(++configState);
    };


    let handleBack = () => {
        if (configState > 0) {
            setConfigState(--configState);
        } else {
            close();
        }
    }

    let controlProps: any = {
        handleNext,
        handleBack,
        instructionNumber: completionFraction.n

    };

    completionFraction.n = configState as number;

    let ChildElement: ReactElement = (<> </>);

    switch (configState) {
        case (MachineConfigState.CONFIG_NAME): {

            break;
        }
        case (MachineConfigState.ADD_MACHINE_MOTIONS): {

            let props = {
                allMachines: configuration.machines,
                setMachines,
                ...controlProps
            } as any;

            ChildElement = (<MachineMotions {...props} />);
            break;
        }
        default: {
            console.log("Unhandled MachineConfigState....");

        }
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
