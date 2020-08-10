import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


import { AxesDirections, TeachModeController, NetworkConfiguration, NETWORK_MODE } from "../../MachineMotion/MachineMotion";


import SolidArrow, { ROTATION } from "./SolidArrow";


import Up from "../images/up.png";
import Down from "../images/down.png";
import Left from "../images/left.png";
import Right from "../images/right.png";



import "./css/Jogger.scss";
import { Coordinate } from './structures/Data';

let TEMP_JOGGER_INDEX = 0;

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
        coordinates += `${x + 3},${y} `;
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
    let frame_height = 60;
    let frame_width = 110;
    let scale = 2 / 10;

    let move = () => {
        handleMove(dagger);
    };

    return (
        <div className="A" >
            <div className="Display" onClick={move}>
                <svg width={frame_width} height={frame_height}>
                    <polyline id="ArrowLine" points={MakeTriangleCoordinates(dagger, frame_height, frame_width, scale)} stroke={stroke_color} fill="transparent" strokeWidth={stroke_width} />

                </svg>
            </div>
        </div>
    );
};


interface JoggerParameterProps {
    title: string;
    unit: string;
    value: number;
    handleUpdate: (e: ChangeEvent) => void;
}


function JoggerParameter({ title, unit, value, handleUpdate }: JoggerParameterProps) {



    return (
        <div className="Parameter">
            <div className="Name">
                <span>
                    {title}
                </span>
                <span className="Units">
                    {"(" + unit + ")"}
                </span>
            </div>
            <div className="ParameterInput">
                <input type="number" value={value} onChange={handleUpdate} />
            </div>
        </div>
    );


    /* return (
     *     <div className="JoggerParameter">
     *         <div className="ParameterContainer">
     *             <div className="Title">
     *                 <span>
     *                     {title}
     *                 </span>
     *             </div>
     *             <div className="Input">
     *                 <input type="number" value={value} onChange={handleUpdate} />
     *             </div>
     *         </div>
     *     </div>
     * ); */
}

interface JoggerProps {
    selectAction: (c: Coordinate) => void;
    updateName: (s: string) => void;
    name: string;
}

function Jogger({ selectAction, updateName, name }: JoggerProps) {

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

    let handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        updateName(newName);
    };

    let handleSelect = () => {
        let pos = {
            x: 0, y: 0, z: 0
        } as Coordinate;
        let tmp = TEMP_JOGGER_INDEX % 3;
        if (tmp === 0) {
            pos.y = 100
        } else if (tmp === 1) {

        } else {
            pos.x = 100
        }
        TEMP_JOGGER_INDEX++;
        selectAction(pos);
        Controller.getPosition((positions: Coordinate) => {
            // selectAction(positions);
        });
    };

    let distanceParams: JoggerParameterProps = {
        title: "Jog Increment",
        unit: "mm",
        value: distance,
        handleUpdate: handleDistance,
    };

    let speedParams: JoggerParameterProps = {
        title: "Speed",
        unit: "mm",
        value: speed,
        handleUpdate: handleSpeed
    };

    let arrowSize = 120;
    return (
        <div className="Jogger">
            <div className="Name">
                <div className="NamePrompt">
                    <span>
                        {"Name:"}
                    </span>
                </div>
                <div className="NameInput">
                    <input type="text" value={name} onChange={handleName} />
                </div>
            </div>
            <div className="Controls">
                <div className="Position">
                    <div className="PositionBox">
                        <div className="PositionValue">
                            <span> {"x : 20"} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"y : 40"} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"z : 70"} </span>
                        </div>
                    </div>
                </div>
                <div className="Move">
                    <A dagger={true} handleMove={handleAMove} />
                    <div className="Mover">
                        <div className="MoverGrid">
                            <div className="Select">
                                <div className="SelectButton" onClick={handleSelect}>
                                    <span>
                                        {"Select"}
                                    </span>
                                </div>
                            </div>
                            <div className="Up" onClick={handleMove(Directions.UP)}>
                                <SolidArrow rotation={ROTATION.UP} size={arrowSize} />
                            </div>
                            <div className="Down" onClick={handleMove(Directions.DOWN)}>
                                <SolidArrow rotation={ROTATION.DOWN} size={arrowSize} />
                            </div>
                            <div className="Right" onClick={handleMove(Directions.RIGHT)}>
                                <SolidArrow rotation={ROTATION.RIGHT} size={arrowSize} />
                            </div>
                            <div className="Left" onClick={handleMove(Directions.LEFT)}>
                                <SolidArrow rotation={ROTATION.LEFT} size={arrowSize} />
                            </div>
                        </div>
                    </div>
                    <A dagger={false} handleMove={handleAMove} />
                </div>
            </div>
            <div className="Parameters">
                <JoggerParameter {...distanceParams} />
                <JoggerParameter {...speedParams} />
            </div>
        </div>
    );

};


export default Jogger;
