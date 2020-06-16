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
}


function ExecutePane({current_box} : ExecuteProps) {
    let config_context = useContext(ConfigContext);
    
    let {machine_configs} = config_context as ConfigState; 


    let [start_box, set_start_box] = useState(current_box);

    let handle_input = (e: ChangeEvent) => {
        let value = Number((e.target as HTMLInputElement).value);
        set_start_box(value);
    };

    let input_title = "Start from box:";

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
    
    return (
        <div className="ExecuteGrid">
            <div className="ConfigItem">
                <span id="SelectTitle">{"Configuration:"}</span>
                <select>
                    {machine_configs.map((item: string, index:number)=>{
                        return (<option value={item} key={index} > {item} </option>)
                    })}
                </select>
            </div>
            <div className="BoxItem">
                <span id="SelectTitle">{input_title}</span>
                <input type="text" name={input_title} onChange={handle_input} value={start_box} />
            </div>
            <div className="StartButton">
                <div className="ButtonContainer">
                    <span className={icons[0]}> </span>
                    <span id="button-text">{"Start"}</span>    
                </div>
            </div>
            <div className="StopButton">
                <div className="ButtonContainer">
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
                <ExecutePane current_box={current_box}/>

                </div>
                </div>
            </div>
            <div className="InformationPane">
            </div>
        </div>
    );
}


export default General;

