import React from 'react';


import {estop_request} from "./requests/requests";
// Logo image import..
import logo from "../images/white-logo.png";

// Styles
import "./css/Header.scss";


function Header() {
    let handle_back = function() {
        console.log("Trigger back button...");
    };
    let handle_stop = function() {
        estop_request();
    };
    return (
        <div className="HeaderGrid">
            <div className="HeaderLeft">
                <div className="BackButton" onClick={handle_back}>
                    <span className="icon-arrow-left"></span>
                    <span id="button-text"> {"Back to App Launcher"} </span>
                </div>
            </div>
            <div className="HeaderCenter">
                <div className="HeaderLogo">
                    <img src={logo} alt="Vention Logo" />
                    <span id="title">
                        {"Palletizer MachineApp"}
                    </span>
                </div>
            </div>
            <div className="HeaderRight">
                <div className="StopButton" onClick={handle_stop}>
                    <span> {"Stop"} </span>
                </div>
            </div>
        </div>
    );
}

export default Header;
