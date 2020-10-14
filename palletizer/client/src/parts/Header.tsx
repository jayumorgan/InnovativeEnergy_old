import React, { useContext, useState, useEffect } from 'react';
import { ConfigContext } from '../context/ConfigContext';
import { ConfigState } from '../types/Types';
import { get_machine_config } from '../requests/requests';
import { SavedMachineConfiguration } from './MachineConfig';
import MM, { MachineMotionConfig } from "mm-js-api";
import mqtt from "mqtt";
import { v4 as uuidv4 } from 'uuid';

//---------------Styles---------------
import "./css/Header.scss";
//---------------Images---------------
import logo from "../images/white-logo.png";
import { ReactComponent as StopIcon } from "./images/danger.svg";
import { MachineMotion } from './machine_config/MachineMotions';


var TESTING = false;

if (process.env.REACT_APP_ENVIRONMENT === "DEVELOPMENT") {
    TESTING = true;
}

function Header() {
    const { machine_index } = useContext(ConfigContext) as ConfigState;
    const [MMs, setMMs] = useState<MM[]>([] as MM[]);
    const [eStopped, seteStopped] = useState<boolean>(false);

    useEffect(() => {
        get_machine_config(machine_index).then((smc: SavedMachineConfiguration) => {
            const { machines } = smc.config;

            const mms: MM[] = machines.map((m: MachineMotion) => {

                let machine_ip = TESTING ? "127.0.0.1" : m.ipAddress;
                let mqtt_uri = "ws://" + machine_ip + ":" + String(9001) + "/";
                let options: any = {
                    clientId: "Header-" + uuidv4()
                };

                let mqttClient: mqtt.Client = mqtt.connect(mqtt_uri, options);

                let config: MachineMotionConfig = {
                    machineIP: machine_ip,
                    serverPort: 8000,
                    mqttPort: 9001,
                    mqttClient
                };
                // Check reminder.
                let mm: MM = new MM(config);

                mm.bindEstopEvent((estop: boolean) => {
					console.log("Estop event from header", estop);
                    seteStopped(estop);
                });
                return mm;
            });
            setMMs(mms);
        }).catch((e: any) => {
            console.log("Error get machine config: ", e);
        });
    }, [machine_index]);



    const handle_back = () => {
        console.log("handle_back");
    };

    const handle_stop = () => {
        MMs.forEach((m: MM) => {
            m.triggerEstop().catch((e: any) => {
                console.log("Failed to trigger estop.", e);
            });
        });
    };

    return (
        <div className="HeaderGrid">
            <div className="HeaderItem">
                <div className="BackButton" onClick={handle_back}>
                    <span className="icon-arrow-left"></span>
                    <span id="button-text"> {"Back to App Launcher"} </span>
                </div>
            </div>
            <div className="HeaderItem">
                <div className="HeaderLogo">
                    <img src={logo} alt="Vention Logo" />
                    <span id="title">
                        {"Palletizer MachineApp"}
                    </span>
                </div>
            </div>
            <div className="HeaderItem">
                <div className="StopButton" onClick={handle_stop}>
                    <StopIcon />
                    <span> {eStopped ? "Estop Engaged" : "Estop"} </span>
                </div>
            </div>
        </div>
    );
};

export default Header;

