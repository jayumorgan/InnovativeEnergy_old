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
                <div className="StatusImageContainer">
                    <img src={logo} alt="Vention Logo" />
                </div>
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

interface ErrorLogProps {
    time: Date;
    description: string;
}

function make_time_string(hours:number, minute:number) : string {
    let hour_string = String(hours);
    let minute_string = minute < 10 ? `0${minute}` : String(minute);
    return hour_string + ":" + minute_string;
}

function make_date_string(day: number, month: number, year: number){
    month += 1;
    let day_string = day < 10 ? `0${day}` : String(day);
    let month_string = month < 10 ? `0${month}` : String(month);
    let year_string = String(year);
    return year_string + "/" + month_string + "/" + day_string;
}

class ErrorLog extends Component<ErrorLogProps> {
    render() {
        let {time, description} = this.props;
        let hours = time.getHours();
        let minutes = time.getMinutes();
        let day = time.getDate();
        let month = time.getMonth();
        let year = time.getFullYear();
        let date_string =  make_date_string(day, month, year);
        let time_string = make_time_string(hours, minutes);
        return (
            <div className="ErrorLog">
                <div className="ErrorLogDate">
                    <span>{time_string}</span>
                <span id="DateString"> {date_string} </span>
                </div>
                <span>
                {description}
                </span>
                <div className="ErrorDismiss">
                    <span>
                        {"Dismiss"}
                    </span>
                </div>
            </div>
        );
    }
}


interface Temp {
    date: Date;
    description: string;
}

class Information extends Component {
    render(){
        let errors = [] as Temp[];
        for (let i = 0; i < 15; i++){
            let date = new Date();
            let description = "./"+String(i)+" Segmentation fault (core dumped)";
            let item = {"date": date, description: description};
            errors.push(item);
        }
        return(
            <div className="InformationContainer" >
                <div className="StatusTitle">
                    <span> {"Information Console"} </span>
                </div>
                <div className="ErrorLogContainer">
                {errors.map((item, index)=>{
                    return (<ErrorLog time={item.date} description={item.description} key={index} /> )
                })}
                </div>
            </div> 
        );
    }
}

interface SelectCellProps {
    title: string;
    options: string[];
}

class SelectCell extends Component<SelectCellProps> {
    
    render() {
        let {title, options} = this.props;
        return(
            <div className="SelectCell" >
                <span> {title} </span>
                <select>
                {options.map((item, index)=>{
                    return (<option value={item} key={index} > {item} </option>)
                })}
                </select>
            </div>
        );
    }
}

interface InputCellProps {
    title: string;
}

class InputCell extends Component<InputCellProps> {
    render() {
        let {title} = this.props;
        return(
            <div className="SelectCell" >
                <span> {title} </span>
                <input type="text" name={title} />
            </div>
        );
    }
}


interface ControlButtonProps {
    button_type: string;
}

class ControlButton extends Component<ControlButtonProps> {
    render() {
        let {button_type} = this.props;
        button_type = button_type.toUpperCase();
        let title : string;
        let color: string;
        let icon: string;
        switch(button_type){
            case "START": {
                color = " start";
                title = "START";
                icon = "icon-play";
                break;
            }
            case "PAUSE": {
                color = "";
                title = "PAUSE";
                icon = "icon-pause";
                break;
            }
            case "STOP":{
                color = "";
                title = "STOP"
                icon = "icon-stop";
                break;
            }
            default:{
                title = "STOP";
                color = "";
                icon = "icon-stop";
                break;
            }
        }
        
        return (
            <div className={"ControlButton" + color}>
                <span className={icon}> </span>
                <span id="button-text">{title} </span>    
            </div>
        );
    }
}


class MachineControls extends Component {
    render() {
        let buttons = ["Start", "Pause", "Stop"];
        return (
            <div className="MachineControls" >
                {buttons.map((name, index)=>{
                    return (<ControlButton button_type={name} key={index} />)
                })}
                </div>
        )
    }
}



class Execute extends Component {
    render() {
        let select_options = {
            "Machine Configuration": ["configuration 1", "configuration 2", "configuration 3"],
            "Pallet Configuration": ["pallet 1", "pallet 2", "pallet 3"],
        } as any;
        let input_title = "Start from box";
        return (
            <div className="ExecuteContainer">
                <div className="StatusTitle">
                    <span> {"Execute"} </span>
                </div>
                {Object.keys(select_options).map((title, index)=>{
                    let options = select_options[title];
                    return (<SelectCell title={title} options={options} key={index}/> )
                })}
                <InputCell title={input_title} />
                <MachineControls />
            </div>
        );
    }
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
                <div className="BottomContainer" >
                <Execute />
                <Information />
                </div>
            </div>
        );
    }
}


export default General;
