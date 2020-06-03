import React, {Component} from 'react';


import logo from "../images/white-logo.png";

// Styles
import "./css/Header.scss";


class BackButton extends Component {
    handle_back() {
        console.log("Trigger back button...");
    }
    render() {
        return (
            <div className="BackButton" onClick={this.handle_back}>
                <span> Back to App Launcher </span>
            </div>
        )
    }
}


class StopButton extends Component {
    handle_stop() {
        console.log("Trigger Estop...");
    }

    render() {
        return (
            <div className="StopButton" onClick={this.handle_stop}>
                <span> Stop </span>
            </div>
        );
    }
}

class HeaderLogo extends Component {
    render() {
        return(
            <div className="HeaderLogo">
                <img src={logo} alt="Vention Logo" />
                <span id="title">
                    {"Palletizer MachineApp"}
                </span>
            </div>
        )
    }
}



class Header extends Component {
    render() {
        return (
            <div className="Header">
                <BackButton />
                <HeaderLogo />
                <StopButton />
            </div>
        )
    }
}

export default Header;

