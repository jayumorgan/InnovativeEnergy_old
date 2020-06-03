import React, {Component} from 'react';


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


class Header extends Component {
    render() {
        return (
            <div className="Header">
                <BackButton />
                <span>
                Palletizer MachineApp 
                </span>
                <StopButton />
            </div>
        )
    }
}

export default Header;

