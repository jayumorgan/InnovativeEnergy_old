import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


import { AxesDirections, TeachModeController, NetworkConfiguration, NETWORK_MODE } from "../../MachineMotion/MachineMotion";

import Up from "../images/up.png";
import Down from "../images/down.png";
import Left from "../images/left.png";
import Right from "../images/right.png";


import "./css/Jogger.scss";
import { Coordinate } from './structures/Data';

enum Directions {
    UP = "Up",
    DOWN = "Down",
    LEFT = "Left",
    RIGHT = "Right"
};

let networkConfig = {
    mode: NETWORK_MODE.static,
    machineIp: "192.168.7.2",
    machineNetmask: "255.255.255.0",
    machineGateway: "192.168.0.1"
} as NetworkConfiguration;


interface ArrowImageProps {
    direction: Directions;
    handleClick: () => void;
};

function ArrowImage({ direction, handleClick }: ArrowImageProps) {
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
        <div className={direction} onClick={handleClick}>
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
    handleMove: (dagger: boolean) => void;
};


function A({ dagger, handleMove }: AProps) {
    let stroke_color = "rgb(22,35,56)";
    let stroke_width = 5;
    let frame_height = 50;
    let frame_width = 200;
    let scale = 2 / 10;

    let text = (dagger) ? "Raise" : "Lower";
    let text_x = frame_width / 2 - 30;
    let text_y = (dagger) ? frame_height - 10 : 0 + 15;

    let move = () => {
        handleMove(dagger);
    };


    return (
        <div className="JoggerRaiseLower" onClick={move}>
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
    handleUpdate: (e: ChangeEvent) => void;
}


function JoggerParameter({ title, value, handleUpdate }: JoggerParameterProps) {

    return (
        <div className="JoggerParameter">
            <div className="ParameterContainer">
                <div className="Title">
                    <span>
                        {title}
                    </span>
                </div>
                <div className="Input">
                    <input type="number" value={value} onChange={handleUpdate} />
                </div>
            </div>
        </div>
    );
}

interface JoggerProps {
    selectAction: (c: Coordinate) => void;
}

function Jogger({ selectAction }: JoggerProps) {


    let directions: Directions[] = [
        Directions.UP,
        Directions.DOWN,
        Directions.LEFT,
        Directions.RIGHT
    ];



    let [speed, setSpeed] = useState<number>(100);
    let [distance, setDistance] = useState<number>(100);

    let Controller = new TeachModeController(networkConfig, speed, distance);

    let handleSpeed = (e: ChangeEvent) => {
        let val: number = (e.target as any).value;
        setSpeed(+val);
    };

    let handleDistance = (e: ChangeEvent) => {
        let val: number = (e.target as any).value;
        setDistance(+val);
    };

    let handleMove = (d: Directions) => () => {
        switch (d) {
            case Directions.UP: {
                Controller.Move(AxesDirections.Y, true);
                break;
            };
            case Directions.DOWN: {
                Controller.Move(AxesDirections.Y, false);
                break;
            }
            case Directions.RIGHT: {
                Controller.Move(AxesDirections.X, true);
                break;
            }
            case Directions.LEFT: {
                Controller.Move(AxesDirections.X, false);
                break;
            }
        };
    };

    let handleAMove = (dagger: boolean) => {
        Controller.Move(AxesDirections.Z, dagger);
    };


    let handleSelect = () => {
        Controller.getPosition((positions: Coordinate) => {
            selectAction(positions);
        });
    };

    return (
        <div className="JoggerCentering">
            <div className="JoggerContainerInner">
                <A dagger={true} handleMove={handleAMove} />
                <div className="JoggerCircleContainer">
                    <div className="JoggerCircle">
                        <div className="SelectPointButton">
                            <div className="SelectButton" onClick={handleSelect}>
                                <span>
                                    SELECT
				</span>
                            </div>
                        </div>
                        {directions.map((d: Directions, index: number) => {
                            return (
                                <ArrowImage direction={d} handleClick={handleMove(d)} key={index} />
                            )
                        })}
                    </div>
                </div>
                <A dagger={false} handleMove={handleAMove} />
            </div>
            <div className="JoggerParameters">
                <JoggerParameter title={"Distance (mm)"} value={distance} handleUpdate={handleDistance} />
                <JoggerParameter title={"Speed (mm/s)"} value={speed} handleUpdate={handleSpeed} />
            </div>
        </div>
    );
};


export default Jogger;
