import React, { useContext, useState } from 'react';

import {ConfigContext} from "../context/ConfigContext";

import {ConfigState} from "../types/Types";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";
import "./css/Editor.scss";

// Editor should be a popup.


interface ConfigCellProps {
    file_name: string;
    start_editor(fn:string) : any;
}

function ConfigCell({file_name, start_editor} : ConfigCellProps) {

    let handle_edit = () => {
        console.log("Edit config " + file_name);
        start_editor(file_name);
    };

    let handle_delete = () => {
        console.log("Delete config " + file_name);
    };
    
    return (
        <div className="ConfigCell">
            <span> {file_name} </span>
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
    start_editor(fn: string) : any;
}


function ConfigContainer(props: ConfigContainerProps) {

    let {title, configs, start_editor} = props;

    let handle_add = ()=>{
        console.log("Handle: Add " + title);
    };

    
    return(
        <div className="ConfigContainer">
            <div className="ConfigTitle">
                <span> {title} </span>
            </div>
            <div className="ConfigScroll" >
                {configs.map((file_name, index)=>{
                    return (<ConfigCell file_name={file_name} key={index} start_editor={start_editor} />)
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
    close_editor(): any
}


function Editor({file_name, title, close_editor} : EditorProps) {
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

    let file_name = "";

    let start_pallet_editor = (fn : string) => {
        file_name = fn;
        set_editor("PALLET");
    };

    let start_machine_editor = (fn: string) => {
        file_name = fn;
        set_editor("MACHINE");
    }

    let close_editor = ()=>{
        // Save the file in the editor.
        set_editor("CONFIG");
    };
    
    switch (editor) {
        case "MACHINE" : {
            return (
                <Editor title={pallet_title} file_name={"temp"} close_editor={close_editor}/>
            );
        };
        case "PALLET": {
            return (
                <Editor title={machine_title} file_name={"temp"} close_editor={close_editor}/>
            );
        };
        default : { // ie. case : "CONFIG"
            return (
                <div className="ConfigGrid">
                    <div className="PalletConfig">
                    <ConfigContainer title={pallet_title} configs={pallet_configs} start_editor={start_pallet_editor} />
                    </div>
                    <div className="MachineConfig">
                    <ConfigContainer title={machine_title} configs={machine_configs} start_editor={start_machine_editor} />
                    </div>
                </div>
            );
        };
    }
}

export default Configuration;
