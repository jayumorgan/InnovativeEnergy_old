import React, {Component} from 'react';


import logo from "../images/white-logo.png";

// Styles
import "./css/Header.scss";

class Header extends Component {

    handle_back() {
        console.log("Trigger back button...");
    }
    handle_stop() {
        console.log("Handlign stop....");
    }
    render() {
        return (
            <div className="HeaderGrid">
                <div className="HeaderLeft">
                    <div className="BackButton" onClick={this.handle_back}>
                        <span className="icon-arrow-left"></span>
                        <span id="button-text"> Back to App Launcher </span>
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
                    <div className="StopButton" onClick={this.handle_stop}>
                        <span> Stop </span>
                    </div>
                </div>
            </div>
        )
    }
}

export default Header;

