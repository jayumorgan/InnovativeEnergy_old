import React, { useContext, useState } from 'react';

import {ConfigContext} from "../context/ConfigContext";

import {ConfigState} from "../types/Types";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";


interface ConfigCellProps {
    title: string;
}

function ConfigCell({title} : ConfigCellProps) {

    let handle_edit = () => {
        console.log("Edit config " + title);
    };

    let handle_delete = () => {
        console.log("Delete config " + title);
    };
    
    return (
        <div className="ConfigCell">
            <span> {title} </span>
            <div className="EditConfigButton" onClick={handle_edit}>
                <span> Edit </span>
            </div>
            <div className="DeleteConfigButton" onClick={handle_delete}>
            <span className="icon-delete">
            </span>
                <span id="button-text">
                    Delete
                </span>
            </div>
        </div>
    );
}


interface ConfigContainerProps {
    title: string;
    configs: string[];
}


function ConfigContainer(props: ConfigContainerProps) {

    let {title, configs} = props;

    let handle_add = ()=>{
        console.log("Handle: Add " + title);
    };
    
    return(
        <div className="ConfigContainer">
            <div className="ConfigTitle">
                <span> {title} </span>
            </div>
            <div className="ConfigScroll" >
                {configs.map((title, index)=>{
                    return (<ConfigCell title={title} key={index} />)
                })}
            </div>
            <div className="ConfigAdd" >
                <div className="AddConfigButton" onClick={handle_add} >
                    <span> {"Add " + title.toLowerCase()} </span>
                </div>
            </div>
        </div>
    );
}


interface EditorProps {
    file_name : string;
    title : string;
}


function Editor({file_name, title} : EditorProps) {
    return (
        <div className="Editor">
            <div className="EditorTitle">
                <span>
                    {"Edit " + title + ": " + file_name}
                </span>
            </div>
        </div>
    );
}



function Configuration() {

    let config_context = useContext(ConfigContext);

    let {machine_configs, pallet_configs} = config_context as ConfigState; 

    var [editor, set_editor] = useState("CONFIG"); // CONFIG, MACHINE, PALLET

    let [pallet_title, machine_title] = ["Pallet Configuration", "Machine Configuration"];

    switch (editor) {
        case "MACHINE" : {
            return (
                <Editor title={pallet_title} file_name={"temp"}/>
            );
        };
        case "PALLET": {
            return (
                <Editor title={machine_title} file_name={"temp"}/>
            );
        };
        default : {
            return (
                <div className="ConfigGrid">
                    <div className="PalletConfig">
                        <ConfigContainer title={pallet_title} configs={pallet_configs} />
                    </div>
                    <div className="MachineConfig">
                        <ConfigContainer title={machine_title} configs={machine_configs} />
                    </div>
                </div>
            );
        };
    }
}

export default Configuration;
