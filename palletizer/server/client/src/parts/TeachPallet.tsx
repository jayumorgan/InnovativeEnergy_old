import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Modal from "./Modal";

import { PalletConfiguration, Pallet, PickLocation, Layer, Corner } from "../services/TeachMode";


// 3D display of box.
import Box, { BoxDimensions } from "./BoxDisplay";
import PalletRender from "./PalletRender";


import "./css/TeachMode.scss";
import "./css/Jogger.scss";
import "./css/BoxSize.scss";


import Up from "./images/up.png";
import Down from "./images/down.png";
import Left from "./images/left.png";
import Right from "./images/right.png";

enum Directions {
    UP = "Up",
    DOWN = "Down",
    LEFT = "Left",
    RIGHT = "Right"
};

interface ArrowImageProps {
    direction: Directions;
};

function ArrowImage({ direction }: ArrowImageProps) {
    let image: string;
    switch (direction) {
        case (Directions.UP): {
            image = Up;
            break;
        };
        case (Directions.DOWN): {
            image = Down;
            break;
        };
        case (Directions.LEFT): {
            image = Left;
            break;
        };
        case (Directions.RIGHT): {
            image = Right;
            break;
        };
    };
    return (
        <div className={direction}>
            <img src={image} />
        </div>
    );
};


function MakeTriangleCoordinates(up: boolean, height: number, width: number, scale: number): string {
    let coordinates: string = "";

    let s_h = height * scale;
    let s_w = height * scale;

    width -= s_w;
    height -= s_h;

    for (let i = 0; i < 3; i++) {
        let x = (i / 2) * width + ((i % 2 === 0) ? ((i === 0) ? s_w / 2 : -s_w / 2) : 0);
        let y = i % 2 === 0 ? (up ? height - s_h / 2 : 0 + s_h / 2) : (up ? 0 + s_h / 2 : height - s_h / 2);
        coordinates += `${x},${y} `;
    }

    return coordinates;
};

interface AProps {
    dagger: boolean;
};


function A({ dagger }: AProps) {
    let stroke_color = "rgb(22,35,56)";
    let stroke_width = 5;
    let frame_height = 50;
    let frame_width = 200;
    let scale = 2 / 10;

    let text = (dagger) ? "Raise" : "Lower";
    let text_x = frame_width / 2 - 30;
    let text_y = (dagger) ? frame_height - 10 : 0 + 15;

    return (
        <div className="JoggerRaiseLower">
            <svg width={frame_width} height={frame_height}>
                <polyline id="ArrowLine" points={MakeTriangleCoordinates(dagger, frame_height, frame_width, scale)} stroke={stroke_color} fill="transparent" strokeWidth={stroke_width} />
                <text id="ArrowText" x={text_x} y={text_y} fontSize="20"> {text} </text>
            </svg>
        </div>
    );
};


interface JoggerParameterProps {
    title: string;
    value: number;
}


function JoggerParameter({ title, value }: JoggerParameterProps) {

    return (
        <div className="JoggerParameter">
            <div className="ParameterContainer">
                <div className="Title">
                    <span>
                        {title}
                    </span>
                </div>
                <div className="Input">
                    <input type="number" value={value} />
                </div>
            </div>
        </div>
    );
}

interface JoggerProps {
    selectAction: () => void;
}

function JoggerDisplay({ selectAction }: JoggerProps) {

    let directions: Directions[] = [
        Directions.UP,
        Directions.DOWN,
        Directions.LEFT,
        Directions.RIGHT
    ];

    let input_name = "PalletName";
    let handle_input = (e: ChangeEvent) => {
        // let value = Number((e.target as HTMLInputElement).value);
        // set_start_box(value);
    };

    return (
        <div className="JoggerCentering">
            <div className="JoggerContainerInner">
                <A dagger={true} />
                <div className="JoggerCircleContainer">
                    <div className="JoggerCircle">
                        <div className="SelectPointButton">
                            <div className="SelectButton" onClick={selectAction}>
                                <span>
                                    SELECT
				</span>
                            </div>
                        </div>
                        {directions.map((d: Directions, index: number) => {
                            return (
                                <ArrowImage direction={d} key={index} />
                            )
                        })}
                    </div>
                </div>
                <A dagger={false} />
            </div>
            <div className="JoggerParameters">
                <JoggerParameter title={"Distance (mm)"} value={110} />
                <JoggerParameter title={"Speed (mm/s)"} value={120} />
            </div>
        </div>
    );
};

/* <div className="JoggerCircle">
 * </div>
 *  */

interface CoordinateItemProps {
    axis: string;
    value: number;
};

function CoordinateItem({ axis, value }: CoordinateItemProps) {

    return (
        <div className="Coordinate">
            <span className="Axis">
                {axis.toUpperCase() + " :"}
            </span>
            <span className="Value">
                {value}
            </span>
        </div>
    );
}

interface CrossHairProps {
    scale: number;
    x: number; // Percent
    y: number; // Percent
};

function CrossHairs({ scale, x, y }: CrossHairProps) {
    let size = scale * 10;

    let x_c = `${x}%`;
    let y_c = `${y}%`;

    let fif = "50%";
    let sev = "75%";
    let twe = "25%";

    let line_1 = {
        x1: fif,
        y1: sev,
        x2: fif,
        y2: twe
    } as any;

    let line_2 = {
        x1: twe,
        x2: sev,
        y1: fif,
        y2: fif
    } as any;

    return (
        <svg height={size * 4} width={size * 4} x={x_c} y={y_c}>
            <g transform="scale(1,1)">
                <circle cx={fif} cy={fif} r={"15%"} />
                <line {...line_1} />
                <line {...line_2} />
            </g>
        </svg>
    );
};


function PickLocationMap() {

    let coordinates = {
        x: 20,
        y: 10,
        z: 400
    } as { [key: string]: number };

    // Normalize the coordinates;

    let crossProps = {
        scale: 2,
        x: 50,
        y: 50
    } as CrossHairProps;

    return (
        <div className="PickLocationMap">
            <div className="Map">
                <svg width="200" height="200">
                    <g transform="scale(1,1)">
                        <rect width="100%" height="100%" />
                        <CrossHairs {...crossProps} />
                    </g>
                </svg>
            </div>
            <div className="CoordinateDisplay">
                {Object.keys(coordinates).map((key: string, index: number) => {
                    return (
                        <CoordinateItem axis={key} value={coordinates[key]} key={index} />
                    )
                })}
            </div>
        </div>
    );
}

/* 
 * <div className="PalletTitle">
 * <input type="text" name={input_name} onChange={handle_input} placeholder={pallet_seq_name} />
 * </div>
 *  */

function PickLocationElement() {

    let pallet_seq_name = "Pallet Sequence 1";
    let input_name = "PalletSequenceTitle";

    let handle_input = (c: ChangeEvent) => {
        console.log("Handle change pallet seq name.");
    };

    let selectAction = () => {
        console.log("Jogger Position Selected");
    };
    return (
        <div className="PickLocationGrid">
            <JoggerDisplay selectAction={selectAction} />
            <PickLocationMap />
        </div>
    );
    //    <PickLocationMap />
}

interface PalletConfiguratorProps {
    close: () => void;
};

interface CurrentStepBarProps {
    fraction: Fraction;
};


interface DotProps {
    complete: boolean;
}

function CompletionDot({ complete }: DotProps) {

    let circle_id = complete ? "complete" : "incomplete";

    return (
        <svg height="15" width="15">
            <g transform="scale(1,1)">
                <circle cx="50%" cy="50%" r="50%" id={circle_id} />
            </g>
        </svg>
    );
};


function CompletionDots({ fraction }: CurrentStepBarProps) {
    let arr = new Array(fraction.d).fill(null).map((_, i) => i + 1);

    return (
        <div className="StatusBarCompletion">
            <div className="CompletionContainer">
                {arr.map((index: number) => {
                    return (<CompletionDot complete={index <= fraction.n} key={index} />)
                })}
            </div>
        </div>
    );
}

interface Fraction {
    n: number;
    d: number;
};

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

function BoxSizeElement() {
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


//---------------Pallet Corners---------------



enum Corners {
    ONE,
    TWO,
    THREE
};


function PalletCorners() {

    let [cornerNumber, setCornerNumber] = useState<Corners>(Corners.ONE); // ()

    let title = "Select Corner " + String(cornerNumber as number + 1);
    let selectAction = () => {
        if (cornerNumber === Corners.THREE) {
            console.log("Done");
        } else {
            setCornerNumber(cornerNumber as number + 1);
        }
    };

    let backAction = () => {
        if (cornerNumber !== Corners.ONE) {
            setCornerNumber(cornerNumber as number - 1);
        }
    };


    return (
        <div className="PickLocationGrid">
            <JoggerDisplay selectAction={selectAction} />
            <div className="PalletDisplay">
                <div className="PalletDisplayHeader">
                    <div className="CornerBackButton">
                        {(cornerNumber as number > 0) &&
                            <div className="BackButton" onClick={backAction}>
                                <span>
                                    {"Back"}
                                </span>
                            </div>
                        }
                    </div>
                    <div className="CenterText">
                        <span>
                            {title}
                        </span>
                    </div>
                </div>
                <div className="DisplayContainer">
                    <PalletRender cornerNumber={cornerNumber as number} />
                </div>
            </div>
        </div>
    );
};


enum PalletTeachState {
    PICK_LOCATION, // 0
    BOX_SIZE,
    PALLET_CORNERS,
    ASSIGN_LAYOUT,
    LAYER_SETUP,
    SUMMARY
};


function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.PALLET_CORNERS);

    let [completionFraction, setCompletionFraction] = useState<Fraction>({ n: teachState + 1, d: 5 } as Fraction);


    let ChildElement: ReactElement = (<></>);

    let handleNext = () => {
        let state = teachState;
        setTeachState(++teachState);
        setCompletionFraction({ n: completionFraction.n + 1, d: completionFraction.d });
    };

    let handleBack = () => {
        console.log(teachState, "teach state");
        if (teachState > 0) {
            let state = teachState;
            console.log(state, "State 1");
            setTeachState(--teachState);
            console.log(state, "State 2");
            setCompletionFraction({ n: completionFraction.n - 1, d: completionFraction.d });
        } else {
            close();
        }
    };

    let instruction: string = "default instruction";

    switch (teachState) {
        case (PalletTeachState.PICK_LOCATION): {
            ChildElement = (<PickLocationElement />);
            instruction = "Move to box pick location and click select";
            break;
        };
        case (PalletTeachState.BOX_SIZE): {
            ChildElement = (<BoxSizeElement />);
            instruction = "Enter the dimensions of the box"
            break;
        }
        case (PalletTeachState.PALLET_CORNERS): {
            ChildElement = (<PalletCorners />);
            instruction = "Move to and select three pallet corners";
            break;
        };
        case (PalletTeachState.LAYER_SETUP): {
            break;
        }
        case (PalletTeachState.ASSIGN_LAYOUT): {
            break;
        }
        case (PalletTeachState.SUMMARY): {
            break;
        }
        default: {
            console.log("Default Pallet Configurator Case -- unhandled");

        }
    };


    return (
        <Modal close={close}>
            <div className="TeachContainer">
                <div className="TeachModeHeader">
                    <div className="TeachButton" onClick={handleBack}>
                        <span>
                            {((teachState === PalletTeachState.PICK_LOCATION) ? "Close" : "Back")}
                        </span>
                    </div>
                    <div className="StatusBar">
                        <div className="StatusBarTitle">
                            <span>
                                Pallet Configurator
			    </span>
                        </div>
                        <CompletionDots fraction={completionFraction} />
                    </div>
                    <div className="TeachButton" onClick={handleNext}>
                        <span>
                            Next
			</span>
                    </div>
                </div>
                <div className="TeachModeInstruction">
                    <span>
                        {instruction.toLowerCase()}
                    </span>
                </div>
                <div className="TeachModeContent">
                    {ChildElement}
                </div>
            </div>
        </Modal>
    );
};

export default PalletConfigurator;



