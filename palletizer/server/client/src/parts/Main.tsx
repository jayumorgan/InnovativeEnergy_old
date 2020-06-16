import React, {useContext, ChangeEvent, useState, Fragment} from 'react';

// MQTT
import {MQTTControl} from "../mqtt/MQTT";

// Context
import {PalletizerContext} from "../context/PalletizerContext";
import {ConfigContext} from "../context/ConfigContext";

// Types
import {ConfigState, PalletizerState} from "../types/Types";

// Components
import Visualizer from "./Visualizer";

// Styles
import "./css/Main.scss";


var control = MQTTControl();



interface ExecuteProps {
    current_box : number;
    status: string;
}


function ExecutePane({current_box, status} : ExecuteProps) {
    let config_context = useContext(ConfigContext);
    
    let {machine_configs} = config_context as ConfigState; 

    let [start_box, set_start_box] = useState(current_box);

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
    
    return (
        <div className="ExecuteGrid">
            <div className="ConfigTitle">
                <span>{config_title}</span>
            </div>
            <div className="ConfigItem">
                <select>
                    {machine_configs.map((item: string, index:number)=>{
                        return (<option value={item} key={index} > {item} </option>)
                    })}
                </select>
            </div>
            <div className="BoxStartTitle">
                <span>{box_title}</span>
            </div>
            <div className="BoxStartItem">
                <input type="text" name={box_title} onChange={handle_input} value={start_box} />
            </div>
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
                        <span>{item.title}</span>
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
            <div className="InformationPane">
            </div>
        </div>
    );
}


export default General;

