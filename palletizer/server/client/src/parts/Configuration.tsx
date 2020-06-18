import React, { useContext, useState, Fragment } from 'react';

import Modal, {Editor} from "./Modal";

import {ConfigContext} from "../context/ConfigContext";

import {ConfigState} from "../types/Types";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";




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





interface EditorConfig {
    title: string;
    filename: string;
    edit: boolean;
}

function Configuration() {

    let config_context = useContext(ConfigContext);
    
    let {configurations} = config_context as ConfigState;

    var [editor, set_editor] = useState<EditorConfig>({
        title: "",
        filename: "",
        edit: false
    });

    let title = "Machine Configuration";
    

    let start_editor = (fn: string) => {
        let edit = {
            filename: fn,
            title: title,
            edit: true
        } as EditorConfig;
        set_editor(edit);
    }

    let close_editor = ()=>{
        set_editor({...editor, edit: false});
    };
    
    return (
        <Fragment>
            <div className="ConfigGrid">
                <div className="MachineConfig">
                <ConfigContainer title={title} configs={configurations} start_editor={start_editor} />
                </div>
            </div>
            {editor.edit && <Editor file_name={editor.filename} title={editor.title} close={close_editor} />}
        </Fragment>
    );
}

export default Configuration;
