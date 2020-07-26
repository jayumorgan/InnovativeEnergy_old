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

    let stroke_color = "rgb(22,35,56)";
    let stroke_width = 5;
    let frame_height = 50;
    let frame_width = 200;

    let scale = 2 / 10;

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
            <div className="JoggerContainerInner">
                <div className="JoggerRaiseLower">
                    <svg width={frame_width} height={frame_height}>
                        <polyline id="ArrowLine" points={MakeTriangleCoordinates(true, frame_height, frame_width, scale)} stroke={stroke_color} fill="transparent" stroke-width={stroke_width} />
                        <text id="ArrowText" x={frame_width / 2 - 30} y={frame_height - 10} font-size="20"> Raise </text>
                    </svg>
                </div>


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
                <div className="JoggerRaiseLower">
                    <svg width={frame_width} height={frame_height}>
                        <polyline id="ArrowLine" points={MakeTriangleCoordinates(false, frame_height, frame_width, scale)} stroke={stroke_color} fill="transparent" stroke-width={stroke_width} />
                        <text id="ArrowText" x={frame_width / 2 - 30} y={0 + 17} font-size="20"> Lower </text>
                    </svg>
                </div>
            </div>
        </div>
    );
};

/* <div className="JoggerCircle">
 * </div>
 *  */

function PickLocationElement() {
    return (
        <div className="PickLocationGrid">
            <JoggerDisplay />
            <span>
                "Here is the pick location element."
	    </span>
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
        width: `${completion_fraction * 100}%`
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



