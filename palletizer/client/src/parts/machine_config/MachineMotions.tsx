import React, { useState, ChangeEvent } from "react";

import "../teach/css/BoxSize.scss";
import ContentItem, { ButtonProps } from "../teach/ContentItem";

import mmV1image from "./images/mmV1.png";

import "./css/MachineMotions.scss";

import "../teach/css/BoxSize.scss";


function IPValidator(s: string): boolean {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(s)) {
        return true;
    } else {
        return false;
    }
};

export enum MM_VERSION {
    ONE,
    TWO
};

export interface MachineMotion {
    name: string;
    ipAddress: string;
    gateway: string;
    netMask: string;
    version: MM_VERSION;
};

interface DropDownProps {
    name: string;
    currentValue: MM_VERSION
    handleSelect: (m: MM_VERSION) => void;
};

function DropDown({ name, currentValue, handleSelect }: DropDownProps) {

    let options = [MM_VERSION.ONE, MM_VERSION.TWO] as MM_VERSION[];

    let onChange = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        handleSelect(val);
    };

    return (
        <div className="PropertyInput">
            <div className="Name">
                {name + ":"}
            </div>
            <div className="Input">
                <select value={currentValue as number} onChange={onChange} >
                    {options.map((o: MM_VERSION, i: number) => {
                        return (
                            <option value={o as number}>
                                {"V" + String(o + 1)}
                            </option>
                        )
                    })}
                </select>
            </div>
        </div>
    );
};

interface PropertyInputProps {
    name: string;
    currentValue: string;
    handleChange: (s: string) => void;
    validator: (s: string) => boolean;
};

function PropertyInput({ name, currentValue, handleChange, validator }: PropertyInputProps) {
    // We will wait un
    let [valid, setValid] = useState<boolean>(validator(currentValue));
    let [value, setValue] = useState<string>(currentValue);

    let onChange = (e: ChangeEvent) => {
        let s = (e.target as any).value;

        let isValid = validator(s);
        if (isValid) {
            handleChange(s);
        }
        setValid(isValid);
        setValue(s);
    }

    return (
        <div className="PropertyInput">
            <div className="Name">
                {name + ":"}
            </div>
            <div className={"Input" + (valid ? " Valid" : "")} >
                <input type="text" value={value} onChange={onChange} />
            </div>
        </div>
    );
}

interface MachineCellProps {
    machine: MachineMotion,
    startEdit: () => void;
    editName: (s: string) => void;
};

function MachineCell({ machine, startEdit, editName }: MachineCellProps) {

    let handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        editName(newName);
    };

    let { ipAddress, gateway, netMask } = machine;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <img src={mmV1image} />
                </div>
                <div className="Name">
                    <input type="text" value={machine.name} onChange={handleName} />
                </div>
                <div className="Dimensions">
                    <div className="DimensionsGrid">
                        <div className="Dimension">
                            <span>
                                {"IP: " + ipAddress}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {"Gateway: " + gateway}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {"Mask: " + netMask}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="Edit">
                    <div className="EditButton" onClick={startEdit} >
                        <span>
                            {"Edit"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="Trash">
                <span className="icon-delete">
                </span>
            </div>
        </div>
    );
};

interface MachineMotionsProps {
    allMachines: MachineMotion[];
    setMachines: (machines: MachineMotion[]) => void;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

function defaultMachine(index: number): MachineMotion {
    let m: MachineMotion = {
        name: "Machine Motion " + String(index + 1),
        ipAddress: "192.168.7.2",
        netMask: "255.255.255.0",
        gateway: "192.168.0.1",
        version: MM_VERSION.ONE
    };
    return m;
};

function MachineMotions({ allMachines, setMachines, handleBack, handleNext, instructionNumber }: MachineMotionsProps) {

    let [summaryScreen, setSummaryScreen] = useState<boolean>(allMachines.length > 0);

    let [editingIndex, setEditingIndex] = useState<number | null>(null);

    let [editingMachine, setEditingMachine] = useState<MachineMotion>(defaultMachine(allMachines.length));

    let instruction = "Add Machine Motion Controllers";

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            if (summaryScreen) {
                handleBack();
            } else {
                if (allMachines.length > 0) {
                    setSummaryScreen(true);
                } else {
                    handleBack();
                }
            }
        }
    };

    let RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                if (editingIndex !== null) {
                    let m = [...allMachines];
                    m[editingIndex] = editingMachine;
                    setMachines(m);
                } else {
                    setMachines([...allMachines, editingMachine]);
                }
                setSummaryScreen(true);
            }
        },
        enabled: true
    };

    let editName = (index: number) => (s: string) => {
        let ms = [...allMachines];
        ms[index].name = s;
        setMachines(ms);
    };

    let updateEditingName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        setEditingMachine({ ...editingMachine, name: newName });
    };

    let startEdit = (index: number) => () => {
        if (index > 0) {
            setEditingMachine(allMachines[index]);
            setEditingIndex(index);
        } else {
            setEditingIndex(null);
            setEditingMachine(defaultMachine(allMachines.length));
        }
        setSummaryScreen(false);
    };

    if (summaryScreen) {

        instruction = "Add and edit Machine Motion controllers";

        let AddButton: ButtonProps = {
            name: "Add new Machine Motion",
            action: startEdit(-1)
        };

        let contentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
            AddButton
        };

        return (
            <ContentItem {...contentItemProps} >
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allMachines.map((m: MachineMotion, index: number) => {
                                return (<MachineCell key={index} startEdit={startEdit(index)} editName={editName(index)} machine={m} />)
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );

    } else {

        instruction = "Define Machine Motion version and network parameters";

        let contentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
        };

        let ipProps: PropertyInputProps = {
            name: "IP Address",
            currentValue: editingMachine.ipAddress,
            validator: IPValidator,
            handleChange: (s: string) => {
                let nm = { ...editingMachine };
                nm.ipAddress = s;
                setEditingMachine(nm);
            }
        };

        let gatewayProps: PropertyInputProps = {
            name: "Gateway",
            currentValue: editingMachine.gateway,
            validator: IPValidator,
            handleChange: (s: string) => {
                let nm = { ...editingMachine };
                nm.gateway = s;
                setEditingMachine(nm);
            }
        };

        let netmaskProps: PropertyInputProps = {
            name: "Subnet Mask",
            currentValue: editingMachine.netMask,
            validator: IPValidator,
            handleChange: (s: string) => {
                let nm = { ...editingMachine };
                nm.netMask = s;
                setEditingMachine(nm);
            }
        };

        let dropDownProps: DropDownProps = {
            name: "Version",
            currentValue: editingMachine.version,
            handleSelect: (e: MM_VERSION) => {
                let nm = { ...editingMachine };
                nm.version = e;
                setEditingMachine(nm);
            }
        };

        return (
            <ContentItem {...contentItemProps} >
                <div className="MachineMotion">
                    <div className="ParameterContainer">
                        <div className="Name" >
                            <div className="NamePrompt">
                                {"Name:"}
                            </div>
                            <div className="NameInput">
                                <input value={editingMachine.name} onChange={updateEditingName} />
                            </div>
                        </div>
                        <DropDown {...dropDownProps} />
                        <PropertyInput {...ipProps} />
                        <PropertyInput {...gatewayProps} />
                        <PropertyInput {...netmaskProps} />
                    </div>
                    <div className="ImageContainer">
                        <img src={mmV1image} />
                    </div>
                </div>
            </ContentItem>
        );
    }
}


export default MachineMotions;
