
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

function SummaryScreen({ allBoxes }: SummaryScreenProps) {

    if (allBoxes.length === 0) {
        return (
            <div className="BoxSummary">
                <div className="AddBoxButton">
                    <span>
                        {"Add A New Box"}
                    </span>
                </div>
            </div>
        );

    } else {

        return (
            <div className="BoxSummary">
                <span>
                    Stuff
		</span>

            </div>
        );

    }


}

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


