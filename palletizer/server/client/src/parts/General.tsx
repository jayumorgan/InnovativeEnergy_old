import React, { useContext, ChangeEvent, useState, ReactElement} from 'react';

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

// Logo image
import logo from "../images/vention_logo.png";


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


function ConfigCell({title , children} : StackProps ) {

    return (
        <div className="ConfigCell">
            <div className="ConfigTitle">
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
}



function ExecutePane({current_box, status} : ExecuteProps) {
    let config_context = useContext(ConfigContext);


    let {machine_configs, pallet_configs, machine_index, pallet_index} = config_context as ConfigState;
    

    let [start_box, set_start_box] = useState(current_box);
    let [machine_current_config, set_machine_current_config] = useState<string|null>(null);
    let [pallet_current_config, set_pallet_current_config] = useState<string|null>(null);
    

    let handle_input = (e: ChangeEvent) => {
        let value = Number((e.target as HTMLInputElement).value);
        set_start_box(value);
    };

    let box_title = "Start From Box";
    let machine_config_title = "Machine Configuration";
    let pallet_config_title = "Pallet Configuration";

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

    let handle_config_select = (machine : boolean) => (e : React.ChangeEvent) => {
        let file_name = (e.target as HTMLSelectElement).value;
        set_config(file_name, machine); // server request.
        set_machine_current_config(file_name);
    };
    
    return (
        <div className="ExecuteGrid">
            <ConfigCell title={machine_config_title} >
                <div className="ConfigItem">
                    <select onChange={handle_config_select(true)} value={machine_current_config ? machine_current_config : machine_configs[machine_index as number]}>
                        {machine_configs.map((item : string, index : number)=>{
                            return (<option value={item} key={index} > {item} </option>)
                        })}
                    </select>
                </div>
            </ConfigCell>
            <ConfigCell title={pallet_config_title}>
                <div className="ConfigItem">
                    <select onChange={handle_config_select(false)} value={pallet_current_config ? pallet_current_config : pallet_configs[pallet_index as number]}>
                        {pallet_configs.map((item : string, index : number)=>{
                            return (<option value={item} key={index} > {item} </option>)
                        })}
                    </select>
                </div>
            </ConfigCell>
            <ConfigCell title={box_title}>
                <div className="BoxStartItem">
                    <input type="text" name={box_title} onChange={handle_input} value={start_box} />
                </div>
            </ConfigCell>
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



interface StackProps {
    title : string;
    children: ReactElement;
}


function StackContainer( {title, children} : StackProps) {
    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span>
                    {title}
                </span>
            </div>
            {children}
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
            <div className="ExecuteContainer">
                <StackContainer title={"Execute"}>
                    <ExecutePane current_box={current_box} status={status} />
                </StackContainer>
            </div>
            <div className="StatusContainer">
                <StackContainer title={"System"}>
                    <StatusBar items={items} />
                </StackContainer>
            </div>
            <div className="VisualizerContainer">
                    <Visualizer />
                    <div className="LogoContainer">
                        <img src={logo} />
                    </div>
            </div>
            <div className="InformationContainer">
                <StackContainer title={"Information Console"}>
                    <ErrorLogContainer />
                </StackContainer>
            </div>
        </div>
    );

}


export default General;

