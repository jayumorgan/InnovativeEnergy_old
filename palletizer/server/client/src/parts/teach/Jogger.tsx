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
}

interface JoggerProps {
    selectAction: (c: Coordinate) => void;
    updateName: (s: string) => void;
    name: string;
}


function Jogger({ selectAction, updateName, name }: JoggerProps) {
    // get the machine configuration...

    let directions: Directions[] = [
        Directions.UP,
        Directions.DOWN,
        Directions.LEFT,
        Directions.RIGHT
    ];

    let [speed, setSpeed] = useState<number>(100);
    let [distance, setDistance] = useState<number>(100);

    let networkConfig1 = {
        mode: NETWORK_MODE.static,
        machineIp: "192.168.0.3",
        machineNetmask: "255.255.255.0",
        machineGateway: "192.168.0.1"
    } as NetworkConfiguration;

    let networkConfig2 = {
        mode: NETWORK_MODE.static,
        machineIp: "192.168.0.2",
        machineNetmask: "255.255.255.0",
        machineGateway: "192.168.0.1"
    } as NetworkConfiguration;

    // Machine 1, Machine 2;
    let Controllers: TeachModeController[] = [];

    Controllers.push(new TeachModeController(networkConfig1, speed, distance));
    Controllers.push(new TeachModeController(networkConfig2, speed, distance));
    let MotionConfig: any = {
        "Z": {
            "DRIVE": 1,
            "MACHINE": 0,
            "REVERSE": true
        },
        "X": {
            "DRIVE": 1,
            "MACHINE": 1,
            "REVERSE": true
        },
        "Y": {
            "DRIVE": 3,
            "MACHINE": 0,
            "REVERSE": true
        }
    };


    let handleSpeed = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        Controllers.forEach((c: TeachModeController) => {
            c.setSpeed(val);
        })
        setSpeed(val);
    };

    let handleDistance = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        Controllers.forEach((c: TeachModeController) => {
            c.setDistance(val);
        })
        setDistance(val);
    };

    let handleMove = (d: Directions) => () => {
        switch (d) {
            case Directions.UP: {
                let controller_index = MotionConfig["Y"]["MACHINE"];
                let drive_index = MotionConfig["Y"]["DRIVE"];
                let reverse_bool = MotionConfig["Y"]["REVERSE"];
                let Controller = Controllers[controller_index];
                Controller.Move(drive_index, false);
                break;
            };
            case Directions.DOWN: {
                let controller_index = MotionConfig["Y"]["MACHINE"];
                let drive_index = MotionConfig["Y"]["DRIVE"];
                let reverse_bool = MotionConfig["Y"]["REVERSE"];
                let Controller = Controllers[controller_index];
                Controller.Move(drive_index, true);
                break;
            }
            case Directions.RIGHT: {
                let controller_index = MotionConfig["X"]["MACHINE"];
                let drive_index = MotionConfig["X"]["DRIVE"];
                let reverse_bool = MotionConfig["X"]["REVERSE"];
                let Controller = Controllers[controller_index];
                Controller.Move(drive_index, false);

                break;
            }
            case Directions.LEFT: {
                let controller_index = MotionConfig["X"]["MACHINE"];
                let drive_index = MotionConfig["X"]["DRIVE"];
                let reverse_bool = MotionConfig["X"]["REVERSE"];
                let Controller = Controllers[controller_index];
                Controller.Move(drive_index, true);
                break;
            }
        };

        getPositions();
    };

    let handleAMove = (dagger: boolean) => {
        let controller_index = MotionConfig["Z"]["MACHINE"];
        let drive_index = MotionConfig["Z"]["DRIVE"];
        let reverse_bool = MotionConfig["Z"]["REVERSE"];
        let Controller = Controllers[controller_index];
        Controller.Move(drive_index, dagger);
        getPositions();
    };

    let handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        updateName(newName);
    };

    let [currentPosition, setCurrentPosition] = useState<Coordinate>({ x: 0, y: 0, z: 0 });

    let getPositions = async () => {
        let position1 = await Controllers[0].getPosition();
        let position2 = await Controllers[1].getPosition();
        let positions = [position1, position2];

        let x_controller_index = MotionConfig["X"]["MACHINE"];
        let x_drive_index = MotionConfig["X"]["DRIVE"];

        let x_value = positions[x_controller_index][x_drive_index - 1];

        let y_controller_index = MotionConfig["Y"]["MACHINE"];
        let y_drive_index = MotionConfig["Y"]["DRIVE"];

        let y_value = positions[y_controller_index][y_drive_index - 1];

        let z_controller_index = MotionConfig["Z"]["MACHINE"];
        let z_drive_index = MotionConfig["Z"]["DRIVE"];

        let z_value = positions[z_controller_index][z_drive_index - 1];

        console.log(`x ${x_value} y ${y_value} z ${z_value}`);

        let position: Coordinate = {
            x: x_value,
            y: y_value,
            z: z_value
        };

        setCurrentPosition(position);
        return position;
    };


    let handleSelect = async () => {
        let pos = {
            x: 0, y: 0, z: 0
        } as Coordinate;
        let tmp = TEMP_JOGGER_INDEX % 3;
        if (tmp === 0) {
            pos.y = 1003;
        } else if (tmp === 1) {

        } else {
            pos.x = 1003;
        }

        TEMP_JOGGER_INDEX++;
        //  selectAction(pos);

        let position = await getPositions();

        selectAction(position);


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

    let { x, y, z } = currentPosition;

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
                            <span> {"x : " + String(x)} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"y : " + String(y)} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"z : " + String(z)} </span>
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
