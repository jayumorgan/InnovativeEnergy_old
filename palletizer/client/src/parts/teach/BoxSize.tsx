import React, { useState, ChangeEvent } from 'react';

import ContentItem, { ButtonProps } from "./ContentItem";

import Jogger from "./Jogger";

// 3D display of box.
import Box from "./3D/BoxRender";
// import PlusIcon, { IconProps, XIcon } from "./PlusIcon";

import { BoxObject, BoxDimensions, Coordinate } from "./structures/Data";

import "./css/BoxSize.scss";

//---------------Box Size---------------

interface BoxProps {
    box: BoxObject;
    startEdit: () => void;
    editName: (newName: string) => void;
};

function BoxCell({ box, startEdit, editName }: BoxProps) {
    // let placeholder = box.name;

    let { dimensions } = box;
    let { width, length, height } = dimensions;
    // let { x, y, z } = box.pickLocation;

    let handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        editName(newName);
    };

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <Box {...dimensions} />
                </div>
                <div className="Name">
                    <input type="text" value={box.name} onChange={handleName} />
                </div>
                <div className="Dimensions">
                    <div className="DimensionsGrid">
                        <div className="Dimension">
                            <span>
                                {`W: ${width}`}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {`L: ${length}`}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {`H: ${height}`}
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

//---------------Box Setup Screen---------------
interface CoordinateItemProps {
    name: string;
    value: number;
    setter: (val: number) => void;
};

function CoordinateItem({ name, value, setter }: CoordinateItemProps) {

    let onChange = (e: ChangeEvent) => {
        let val = (e.target as any).value as number;
        setter(+val);
    }

    return (
        <div className="CoordinateItem">
            <div className="CoordinateName">
                <span>
                    {name}
                </span>
                <span className="Unit">
                    {"(mm)"}
                </span>
            </div>
            <div className="CoordinateInput">
                <input type="number" value={value} onChange={onChange} />
            </div>
        </div>
    );
};

interface CreateNewBoxProps {
    box: BoxObject;
    machineConfigId: number;
    LeftButton: ButtonProps;
    RightButton: ButtonProps;
    updateBox: (b: BoxObject) => void;
    instructionNumber: number;
};

function CreateNewBox({ machineConfigId, instructionNumber, box, LeftButton, RightButton, updateBox }: CreateNewBoxProps) {

    let updateName = (name: string) => {
        updateBox({ ...box, name });
    };

    let updateCoordinate = (dim: string) => (val: number) => {
        let { dimensions } = box;
        let dims = {
            width: dimensions.width,
            length: dimensions.length,
            height: dimensions.height
        } as any;
        dims[dim] = val;
        updateBox({ ...box, dimensions: dims as BoxDimensions });
    };

    let selectAction = (c: Coordinate) => {
        console.log("Selected Pick Location....", c);
        updateBox({ ...box, pickLocation: c });
    };

    let instruction = "Move and select box pick location";

    return (
        <ContentItem instruction={instruction} RightButton={RightButton} LeftButton={LeftButton} instructionNumber={instructionNumber}>
            <div className="NewBoxGrid">
                <div className="BoxSetup">
                    <Jogger machineConfigId={machineConfigId} selectAction={selectAction} name={box.name} updateName={updateName} />
                    <div className="BoxConfigurator">
                        <Box {...box.dimensions} />
                        <div className="CoordinateDisplay">
                            <CoordinateItem name={"Width"} value={box.dimensions.width} setter={updateCoordinate("width")} />
                            <CoordinateItem name={"Length"} value={box.dimensions.length} setter={updateCoordinate("length")} />
                            <CoordinateItem name={"Height"} value={box.dimensions.height} setter={updateCoordinate("height")} />
                        </div>
                    </div>
                </div>
            </div>
        </ContentItem>
    );
};


interface BoxSizeProps {
    allBoxes: BoxObject[];
    setBoxes: (boxes: BoxObject[]) => void;
    instructionNumber: number,
    machineConfigId: number;
    handleBack: () => void;
    handleNext: () => void;
};

export default function BoxSize({ allBoxes, instructionNumber, setBoxes, handleBack, handleNext, machineConfigId }: BoxSizeProps) {

    let [summaryScreen, setSummaryScreen] = useState<boolean>(allBoxes.length > 0);

    let box: BoxObject = {
        name: "Box " + String(allBoxes.length + 1),
        dimensions: { length: 235, height: 267, width: 330 },
        pickLocation: { x: 0, y: 0, z: 0 }
    };

    let [editingBox, setEditingBox] = useState<BoxObject>(box);

    let [editingIndex, setEditingIndex] = useState<number | null>(null);

    let startEdit = (index: number) => () => {
        if (index >= 0) {
            console.log(index, "Setting editing index");
            setEditingBox(allBoxes[index]);
            setEditingIndex(index);
        } else {
            setEditingIndex(null);
            setEditingBox(box);
        }
        setSummaryScreen(false);
    };

    let editName = (boxIndex: number) => (newName: string) => {
        let newBoxes = [...allBoxes];
        newBoxes[boxIndex].name = newName;
        setBoxes(newBoxes);
    };

    let instruction: string;

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            if (summaryScreen) {
                handleBack(); // Go to the next screen
            } else {
                if (allBoxes.length > 0) {
                    setSummaryScreen(true);
                } else {
                    handleBack();
                }
            }
        }
    };

    // Only allow the box to be increment
    let RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                if (editingIndex !== null) {
                    console.log("Editing index");
                    let b = [...allBoxes];
                    b[editingIndex] = editingBox;
                    setBoxes(b);
                } else {
                    setBoxes([...allBoxes, editingBox]);
                }
                setSummaryScreen(true);
            }
        },
        enabled: true
    };

    if (summaryScreen) {
        instruction = "Create and edit boxes";

        let AddButton: ButtonProps = {
            name: "Add new box",
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
                            {allBoxes.map((val: BoxObject, index: number) => {
                                return (
                                    <BoxCell box={val} key={index} startEdit={startEdit(index)} editName={editName(index)} />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    } else {

        let createBoxProps: CreateNewBoxProps = {
            box: editingBox,
            LeftButton,
            RightButton,
            updateBox: setEditingBox,
            instructionNumber,
            machineConfigId
        };

        return (
            <CreateNewBox {...createBoxProps} />
        );
    }
};




