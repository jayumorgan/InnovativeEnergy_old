import React, {useContext, ChangeEvent, useState} from 'react';

// MQTT
import {MQTTControl} from "../mqtt/MQTT";

// Context
import {PalletizerContext} from "../context/PalletizerContext";
import {ConfigContext} from "../context/ConfigContext";

// Requests
import {set_config} from "../requests/requests";

// Types
import {ConfigState, PalletizerState} from "../types/Types";

// Components
import Visualizer from "./Visualizer";

// Styles
import "./css/General.scss";


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

interface ExecuteProps {
    current_box : number;
    status: string;
}


function ExecutePane({current_box, status} : ExecuteProps) {
    let config_context = useContext(ConfigContext);
    
    let {configurations, current_index} = config_context as ConfigState; 

    let [start_box, set_start_box] = useState(current_box);
    let [current_config, set_current_config] = useState<string|null>(null);

    let handle_input = (e: ChangeEvent) => {
        let value = Number((e.target as HTMLInputElement).value);
        set_start_box(value);
    };

    let box_title = "Start from box";
    let config_title = "Configuration";

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

    let is_running : boolean = (status === "Running");

    let start_icon = is_running ? icons[1] : icons[0];

    let start_fn = is_running ? pause_button : start_button;

    let start_text = is_running ? "Pause" : "Start";

    let handle_config_select = (e : React.ChangeEvent) => {
        let file_name = (e.target as HTMLSelectElement).value;
        // set_current_config(file_name);
        set_config(file_name); // server request.
        set_current_config(file_name);
    };
    
    return (
        <div className="ExecuteGrid">
            <div className="ConfigCell">
                <div className="ConfigTitle">
                    <span>{config_title}</span>
                </div>
                <div className="ConfigItem">
            <select onChange={handle_config_select} value={current_config ? current_config : configurations[current_index as number]}>
                        {configurations.map((item : string, index : number)=>{
                            return (<option value={item} key={index} > {item} </option>)
                        })}
                    </select>
                </div>
            </div>
            <div className="ConfigCell">
                <div className="BoxStartTitle">
                    <span>{box_title}</span>
                </div>
                <div className="BoxStartItem">
                    <input type="text" name={box_title} onChange={handle_input} value={start_box} />
                </div>
            </div>
            <div className="ButtonGrid">
                <div className="StartButton">
                <div className="ButtonContainer" onClick={start_fn}>
                        <span className={start_icon}> </span>
                <span id="button-text">{start_text}</span>    
                    </div>
                </div>
                <div className="StopButton">
                <div className="ButtonContainer" onClick={stop_button}>
                        <span className={icons[2]}> </span>
                <span id="button-text">{"Stop"}</span>    
                    </div>
                </div>
            </div>
        </div>
    );
}




interface StatusBarProps {
    items: StatusItem[];
}

function StatusBar({items} : StatusBarProps) {
    return (
        <div className="StatusBar">
            {items.map((item: StatusItem, index: number)=>{
                return (
                    <div className="StatusItem" key={index}>
                        <span>{item.title.toUpperCase()}</span>
                        <div className="StatusValue">
                            <span>
                                {item.value}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}


interface ErrorLogProps {
    date: Date;
    description: string;
}


function ErrorLog({date, description}: ErrorLogProps) {

    let hours = date.getHours();
    let minutes = date.getMinutes();
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
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

function ErrorLogContainer() {
    
    let errors = [] as ErrorLogProps[];
    
    for (let i = 0; i < 15; i++){
        let date = new Date();
        let description = "./"+String(i)+" Segmentation fault (core dumped)";
        let item = {"date": date, description: description} as ErrorLogProps;
        errors.push(item);
    }

    return (
        <div className="ErrorLogContainer">
            {errors.map((err : ErrorLogProps, index : number) => {
                return (<ErrorLog {...err} key={index} />)
            })}
        </div>
    );
}


interface StatusItem {
    title: string;
    value: any;
}

function General () {
    
    let palletizer_context = useContext(PalletizerContext);

    let {status, cycle, total_box, current_box, time } = palletizer_context as PalletizerState;
    
    let items = [] as StatusItem[];

    items.push({
        title: "Status",
        value: status
    });
    items.push({
        title: "Cycle",
        value: String(cycle)
    });
    items.push({
        title: "Current Box",
        value: `${current_box} of ${total_box}`
    });
    items.push({
        title: "Time Remaining",
        value: `${time} Hours`
    });

    return (
        <div className="GeneralGrid">
            <div className="SystemContainer">
                <div className="StackContainer">
                    <div className="StackTitle">
                        <span>
                            {"System Status"}
                        </span>
                    </div>
                    <div className="SystemGrid">
                        <StatusBar items={items} />
                        <Visualizer />
                        <ExecutePane status={status} current_box={current_box}/>
                    </div>
                </div>
            </div>
            <div className="InformationContainer">
                <div className="StackContainer">
                    <div className="StackTitle">
                        <span>
                            {"Information Console"}
                        </span>
                    </div>
                    <ErrorLogContainer />
                </div>
            </div>
        </div>
    );
}


export default General;

