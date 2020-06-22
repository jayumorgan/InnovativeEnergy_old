import React, { useContext, useState, Fragment } from 'react';

import Modal, {Editor} from "./Modal";

import {ConfigContext} from "../context/ConfigContext";

import {ConfigState} from "../types/Types";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";


interface ConfigContainerProps {
    title: string;
    configs: string[];
    start_editor(fn: string) : any;
}

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

function ConfigContainer(props: ConfigContainerProps) {

    let {title, configs, start_editor} = props;

    let handle_add = ()=>{
        console.log("Handle: Add " + title);
    };

    return(
        <div className="StackContainer">
            <div className="StackTitle">
                <span> {title} </span>
            </div>
            <div className="ConfigGrid">
                <div className="ConfigScroll" >
                    {configs.map((file_name, index)=>{
                        return (<ConfigCell file_name={file_name} key={index} start_editor={start_editor} />)
                    })}
                </div>
                <div className="ConfigAdd">
                    <div className="AddConfigButton" onClick={handle_add} >
                        <span> {"Add " + title.toLowerCase()} </span>
                    </div>
                </div>
            </div>
        </div>
    );
}


interface EditorConfig {
    title: string;
    filename: string;
    edit: boolean;
    machine: boolean;
}

function Configuration() {

    let config_context = useContext(ConfigContext);
    
    let {machine_configs, pallet_configs} = config_context as ConfigState;

    var [editor, set_editor] = useState<EditorConfig>({
        title: "",
        filename: "",
        edit: false,
        machine: true
    });

    let machine_title = "Machine Configuration";
    let pallet_title = "Pallet Configuration";
    
    let start_editor = (title : string) => (fn: string) => {
        let edit = {
            filename: fn,
            title: title,
            edit: true,
            machine: title === machine_title
        } as EditorConfig;
        set_editor(edit);
    }

    let close_editor = ()=>{
        set_editor({...editor, edit: false});
    };
    
    return (
        <Fragment>
            <div className="ConfigContainer">
            <ConfigContainer title={machine_title} configs={machine_configs} start_editor={start_editor(machine_title)} />
            <ConfigContainer title={pallet_title} configs={pallet_configs} start_editor={start_editor(pallet_title)} />
            </div>
            {editor.edit && <Editor file_name={editor.filename} title={editor.title} close={close_editor} machine={editor.machine}/>}
        </Fragment>
    );
}

export default Configuration;
