import React, {useContext, ChangeEvent, useState, Fragment} from 'react';


import {MQTTControl} from "../mqtt/MQTT";
// Context
import {PalletizerContext} from "../context/PalletizerContext";
import {ConfigContext} from "../context/ConfigContext";

//Types
import {ConfigState, PalletizerState} from "../types/Types";


import Visualizer from "./Visualizer";

// Styles
import "./css/General.scss";

// import logo from "../images/vention_logo.png";

// MQTT Control
var control = MQTTControl();

// Support Functions:
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


// Status Item Interfaces...
interface StatusItem {
    title: string;
    value: any;
}

interface StatusContainerProps {
    status_items: StatusItem[];
}

function StatusContainer(props: StatusContainerProps) {
    let {status_items} = props;
    let container_classes = ["TopL", "TopR", "BotL", "BotR"];
    return (
            <div className="StackContainer">
                <div className="StackTitle" >
                    <span>
                    {"System Status"}
                    </span>
                </div>
            <div className="StatusBlock">
                <div className="StatusGrid" >
                    {status_items.map((item, index)=>{
                        return(
                            <div className={container_classes[index]} key={index}>
                                    <span>
                                        {item.title}
                                    </span>
                                    <div className="StatusValue">
                                        <span>
                                            {item.value}
                                        </span>
                                    </div>
                            </div>
                        )})}
                </div>
            </div>
        </div>
    );
}


// Error Logs

interface ErrorLogProps {
    time: Date;
    description: string;
}


function ErrorLog(props: ErrorLogProps) {
    let {time, description} = props;
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


// Temporary interface for quick error test...
interface Temp {
    date: Date;
    description: string;
}


function Information() {
    let errors = [] as Temp[];
    for (let i = 0; i < 15; i++){
        let date = new Date();
        let description = "./"+String(i)+" Segmentation fault (core dumped)";
        let item = {"date": date, description: description};
        errors.push(item);
    }
    return(
        <div className="StackContainer" >
            <div className="StackTitle">
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

interface SelectCellProps {
    title: string;
    options: string[];
}

function SelectCell(props: SelectCellProps) {
    let {title, options} = props;
    return(
        <Fragment >
            <span id="SelectCellTitle"> {title} </span>
            <select>
            {options.map((item, index)=>{
                return (<option value={item} key={index} > {item} </option>)
            })}
            </select>
        </Fragment>
    );
}


interface ExecuteProps {
    current_box: number;
    pallet_configs: string[];
    machine_configs: string[];
};


function Execute({current_box, machine_configs, pallet_configs} : ExecuteProps) {

    let [start_box, set_start_box] = useState(current_box);

    let handle_input = (e: ChangeEvent) => {
        let value = Number((e.target as HTMLInputElement).value);
        set_start_box(value);
    };
    
    let icons = ["icon-play", "icon-pause", "icon-stop"];

    let stop_button = ()=>{
        let {stop} = control;
        stop();
    };
    
    let pause_button = ()=>{
        let {pause} = control;
        pause();
    };
    
    let start_button = ()=>{
        let {start} = control;
        start();
    };
    
    
    let input_title = "Start from box";
    
    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span> {"Execute"} </span>
            </div>
            <div className="ExecuteGrid">
                <div className="ELeft">
                    <SelectCell title={"Machine Configuration"} options={machine_configs}/>
                    <div className={"ControlButton start"} onClick={start_button} >
                        <span className={icons[0]}> </span>
                        <span id="button-text">{"Start"}</span>    
                    </div>
                </div>
                <div className="EMid">
                    <SelectCell title={"Pallet Configuration"} options={pallet_configs}/>
                    <div className={"ControlButton"}  onClick={pause_button}>
                        <span className={icons[1]}> </span>
                        <span id="button-text">{"Pause"}</span>    
                    </div>
                </div>
                <div className="ERight">
                        <span id="SelectCellTitle"> {input_title} </span>
                        <input type="text" name={input_title} onChange={handle_input} value={start_box} />
                    <div className={"ControlButton"} onClick={stop_button} >
                        <span className={icons[2]}> </span>
                        <span id="button-text">{"Stop"}</span>    
                    </div>
                </div>
            </div>
        </div>
    );
}


function General() {
    let palletizer_context = useContext(PalletizerContext);
    let config_context = useContext(ConfigContext);


    let {status, cycle, total_box, current_box, time } = palletizer_context as PalletizerState;
    let {machine_configs, pallet_configs} = config_context as ConfigState; 
    
    let items = [] as StatusItem[];
    items.push({
        title: "Status",
        value: status
    });
    items.push({
        title: "Cycle Count",
        value: String(cycle)
    });
    items.push({
        title: "Current Box",
        value: `${current_box} of ${total_box}`
    });
    items.push({
        title: "Time To Completion",
        value: `${time} Hours`
    });

    return (
        <div className="GridContainer" >
            <div className="TopLeft" >
            <Visualizer />
            </div>
            <div className="TopRight">
                <StatusContainer status_items={items} />
            </div>
            <div className="BottomLeft">
            <Execute current_box={current_box} machine_configs={machine_configs} pallet_configs={pallet_configs}/>
            </div>
            <div className="BottomRight">
                <Information />
            </div>
        </div> 
    );
}

// In the top left: 
                // <div className="ImageContainer" >
                //     <img src={logo} alt="Vention Logo" />
                // </div>

export default General;
