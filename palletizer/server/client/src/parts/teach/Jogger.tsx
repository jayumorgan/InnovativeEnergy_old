import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


import Up from "../images/up.png";
import Down from "../images/down.png";
import Left from "../images/left.png";
import Right from "../images/right.png";

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

function Jogger({ selectAction }: JoggerProps) {

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


export default Jogger;
