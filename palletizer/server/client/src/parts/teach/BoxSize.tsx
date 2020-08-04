import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

// 3D display of box.
import Box from "./3D/BoxRender";
import PlusIcon, { IconProps, XIcon } from "./PlusIcon";

import PickLocation from "./PickLocation";


import { BoxObject, BoxDimensions } from "./structures/Data";

import "./css/BoxSize.scss";

//---------------Box Size---------------
enum DimensionEnum {
    L,
    W,
    H
};

interface NewBoxCellProps {
    startEdit: () => void;
};

function NewBoxCell({ startEdit }: NewBoxCellProps) {
    let iconSize = {
        height: 50,
        width: 50
    } as IconProps;

    return (
        <div className="BoxCellContainer">
            <div className="NewBoxCell" onClick={startEdit}>
                <div className="Icon">
                    <PlusIcon {...iconSize} />
                </div>
                <div className="BoxName">
                    <span>
                        {"Add A New Box"}
                    </span>
                </div>
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
};


function BoxCell({ box }: BoxProps) {
    let placeholder = box.name;

    let [dimensions, setDimensions] = useState<BoxDimensions>(box.dimensions);

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

        console.log("Updating dimensions -- update BoxObject");
        setDimensions(newDim);
    };


    let iconSize = 30;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <Box {...dimensions} />
                </div>
                <div className="BoxDetails">
                    <div className="BoxName">
                        <input type="text" placeholder="Box 1" value={box.name} />
                    </div>
                    <div className="BoxDimensions">
                        <DimensionCell axis={"Width"} value={width} update={update_dim(DimensionEnum.W)} />
                        <DimensionCell axis={"Length"} value={length} update={update_dim(DimensionEnum.L)} />
                        <DimensionCell axis={"Height"} value={height} update={update_dim(DimensionEnum.H)} />
                    </div>
                </div>
                <div className="Buttons">
                    <div className="EditButton">
                        <div className="ButtonContainer">
                            <div className="Button">
                                <span>
                                    {"Select Pick Location"}
                                </span>
                            </div>
                        </div>
                        <div className="PickLocation">
                            <div className="Location">
                                <span>
                                    {"x: " + String(x)}
                                </span>
                            </div>
                            <div className="Location">
                                <span>
                                    {"y: " + String(y)}
                                </span>
                            </div>
                            <div className="Location">
                                <span>
                                    {"z: " + String(z)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="DeleteButton">
                        <XIcon height={iconSize} width={iconSize} />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SummaryScreenProps {
    allBoxes: BoxObject[];
    startEdit: () => void;
}

function SummaryScreen({ allBoxes, startEdit }: SummaryScreenProps) {
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    <NewBoxCell startEdit={startEdit} />
                    {allBoxes.map((val: BoxObject, index: number) => {
                        return (
                            <BoxCell box={val} />
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

interface BoxSizeProps {
    allBoxes: BoxObject[];
}


function BoxSize({ allBoxes }: BoxSizeProps) {
    // Must have fixed width.
    let [summaryScreen, setSummaryScreen] = useState<boolean>(true);

    let startEdit = () => {
        setSummaryScreen(false);
    };

    let instruction: string;
    if (summaryScreen) {
        instruction = "Create and edit boxes";
        return (
            <ContentItem instruction={instruction}>
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            <NewBoxCell startEdit={startEdit} />
                            {allBoxes.map((val: BoxObject, index: number) => {
                                return (
                                    <BoxCell box={val} />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    } else {
        return (
            <PickLocation />
        );
    }
};



export default BoxSize;


