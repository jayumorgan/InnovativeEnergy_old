import React, {Component} from 'react';


// Styles
import "./css/General.scss";

import logo from "../images/vention_logo.png";


interface StatusItem {
    title: string;
    get_function(): any;
}


interface DisplayItemProps {
    item: StatusItem;
}

class DisplayItem extends Component<DisplayItemProps> {
    render() {
        let {item} = this.props;
        item.title = item.title.toUpperCase();
        return (
            <div className="StatusItem">
                <span>
                    {item.title}
                </span>
                <div className="StatusValue">
                    <span>
                        {item.get_function()}
                    </span>
                </div>
            </div>
        );
    }
}


interface StatusContainerProps {
    status_items: StatusItem[];
}

class StatusContainer extends Component<StatusContainerProps>{
    render() {
        let {status_items} = this.props;
        return (
            <div className="StatusContainer">
                <img src={logo} alt="Vention Logo" />
                <div className="Status">
                    <div className="StatusTitle" >
                        <span>
                        {"System Status"}
                        </span>
                    </div>
                    <div className="StatusBlock" >
                        {status_items.map((item, index)=>{
                            return(<DisplayItem item={item} key={index} />)
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

function get_status() {
    return "Running";
}

function cycle_count(){
    return "23";
}

function current_box(){
    return "1 of 32";
}

function time_to_completion(){
    return "100 Hours";
}

class General extends Component {
    render() {
        let items = [] as StatusItem[];
        items.push({title: "Status", get_function: get_status});
        items.push({title: "Cycle Count", get_function: cycle_count});
        items.push({title: "Current Box", get_function: current_box});
        items.push({title: "Time To Completion", get_function: time_to_completion});
        return(
            <div className="GeneralContainer">
                <StatusContainer status_items={items} />
            </div>
        );
    }
}


export default General;
