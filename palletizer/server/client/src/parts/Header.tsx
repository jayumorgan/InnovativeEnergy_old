import React from 'react';

// Logo image import..
import logo from "../images/white-logo.png";

// Styles
import "./css/Header.scss";

import {ReactComponent as StopIcon} from "./images/danger.svg";


function Header() {
    let handle_back = function() {
        console.log("Handle Back Button");
    };

    let handle_stop = function() {
        console.log("Handle ESTOP.");
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
                    <span> {"Stop"} </span>
                </div>
            </div>
        </div>
    );
}

export default Header;

