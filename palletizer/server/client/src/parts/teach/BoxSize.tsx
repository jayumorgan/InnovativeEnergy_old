import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

// 3D display of box.
import Box from "./3D/BoxRender";
import PlusIcon, { IconProps } from "./PlusIcon";

import { BoxObject, BoxDimensions } from "./structures/Data";

import "./css/BoxSize.scss";

//---------------Box Size---------------
enum DimensionEnum {
    L,
    W,
    H
};

interface BoxSizeInputProps {
    name: string;
    value: number;
    update: (val: number) => void;
};

function BoxSizeInput({ name, value, update }: BoxSizeInputProps) {
    let handle_update = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = (e.target.value as unknown) as number;
        update(val);
    };

    return (
        <div className="BoxSizeInput">
            <div className="InputHolder">
                <span>
                    {name}
                </span>
            </div>
            <div className="InputHolder">
                <input type="number" value={value} onChange={handle_update} />
            </div>
        </div>
    );
};



interface NewBoxCellProps {
    startEdit: () => void;
}


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
}

function DimensionCell({ axis, value }: DimensionCellProps) {

    return (
        <div className="DimensionCell">
            <span>
                {axis + ": "}
            </span>
            <input type="number" value={value} />
        </div>
    );
}

interface BoxProps {
    box: BoxObject;
};

function BoxCell({ box }: BoxProps) {
    let placeholder = box.name;
    let { width, length, height } = box.dimensions;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <Box width={width} height={height} length={length} />
                </div>
                <div className="BoxDetails">
                    <div className="BoxName">
                        <input type="text" placeholder="Box 1" value={box.name} />
                    </div>
                    <div className="BoxDimensions">
                        <DimensionCell axis={"Width"} value={width} />
                        <DimensionCell axis={"Length"} value={length} />
                        <DimensionCell axis={"Height"} value={height} />
                    </div>
                </div>
                <div className="Buttons">
                    <div className="EditButton">
                        <div className="Button">
                            <span>
                                {"Edit"}
                            </span>
                        </div>
                    </div>
                    <div className="DeleteButton">
                        <div className="Button">
                            <span>
                                {"Delete"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
/* 
 * function BoxCell({ width, height, length }: BoxDimensions) {
 *     return (
 *         <div className="BoxCellContainer">
 *             <div className="BoxCell">
 *                 <div className="MiniRender">
 *                     <Box width={width} height={height} length={length} />
 *                 </div>
 *                 <div className="BoxDetails">
 *                     <div className="BoxName">
 *                         <span>
 *                             {"Box 1"}
 *                         </span>
 *                     </div>
 *                     <div className="BoxDimensions">
 *                         <DimensionCell axis={"Width"} value={width} />
 *                         <DimensionCell axis={"Length"} value={length} />
 *                         <DimensionCell axis={"Height"} value={height} />
 *                     </div>
 *                 </div>
 *                 <div className="Buttons">
 *                     <div className="EditButton">
 *                         <div className="Button">
 *                             <span>
 *                                 {"Edit"}
 *                             </span>
 *                         </div>
 *                     </div>
 *                     <div className="DeleteButton">
 *                         <div className="Button">
 *                             <span>
 *                                 {"Delete"}
 *                             </span>
 *                         </div>
 *                     </div>
 *                 </div>
 *             </div>
 *         </div>
 * 	
 *     );
 * } */

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


// New Box Cell -- pretty eacy to setup.
// Cool





function BoxSize({ allBoxes }: BoxSizeProps) {
    // Must have fixed width.
    let inputs = [
        "Length (mm)",
        "Width (mm)",
        "Height (mm)"
    ] as string[];

    let l_name = "Length (mm)";
    let h_name = "Height (mm)";
    let w_name = "Width (mm)";

    let [boxDim, setBoxDim] = useState<BoxDimensions>({ length: 10, width: 10, height: 10 });

    let [summaryScreen, setSummaryScreen] = useState<boolean>(true);

    let startEdit = () => {
        setSummaryScreen(false);
    };

    let update_dim = (dimension: DimensionEnum) => (val: number) => {
        console.log("Updating dimension", val);
        let newDim = { ...boxDim } as BoxDimensions;
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
        setBoxDim(newDim);
    };
    let instruction: string;
    if (summaryScreen) {
        instruction = "Create and edit boxes";
        return (
            <ContentItem instruction={instruction}>
                <SummaryScreen allBoxes={allBoxes} startEdit={startEdit} />
            </ContentItem>
        );
    } else {
        instruction = "Enter box dimensions";
        return (
            <ContentItem instruction={instruction} >
                <div className="BoxContent">
                    <div className="ConfigurationName">
                    </div>
                    <div className="BoxSizeGrid">
                        <div className="BoxDisplay">
                            <Box {...boxDim} />
                        </div>
                        <div className="BoxSizeContainer">
                            <div className="BoxSizeInputContainer">
                                <BoxSizeInput name={l_name} value={boxDim.length} update={update_dim(DimensionEnum.L)} />
                                <BoxSizeInput name={h_name} value={boxDim.height} update={update_dim(DimensionEnum.H)} />
                                <BoxSizeInput name={w_name} value={boxDim.width} update={update_dim(DimensionEnum.W)} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};



export default BoxSize;


