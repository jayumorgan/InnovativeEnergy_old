
import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';



// 3D display of box.
import Box, { BoxDimensions } from "./3D/BoxRender";


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

interface SummaryScreenProps {
    allBoxes: BoxDimensions[];
}


interface IconProps {
    height: number;
    width: number;
}

function PlusIcon({height, width} : IconProps) {
    let line_1 = {
        x1: "50%",
        y1: "0%",
        x2: "50%",
        y2: "100%"
    } as any;

    let line_2 = {
        x1: "0%",
        x2: "100%",
        y1: "50%",
        y2: "50%"
    } as any;

    return (
        <svg height={height} width={width}>
            <g transform="scale(1,1)">
                <line {...line_1} />
                <line {...line_2} />
            </g>
        </svg>
    );
}

function NewBoxCell() {
    let iconSize = {
	height: 50,
	width: 50
    } as IconProps;
    
    return (
        <div className="BoxCellContainer">
            <div className="NewBoxCell">
                <div className="Icon">
                    <PlusIcon {...iconSize}/>
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
    axis : string;
    value : number;
}

function DimensionCell({axis, value} : DimensionCellProps) {

    return (
	<div className="DimensionCell">
	    <span>
		{axis + ": " + String(value)}
	    </span>
	</div>
    );
}


function BoxCell({width, height, length} : BoxDimensions) {
    return (
	<div className="BoxCellContainer">
	    <div className="BoxCell">
		<div className="MiniRender">
		    <Box width={width} height={height} length={length} />
		</div>
		<div className="BoxDetails">
		    <div className="BoxName">
			<span>
			    {"Box 1"}
			</span>
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
}

function SummaryScreen({ allBoxes }: SummaryScreenProps) {
    
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
		    <NewBoxCell />
		    {allBoxes.map((val: BoxDimensions, index: number)=>{
			return (
			    <BoxCell {...val}/>
			)
		    })}
                </div>
            </div>
        </div>
    );
};

interface BoxSizeProps {
    allBoxes: BoxDimensions[];
}



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
    //    setInstruction(summaryScreen ? "View and Edit Boxes" : "Enter box dimensions");

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



    

    if (summaryScreen) {
        return (
            <SummaryScreen allBoxes={allBoxes} />
        );
    } else {
        return (
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
        );
    }
};



export default BoxSize;


