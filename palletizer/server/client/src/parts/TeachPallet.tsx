import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Modal from "./Modal";

import { PalletConfiguration, Pallet, PickLocation, Layer, Corner } from "../services/TeachMode";

//import {ConfigContext} from "../context/ConfigContext";

//import {ConfigState} from "../types/Types";

// Styles
// import "./css/Configuration.scss";
// import "./css/Login.scss";
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
            console.log("Right image");
        };
    };
    console.log(direction, image);
    return (
        <div className={direction}>
            <img src={image} />
        </div>
    );
};

enum PalletTeachState {
    PALLET_CORNERS,
    PICK_LOCATION,
    BOX_SIZE,
    LAYER_SETUP,
    ASSIGN_LAYOUT,
    SUMMARY
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
                <polyline id="ArrowLine" points={MakeTriangleCoordinates(dagger, frame_height, frame_width, scale)} stroke={stroke_color} fill="transparent" stroke-width={stroke_width} />
                <text id="ArrowText" x={text_x} y={text_y} font-size="20"> {text} </text>
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



function JoggerDisplay() {

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
                            <div className="SelectButton">
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
            <div className="CoordinateDisplay">
                {Object.keys(coordinates).map((key: string, index: number) => {
                    return (
                        <CoordinateItem axis={key} value={coordinates[key]} key={index} />
                    )
                })}
            </div>
            <div className="Map">
                <svg width="200" height="200">
                    <g transform="scale(1,1)">
                        <rect width="100%" height="100%" />
                        <CrossHairs {...crossProps} />
                    </g>
                </svg>
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
    return (
        <div className="PickLocationGrid">
            <JoggerDisplay />
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
    console.log(arr);
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
    value?: number;
};
function BoxSizeInput({ name, value }: BoxSizeInputProps) {
    value = value ? value : 10;
    return (
        <div className="BoxSizeInput">
            <span>
                {name}
            </span>
            <div className="InputHolder">
                <div>
                    <input type="number" value={value} />
                </div>
                <div className="NameContainer">
                    <span>
                        mm
		    </span>
                </div>
            </div>
        </div>
    );
};


function BoxSizeElement() {
    // Must have fixed width.
    let inputs = [
        "Length",
        "Width",
        "Height"
    ] as string[];

    return (
        <div className="BoxSizeGrid">
            <div className="BoxSizeDisplay">
                <span>
                    Box Size Display...
		</span>
            </div>
            <div className="BoxSizeInputContainer">
                {inputs.map((name: string, index: number) => {
                    return (<BoxSizeInput name={name} key={index} />)
                })}
            </div>
        </div>
    );
};







function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.PICK_LOCATION);

    let [completionFraction, setCompletionFraction] = useState<Fraction>({ n: 2, d: 5 } as Fraction);

    let ChildElement: ReactElement = (<></>);

    let handleNext = () => {
        // Linked list...
        switch (teachState) {
            case PalletTeachState.PICK_LOCATION: {
                setTeachState(PalletTeachState.BOX_SIZE);
                break;
            };
            case PalletTeachState.BOX_SIZE: {
                break;
            };
        };
    };


    let handleBack = () => {
        switch (teachState) {
            case PalletTeachState.BOX_SIZE: {
                setTeachState(PalletTeachState.PICK_LOCATION);
                break;
            }
        };
    };

    let instruction: string = "default instruction";

    switch (teachState) {
        case (PalletTeachState.PICK_LOCATION): {
            ChildElement = (<PickLocationElement />);
            instruction = "Move to box pick location and click select";
            break;
        };
        case (PalletTeachState.PALLET_CORNERS): {
            break;
        };
        case (PalletTeachState.BOX_SIZE): {
            ChildElement = (<BoxSizeElement />);
            instruction = "Enter the dimensions of the box"
            break;
        }
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
                            Back
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



