import React, { useState, ChangeEvent, useEffect } from 'react';
import JogController, { PalletizerAxes } from "../../jogger/Jogger";
// import SolidArrow, { ROTATION } from "./SolidArrow";
import { get_machine_config } from "../../requests/requests";
import { CoordinateRot } from "../../geometry/geometry";
import { SavedMachineConfiguration } from '../MachineConfig';
import { DIRECTION } from 'mm-js-api';
import PerspectiveJogger, { PerspectiveJoggerProps, PlaneArrowDirections } from "../PerspectiveJogger";

//---------------Styles + Images---------------
import "./css/Jogger.scss";

var TESTING = false;
if (process.env.REACT_APP_ENVIRONMENT === "DEVELOPMENT") {
    TESTING = true;
}
console.log((TESTING ? "In" : "Not in") + " Testing environment -- (Jogger -- set machine ips.)");

let TEMP_JOGGER_INDEX = 0;

interface JoggerParameterProps {
    title: string;
    unit: string;
    value: number;
    handleUpdate: (e: ChangeEvent) => void;
};

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

export interface ForceHomeProps {
    skip: () => void;
    jogController: JogController | null;
    hideDone?: boolean
};

export function ForceHome({ skip, jogController, hideDone }: ForceHomeProps) {

    const allAxes = [
        PalletizerAxes.X,
        PalletizerAxes.Y,
        PalletizerAxes.Z,
        PalletizerAxes.θ
    ];

    const handleHome = (axis: PalletizerAxes) => () => {
        if (jogController !== null) {
            jogController.startHome(axis).catch((e: any) => {
                console.log("Error handle home", e);
            })
        }
    };

    return (
        <div className="ForceHome">
            <div className="Description">
                {!(hideDone) &&
                    <span>
                        {"Home all axes before starting."}
                    </span>
                }
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
                {!(hideDone) &&
                    <div className="Skip" onClick={skip} >
                        <span>
                            {"Done"}
                        </span>
                    </div>
                }
            </div>
        </div>
    );
};

export interface JoggerProps {
    selectAction: (c: CoordinateRot) => void;
    updateName: (s: string) => void;
    machineConfigId: number;
    name: string;
    hideName?: boolean;
    savedMachineConfig?: SavedMachineConfiguration;
    Controller?: JogController;
};


export default function Jogger({ selectAction, updateName, name, machineConfigId, hideName, savedMachineConfig, Controller }: JoggerProps) {
    const [speed, setSpeed] = useState<number>(50);
    const [distance, setDistance] = useState<number>(50);
    const [currentPosition, setCurrentPosition] = useState<CoordinateRot>({ x: 0, y: 0, z: 0, θ: 0 });
    const [jogController, setJogController] = useState<JogController | null>(Controller ? Controller : null);

    const createJogger = (s: SavedMachineConfiguration) => {
        const { axes, machines } = s.config;
        const jc = new JogController(machines, axes, (p: any) => {
            setCurrentPosition(p as CoordinateRot);
        }); // amen.
        setJogController(jc);
        jc.getPosition();
    };

    useEffect(() => {
        if (Controller) {

            Controller.positionHandler = (p: any) => {
                setCurrentPosition(p as CoordinateRot);
            }
            Controller.getPosition();
            setJogController(Controller);
        } else if (savedMachineConfig) {
            console.log(savedMachineConfig);
            createJogger(savedMachineConfig);
        } else {
            get_machine_config(machineConfigId).then((mc: SavedMachineConfiguration) => {
                createJogger(mc);
            }).catch((e: any) => {
                console.log("Error get_machine_config", e);
            });
        }
    }, [machineConfigId, Controller, savedMachineConfig]);

    const handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        updateName(newName);
    };

    const handleSpeed = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        if (jogController !== null) {
            jogController.setJogSpeed(val).then(() => {
                setSpeed(val);
            }).catch((e: any) => {
                console.log(e);
            });
        } else {
            console.log("Jog controlelr not initialized");
        }
    };

    const handleDistance = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        if (jogController !== null) {
            jogController.setJogIncrement(val).then(() => {
                setDistance(val);
            }).catch((e: any) => {
                console.log(e);
            });
        } else {
            console.log("Jog controller not initialized");
        }
    };

    const jogCartesian = (d: PlaneArrowDirections) => {

        if (jogController === null) {
            console.log("Jog controller not initialized", jogController);
            return;
        }

        switch (d) {
            case (PlaneArrowDirections.FORWARD): { // + y
                jogController.startJog(PalletizerAxes.Y, DIRECTION.NORMAL).then(() => {
                }).catch((e: any) => {
                    console.log(e);
                });
                break;
            }
            case (PlaneArrowDirections.BACK): { //-y
                jogController.startJog(PalletizerAxes.Y, DIRECTION.REVERSE).then(() => {
                }).catch((e: any) => {
                    console.log(e);
                });
                break;
            }
            case (PlaneArrowDirections.RIGHT): { //+x
                jogController.startJog(PalletizerAxes.X, DIRECTION.NORMAL).then(() => {
                }).catch((e: any) => {
                    console.log(e);
                });
                break;
            }
            case (PlaneArrowDirections.LEFT): { // -x
                jogController.startJog(PalletizerAxes.X, DIRECTION.REVERSE).then(() => {
                }).catch((e: any) => {
                    console.log(e);
                });
                break;
            }
            case (PlaneArrowDirections.UP): { // +z (which is down)
                jogController.startJog(PalletizerAxes.Z, DIRECTION.REVERSE).catch((e: any) => {
                    console.log(e);
                });
                break;
            }
            case (PlaneArrowDirections.DOWN): { // -z (which is up)
                jogController.startJog(PalletizerAxes.Z, DIRECTION.NORMAL).catch((e: any) => {
                    console.log(e);
                });
                break;
            }
            default: {
                break;
            }
        }
    };

    const jogAngle = (angle: number) => {
        if (jogController === null) {
            console.log("Jog controller is null");
        } else {
            jogController.rotateToAngle(angle).then(() => {
                return jogController.getPosition();
            }).catch((e: any) => {
                console.log("Error rotate", e);
            });
        }
    };


    const handleSelect = async () => {
        if (!hideName) {
            if (!TESTING) {
                selectAction(currentPosition);
                return;
            }
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
        }
    };

    const distanceParams: JoggerParameterProps = {
        title: "Jog Increment",
        unit: "mm",
        value: distance,
        handleUpdate: handleDistance,
    };

    const speedParams: JoggerParameterProps = {
        title: "Speed",
        unit: "mm",
        value: speed,
        handleUpdate: handleSpeed
    };

    const { x, y, z, θ } = currentPosition;

    const perspectiveJoggerProps: PerspectiveJoggerProps = {
        handleCartesianMove: jogCartesian,
        handleRotateMove: jogAngle
    };

    return (
        <div className="Jogger">
            <div className="Name">
                {!(hideName) &&
                    <>
                        <div className="NamePrompt">
                            <span>
                                {"Name:"}
                            </span>
                        </div>
                        <div className="NameInput">
                            <input type="text" value={name} onChange={handleName} />
                        </div>
                    </>
                }
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
                <div className="Perspective">
                    {(jogController !== null) &&
                        <PerspectiveJogger {...perspectiveJoggerProps} />
                    }
                </div>
            </div>
            <div className="Parameters">
                <JoggerParameter {...distanceParams} />
                <div className="Select">
                    {(!hideName) &&
                        <div className="SelectButton" onClick={handleSelect}>
                            <span>
                                {"Select Point"}
                            </span>
                        </div>
                    }
                </div>
                <JoggerParameter {...speedParams} />
            </div>
        </div>
    );
};

