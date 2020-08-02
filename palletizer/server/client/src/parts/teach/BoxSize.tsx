
import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';



// 3D display of box.
import Box, { BoxDimensions } from "../BoxDisplay";

//---------------Box Size---------------

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


enum DimensionEnum {
    L,
    W,
    H
};

function BoxSize() {
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
};


export default BoxSize;