import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps, ButtonProps } from "./ContentItem";


import Jogger from "./Jogger";

// 3D display of box.
import Box from "./3D/BoxRender";
import PlusIcon, { IconProps, XIcon } from "./PlusIcon";

import { BoxObject, BoxDimensions, Coordinate } from "./structures/Data";

import "./css/BoxSize.scss";

//---------------Box Size---------------
enum DimensionEnum {
    L,
    W,
    H
};

interface NewBoxProps {
    startEdit: () => void;
};


function NewBox({ startEdit }: NewBoxProps) {

    return (
        <div className="NewBox">
            <div className="NewBoxButton" onClick={startEdit}>
                <PlusIcon height={20} width={20} />
                <span>
                    {"Add new box"}
                </span>
            </div>
        </div>
    );
};

interface DimensionCellProps {
    axis: string;
    value: number;
    update: (val: number) => void;
}

function DimensionCell({ axis, value, update }: DimensionCellProps) {

    let handle_update = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = (e.target.value as unknown) as number;
        update(val);
    };

    return (
        <div className="DimensionCell">
            <span>
                {axis + ": "}
            </span>
            <input type="number" value={value} onChange={handle_update} />
        </div>
    );
}

interface BoxProps {
    box: BoxObject;
    startEdit: () => void;
};


function BoxCell({ box, startEdit }: BoxProps) {
    let placeholder = box.name;

    let { dimensions } = box;
    let { width, length, height } = dimensions;
    let { x, y, z } = box.pickLocation;

    let update_dim = (dimension: DimensionEnum) => (val: number) => {
        let newDim = { ...dimensions } as BoxDimensions;
        switch (dimension) {
            case (DimensionEnum.L): {
                newDim.length = val;
                break;
            };
            case (DimensionEnum.W): {
                newDim.width = val;
                break;
            };
            case (DimensionEnum.H): {
                newDim.height = val;
                break;
            }
        }
    };

    let iconSize = 30;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <Box {...dimensions} />
                </div>
                <div className="Name">
                    <input type="text" placeholder={placeholder} />
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
    /* <input type="number" value={value} /> */
};

interface CreateNewBoxProps {
    box: BoxObject;
    LeftButton: ButtonProps;
    RightButton: ButtonProps;
    updateBox: (b: BoxObject) => void;
    instructionNumber: number;
};

function CreateNewBox({ instructionNumber, box, LeftButton, RightButton, updateBox }: CreateNewBoxProps) {

    let pallet_seq_name = "Pallet Sequence 1";
    let input_name = "PalletSequenceTitle";

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
        updateBox({ ...box, pickLocation: c });
    };

    let instruction = "Move and select box pick location";

    return (
        <ContentItem instruction={instruction} RightButton={RightButton} LeftButton={LeftButton} instructionNumber={instructionNumber}>
            <div className="NewBoxGrid">
                <div className="BoxSetup">
                    <Jogger selectAction={selectAction} name={box.name} updateName={updateName} />
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
    handleBack: () => void;
    handleNext: () => void;

}

// How will we update this? 

function BoxSize({ allBoxes, instructionNumber, setBoxes, handleBack, handleNext }: BoxSizeProps) {
    // Must have fixed width.
    let [summaryScreen, setSummaryScreen] = useState<boolean>(allBoxes.length > 0);

    let box: BoxObject = {
        name: "Box " + String(allBoxes.length + 1),
        dimensions: { length: 50, height: 50, width: 50 },
        pickLocation: { x: 0, y: 0, z: 0 }
    };

    let [editingBox, setEditingBox] = useState<BoxObject>(box);

    let [editingIndex, setEditingIndex] = useState<number | null>(null);

    let startEdit = (index: number) => () => {
        if (index >= 0) {
            setEditingBox(allBoxes[index]);
            setEditingIndex(index);
        } else {
            setEditingIndex(null);
            setEditingBox(box);
        }
        setSummaryScreen(false);
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
        name: summaryScreen ? "Next" : "Add Box",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                if (editingIndex) {
                    let b = [...allBoxes];
                    b[editingIndex] = editingBox;
                    setBoxes(b);
                } else {
                    setBoxes([...allBoxes, editingBox]);
                }
                setSummaryScreen(true);
            }
        }
    };



    if (summaryScreen) {
        instruction = "Create and edit boxes";
        return (
            <ContentItem instruction={instruction} instructionNumber={instructionNumber} LeftButton={LeftButton} RightButton={RightButton} >
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allBoxes.map((val: BoxObject, index: number) => {
                                return (
                                    <BoxCell box={val} key={index} startEdit={startEdit(index)} />
                                )
                            })}

                            <NewBox startEdit={startEdit(-1)} />
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    } else {
        return (
            <CreateNewBox box={editingBox} LeftButton={LeftButton} RightButton={RightButton} updateBox={setEditingBox} instructionNumber={instructionNumber} />
        );
    }
};



export default BoxSize;


