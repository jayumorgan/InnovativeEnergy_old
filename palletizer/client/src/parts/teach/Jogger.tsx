import React, { useState, ChangeEvent, useEffect } from 'react';

import JogController, { PalletizerAxes } from "../../jogger/Jogger";

import SolidArrow, { ROTATION } from "./SolidArrow";

import { get_machine_config } from "../../requests/requests";

import { CoordinateRot } from "../../geometry/geometry";

//---------------Styles + Images---------------
import "./css/Jogger.scss";
import clockwise from "./images/clockwise.svg";
import counterclockwise from "./images/counterclockwise.svg";
import { SavedMachineConfiguration } from '../MachineConfig';
import { DIRECTION } from 'mm-js-api';


var TESTING = false;
if (process.env.REACT_APP_ENVIRONMENT === "DEVELOPMENT") {
    TESTING = true;
}
console.log((TESTING ? "In" : "Not in") + " Testing environment -- (Jogger -- set machine ips.)");

let TEMP_JOGGER_INDEX = 0;

enum Directions {
    UP = "Up",
    DOWN = "Down",
    LEFT = "Left",
    RIGHT = "Right"
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
};


interface ForceHomeProps {
    skip: () => void;
    jogController: JogController | null;
};

function ForceHome({ skip, jogController }: ForceHomeProps) {

    const allAxes = [
        PalletizerAxes.X,
        PalletizerAxes.Y,
        PalletizerAxes.Z,
        PalletizerAxes.θ
    ];

    const handleHome = (axis: PalletizerAxes) => () => {
        if (jogController !== null) {
            jogController.startHome(axis).then(() => {

            }).catch((e: any) => {
                console.log("Error handle home", e);
            })
        }
    };

    return (
        <div className="ForceHome">
            <div className="Description">
                <span>
                    {"Home all axes before starting."}
                </span>
            </div>
            <div className="HomeButtons">
                {allAxes.map((axis: PalletizerAxes, index: number) => {
                    return (
                        <div className="HomeButton" key={index} onClick={handleHome(axis)} >
                            <span>
                                {"Home " + String(axis) + " Axis"}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="SkipButton">
                <div className="Skip" onClick={skip} >
                    {"Done"}
                </div>
            </div>
        </div>
    );
};

interface JoggerProps {
    selectAction: (c: CoordinateRot) => void;
    updateName: (s: string) => void;
    machineConfigId: number;
    name: string;
};

function Jogger({ selectAction, updateName, name, machineConfigId }: JoggerProps) {

    const [forcedHome, setForcedHome] = useState<boolean>(true);
    const [speed, setSpeed] = useState<number>(50);
    const [distance, setDistance] = useState<number>(50);
    const [currentPosition, setCurrentPosition] = useState<CoordinateRot>({ x: 0, y: 0, z: 0, θ: 0 });
    const [jogController, setJogController] = useState<JogController | null>(null);

    useEffect(() => {
        get_machine_config(machineConfigId).then((mc: SavedMachineConfiguration) => {
            let { axes, machines } = mc.config;
            let jc = new JogController(machines, axes, (p: any) => {
                let position = p as CoordinateRot;
                setCurrentPosition(position);
            });
            setJogController(jc);
        }).catch((e: any) => {
            console.log("Error get_machine_config", e);
        });
    }, [machineConfigId]);

    let handleSpeed = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        if (jogController !== null) {
            jogController.setJogSpeed(val).then(() => {
                setSpeed(val);
            }).catch((e: any) => {
                console.log(e);
            });
        }
    };

    let handleDistance = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        if (jogController !== null) {
            jogController.setJogIncrement(val).then(() => {
                setDistance(val);
            }).catch((e: any) => {
                console.log(e);
            });
        }
    };

    let handleMove = (d: Directions) => () => {
        if (jogController === null) {
            console.log("Jog controller not initialized");
            return;
        } else {
            switch (d) {
                case Directions.UP: {
                    jogController.startJog(PalletizerAxes.Y, DIRECTION.NORMAL).then(() => {
                    }).catch((e: any) => {
                        console.log(e);
                    });
                    break;
                };
                case Directions.DOWN: {
                    jogController.startJog(PalletizerAxes.Y, DIRECTION.REVERSE).then(() => {
                    }).catch((e: any) => {
                        console.log(e);
                    });
                    break;
                };
                case Directions.RIGHT: {
                    jogController.startJog(PalletizerAxes.X, DIRECTION.NORMAL).then(() => {
                    }).catch((e: any) => {
                        console.log(e);
                    });
                    break;
                };
                case Directions.LEFT: {
                    jogController.startJog(PalletizerAxes.X, DIRECTION.REVERSE).then(() => {
                    }).catch((e: any) => {
                        console.log(e);
                    });
                    break;
                };
            };
        };
    };

    let handleAMove = (dagger: boolean) => {
        if (jogController !== null) {
            jogController.startJog(PalletizerAxes.Z, dagger ? DIRECTION.NORMAL : DIRECTION.REVERSE).then(() => {
            }).catch((e: any) => {
                console.log(e);
            });
        }
    };

    let handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        updateName(newName);
    };

    let handleSelect = async () => {
        if (TESTING) {
            // This makes a 1000 x 1000 pallet centered at 2500,2500, z.
            let pos = {
                x: 2000, y: 2000, z: 4000, θ: 0
            } as CoordinateRot;
            let tmp = TEMP_JOGGER_INDEX % 3;
            if (tmp === 0) {
                pos.y = 3000;
            } else if (tmp === 1) {

            } else {
                pos.x = 3000;
            }
            TEMP_JOGGER_INDEX++;
            selectAction(pos);
        } else {
            // Make sure this is valid -- should check again.
            selectAction(currentPosition);
        }
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

    let { x, y, z, θ } = currentPosition;
    // Rotate will be finicky if jogger reloads.

    let handleRotate = () => {
        if (jogController !== null) {
            jogController.startRotation(θ <= 90).then(() => {
                console.log("Rotate jogger -- test after type change.");
            }).catch((e: any) => {
                console.log("Error rotate ", e);
            });
        }
    };

    if (forcedHome) {
        const skip = () => {
            setForcedHome(false);
        };
        const forcedProps: ForceHomeProps = {
            skip,
            jogController
        };
        return (
            <ForceHome {...forcedProps} />
        );
    }

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
                            <span> {"x : " + String(Math.round(x))} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"y : " + String(Math.round(y))} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"z : " + String(Math.round(z))} </span>
                        </div>
                        <div className="PositionValue">
                            <span> {"θ : " + (θ ? "90°" : "0°")} </span>
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
                                        {"Save"}
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
                            <div className="Rotate" onClick={handleRotate}>
                                <img src={θ ? clockwise : counterclockwise} />
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
