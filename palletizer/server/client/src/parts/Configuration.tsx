import React, { useContext, useState, Fragment } from 'react';

import Modal, { Editor, Unlock } from "./Modal";

import PalletConfigurator from "./TeachMode";

import MachineConfigurator from "./MachineConfig";

import { ConfigContext } from "../context/ConfigContext";

import { ConfigState } from "../types/Types";

import { SavedPalletConfiguration } from "./TeachMode";

import { get_config } from "../requests/requests";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";

// Use : https://app.quicktype.io for data validation.

interface ConfigContainerProps {
    title: string;
    configs: string[];
    start_editor(fn: string): any;
    start_add_config: () => void;
}

interface ConfigCellProps {
    file_name: string;
    start_editor(fn: string): any;
}

function ConfigCell({ file_name, start_editor }: ConfigCellProps) {

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

function ConfigContainer({ title, configs, start_editor, start_add_config }: ConfigContainerProps) {

    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span> {title} </span>
            </div>
            <div className="ConfigGrid">
                <div className="ConfigScroll" >
                    {configs.map((file_name, index) => {
                        return (<ConfigCell file_name={file_name} key={index} start_editor={start_editor} />)
                    })}
                </div>
                <div className="ConfigAdd">
                    <div className="AddConfigButton" onClick={start_add_config} >
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

    let { machine_configs, pallet_configs } = config_context as ConfigState;

    var [editor, set_editor] = useState<EditorConfig>({
        title: "",
        filename: "",
        edit: false,
        machine: true
    });


    let [locked, set_locked] = useState<boolean>(false);

    // True for development
    let [add_pallet_config, set_add_pallet_config] = useState<boolean>(false);
    let [add_machine_config, set_add_machine_config] = useState<boolean>(true);

    let machine_title = "Machine Configuration";
    let pallet_title = "Pallet Configuration";

    let [editPalletConfig, setEditPalletConfig] = useState<SavedPalletConfiguration | null>(null);

    let start_editor = (title: string) => (fn: string) => {
        let edit = {
            filename: fn,
            title: title,
            edit: true,
            machine: title === machine_title
        } as EditorConfig;
        set_editor(edit);
    };

    let startPalletEditor = (filename: string) => {

        let fetch_data = async () => {
            let res_data = await get_config(filename, false) as SavedPalletConfiguration;
            setEditPalletConfig(res_data);
            set_add_pallet_config(true);
            //set_data(JSON.stringify(res_data, null, "\t"));
        }
        fetch_data();
    }

    let close_editor = () => {
        set_editor({ ...editor, edit: false });
    };

    let close_unlock = () => {
        set_locked(false);
    }

    let new_pallet = (val: boolean) => () => {
        set_add_pallet_config(val);
        setEditPalletConfig(null);
    };

    let new_machine = (val: boolean) => () => {
        set_add_machine_config(val);
    };

    let add_new_machine = () => {

        console.log("Add Machine Config");
    };

    let configCount = pallet_configs.length;

    return (
        <Fragment>
            <div className="ConfigContainer">
                <ConfigContainer title={machine_title} configs={machine_configs} start_editor={start_editor(machine_title)} start_add_config={new_machine(true)} />
                <ConfigContainer title={pallet_title} configs={pallet_configs} start_editor={startPalletEditor} start_add_config={new_pallet(true)} />
            </div>
            {editor.edit && <Editor file_name={editor.filename} title={editor.title} close={close_editor} machine={editor.machine} />}
            {add_pallet_config && <PalletConfigurator close={new_pallet(false)} palletConfig={editPalletConfig} index={configCount} />}
            {add_machine_config && <MachineConfigurator close={new_machine(false)} index={0} machineConfig={null} />}
            {locked && <Unlock close={close_unlock} />}
        </Fragment>
    );
}

export default Configuration;
