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

function JogIncrement() {
    return (
        <div className="JogIncrement">
            <input type="number" min="1" max="1000" />
            <span>
                mm
	    </span>
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
                <polyline id="ArrowLine" points={MakeTriangleCoordinates(dagger, frame_height, frame_width, scale)} stroke={stroke_color} fill="transparent" stroke-width={stroke_width} />
                <text id="ArrowText" x={text_x} y={text_y} font-size="20"> {text} </text>
            </svg>
        </div>
    );
};




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

    let pallet_name = "Pallet 1";

    return (
        <div className="JoggerContainer">
            <div className="JoggerInformation">
                <div className="PalletName">
                    <input type="text" name={input_name} onChange={handle_input} placeholder={pallet_name} />
                </div>
                <div className="MoveItemContainer">
                    <div className="MoveItem">
                        <div className="MoveTitle">
                            <span>
                                {"Distance"}
                            </span>
                        </div>
                        <div className="MoveInput">
                            <div className="InputContainer">
                                <input type="number" value={100} />
                            </div>
                            <div className="UnitContainer">
                                <span>
                                    mm
				</span>
                            </div>
                        </div>
                    </div>
                    <div className="MoveItem">
                        <div className="MoveTitle">
                            <span>

                                {"Speed"}
                            </span>
                        </div>
                        <div className="MoveInput">
                            <div className="InputContainer">
                                <input type="number" value={100} />
                            </div>
                            <div className="UnitContainer">
                                <span>
                                    mm/s
				</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                <svg width="500" height="500">
                    <g transform="scale(1,1)">
                        <rect width="100%" height="100%" />
                        <CrossHairs {...crossProps} />
                    </g>
                </svg>
            </div>
        </div>
    );
}


function PickLocationElement() {
    return (
        <div className="PickLocationGrid">
            <JoggerDisplay />
            <PickLocationMap />
        </div>
    );
}

interface PalletConfiguratorProps {
    close: () => void;
};

interface CurrentStepBarProps {
    completion_fraction: number;
};




function CurrentStepBar({ completion_fraction }: CurrentStepBarProps) {
    let style = {
        width: `${completion_fraction * 100
            }% `
    } as React.CSSProperties;
    return (
        <div className="CurrentStepBar">
            <div className="ProgressBar">
                <div className="ProgressBarFilled" style={style}>
                    <span>
                        1/5
		    </span>
                </div>
            </div>
        </div>
    );
}


function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.PICK_LOCATION);

    let [completionFraction, setCompletionFraction] = useState<number>(1 / 5);

    let ChildElement: ReactElement = (<></>);

    let instruction: string = "Instruction";

    switch (teachState) {
        case (PalletTeachState.PICK_LOCATION): {
            ChildElement = (<PickLocationElement />);
            instruction = "Move and select box pickup location";
            break;
        };
        case (PalletTeachState.PALLET_CORNERS): {
            break;
        };
        case (PalletTeachState.BOX_SIZE): {
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
            <div className="TeachModeContainer">
                <div className="TeachModeHeader">
                    <div className="StatusBar">
                        <div className="StatusBarTitle">
                            <span>
                                Pallet Configurator
			    </span>
                        </div>
                        <CurrentStepBar completion_fraction={completionFraction} />
                    </div>
                </div>
                <div className="InstructionLine">
                    <span>
                        {instruction}
                    </span>
                </div>
                {ChildElement}
            </div>
        </Modal>
    );
};

export default PalletConfigurator;



