import React, { useState, useEffect, ChangeEvent } from "react";

import { get_machine_config } from "../../requests/requests";

import { SavedMachineConfiguration } from "../MachineConfig";

import { MachineMotion } from "../machine_config/MachineMotions";

import { DriveSummary, DriveSummaryProps, AxesConfiguration, AXES } from "../machine_config/Drives";

import ContentItem, { ButtonProps } from "./ContentItem";

import { ConfigItem } from "../../types/Types";

//---------------Styles---------------
import "./css/MachineSelect.scss";

export interface MachineSelectProps {
    machine_configs: ConfigItem[];
    instructionNumber: number;
    machineConfigId: number;
    setMachineConfigId: (id: number) => void;
    handleNext: () => void;
    handleBack: () => void;
};

export default function MachineSelect({ instructionNumber, handleNext, handleBack, machine_configs, machineConfigId, setMachineConfigId }: MachineSelectProps) {

    let [selectedMachine, setSelectedMachine] = useState<ConfigItem>((() => {
        let selected_index = 0;
        for (let i = 0; i < machine_configs.length; i++) {
            let ci: ConfigItem = machine_configs[i];
            if (ci.id === machineConfigId) {
                selected_index = i;
                break;
            }
        }
        return machine_configs[selected_index];
    })());

    let [Axes, setAxes] = useState<AxesConfiguration | null>(null);
    let [Machines, setMachines] = useState<MachineMotion[] | null>(null);

    let instruction: string = "Select a machine configuration to use for this pallet configuration";

    let save = () => {
        setMachineConfigId(selectedMachine.id);
    };

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            save();
            handleBack();
        }
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            save();
            handleNext();
        },
        enabled: true
    };

    let contentItemProps = {
        LeftButton,
        RightButton,
        instructionNumber,
        instruction
    } as any;

    let handleChange = (e: ChangeEvent) => {
        let value: number = +(e.target as any).value;
        for (let i = 0; i < machine_configs.length; i++) {
            let ci: ConfigItem = machine_configs[i];
            if (ci.id === value) {
                console.log("Handle change have value ", value);
                setSelectedMachine(ci);
                break;
            }
        };
    };

    useEffect(() => {
        get_machine_config(selectedMachine.id).then((c: SavedMachineConfiguration) => {
            let { axes, machines } = c.config;
            setAxes(axes);
            setMachines(machines);
        }).catch((e) => {
            console.log("Error get machine configuration");
        });
    }, [selectedMachine]);

    let handleEditAxis = (a: AXES) => () => {
        console.log("Handle Edit Axes");
    };

    return (
        <ContentItem {...contentItemProps} >
            <div className="MachineSelect">
                <div className="MachineDropDown">
                    <div className="DropDown">
                        <select value={selectedMachine.id} onChange={handleChange}>
                            {machine_configs.map((ci: ConfigItem, i: number) => {
                                return (
                                    <option value={ci.id} key={i}>
                                        {ci.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
                <div className="MainContent">
                    {(Axes !== null && Machines !== null) &&
                        <DriveSummary Axes={Axes} Machines={Machines} handleEditAxis={handleEditAxis} />
                    }
                </div>
            </div>
        </ContentItem>
    );
};






