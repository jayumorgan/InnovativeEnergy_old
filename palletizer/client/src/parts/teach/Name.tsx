import React, { ChangeEvent } from "react";
import { XIcon } from "./PlusIcon";
import { ConfigItem } from "../../types/Types";
import "./css/Name.scss";
import { wrapChangeEventString, wrapChangeEventNumber } from "../shared/shared";


export interface PalletNameProps {
    name: string;
    close: () => void;
    setName: (s: string) => void;
    handleNext: () => void;
    existing: boolean;
    machineConfigs: ConfigItem[];
    machineConfigId: number;
    setMachineConfigId: (id: number) => void;
};

// Find a better name.... -- this is exclusively for pallet configuration.
export function PalletName({ name, close, setName, handleNext, existing, machineConfigs, machineConfigId, setMachineConfigId }: PalletNameProps) {

    const handleName = wrapChangeEventString(setName);
    const handleMachineConfig = wrapChangeEventNumber(setMachineConfigId);
    const iconSize: number = 25;

    const nameTitle = existing ? "Edit the name of your pallet configuration:" : "Enter a name for your new pallet configuration:";
    const mcTitle = "Select machine configuration:";

    return (
        <div className="LargeName">
            <div className="ClosePartition">
                <div onClick={close}>
                    <XIcon height={iconSize} width={iconSize} />
                </div>
            </div>
            <div className="Content">
                <div className="Item">
                    <div className="Name">
                        <span>
                            {nameTitle}
                        </span>
                    </div>
                    <div className="NameInput">
                        <input type="text" value={name} onChange={handleName} />
                    </div>
                </div>
                <div className="Item">
                    <div className="Name">
                        <span>
                            {mcTitle}
                        </span>
                    </div>
                    <div className="NameInput">
                        <select value={machineConfigId} onChange={handleMachineConfig}>
                            {machineConfigs.map((cf: ConfigItem, i: number) => {
                                return (<option value={cf.id} key={i}>{cf.name} </option>);
                            })}
                        </select>
                    </div>
                </div>
                <div className="StartConfigButton">
                    <div className="StartButton" onClick={handleNext}>
                        <span>
                            {"Start Configuration"}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
};



interface NameProps {
    name: string;
    close: () => void;
    changeName: (s: string) => void;
    handleStart: () => void;
    existing: boolean;
    isPallet: boolean;
};

// ---------------Small Name---------------
export default function SmallName({ name, close, changeName, handleStart, existing, isPallet }: NameProps) {

    const icon_size = 25;
    const onChange = wrapChangeEventString(changeName);
    const typeName = isPallet ? "pallet" : "machine";
    const title = existing ? `Edit the name of your ${typeName} configuration` : `Enter a name for your new ${typeName} configuration`;

    return (
        <div className="TeachModeNameStart">
            <div className="ClosePartition" onClick={close}>
                <XIcon height={icon_size} width={icon_size} />
            </div>
            <div className="ContentPartition">
                <div className="Instruction">
                    <span>
                        {title}
                    </span>
                </div>
                <div className="NameInput">
                    <input type="text" value={name} onChange={onChange} />
                </div>
                <div className="StartConfigButton">
                    <div className="StartButton" onClick={handleStart}>
                        <span>
                            {"Start Configuration"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};




