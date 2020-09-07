import React, { useContext, useState, Fragment } from 'react';

import { Unlock } from "./Modal";

import PalletConfigurator from "./TeachMode";

import MachineConfigurator from "./MachineConfig";

import { ConfigContext } from "../context/ConfigContext";

import { ConfigState } from "../types/Types";

import { SavedPalletConfiguration } from "./TeachMode";

import { SavedMachineConfiguration } from "./MachineConfig";

import { get_config } from "../requests/requests";

import { ConfigItem } from "../types/Types";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";

interface ConfigCellProps {
    name: string;
    id: number;
    start_editor: (id: number) => void;
}

function ConfigCell({ name, id, start_editor }: ConfigCellProps) {

    let handle_edit = () => {
        console.log("Edit config " + name);
        start_editor(id);
    };

    let handle_delete = () => {
        console.log("Delete config " + name);
    };

    return (
        <div className="ConfigCell">
            <span> {name} </span>
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
    configs: ConfigItem[];
    start_editor: (id: number) => void;
    start_add_config: () => void;
};

function ConfigContainer({ title, configs, start_editor, start_add_config }: ConfigContainerProps) {
    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span> {title} </span>
            </div>
            <div className="ConfigGrid">
                <div className="ConfigScroll" >
                    {configs.map((item: ConfigItem, index: number) => {
                        return (<ConfigCell id={item.id} name={item.name} key={index} start_editor={start_editor} />)
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
};


function Configuration() {
    let config_context = useContext(ConfigContext);

    let { machine_configs, pallet_configs } = config_context as ConfigState;
    
    let [locked, set_locked] = useState<boolean>(false);

    // True for development
    let [add_pallet_config, set_add_pallet_config] = useState<boolean>(false);
    let [add_machine_config, set_add_machine_config] = useState<boolean>(false);

    let machine_title = "Machine Configuration";
    let pallet_title = "Pallet Configuration";

    let [editPalletConfig, setEditPalletConfig] = useState<SavedPalletConfiguration | null>(null);
    let [editMachineConfig, setEditMachineConfig] = useState<SavedMachineConfiguration | null>(null);
    let [editPalletId, setEditPalletId] = useState<number | null>(null);
    let [editMachineId, setEditMachineId] = useState<number | null>(null);

    let startPalletEditor = (id: number) => {
	if (machine_configs.length > 0) {
            let fetch_data = async () => {
		let res_data = await get_config(id, false) as any;
		let saved = JSON.parse(res_data.raw_json);
		setEditPalletId(id);
		setEditPalletConfig(saved);
		set_add_pallet_config(true);
            }
            fetch_data();
	} else {
	    console.log("Unable to start pallet configuration editor. No machine configurations available.");
	}
    };

    let startMachineEditor = (id: number) => {
        let fetch_data = async () => {
            let res_data = await get_config(id, true) as any;
            let saved = JSON.parse(res_data.raw_json);
            setEditMachineId(id)
            setEditMachineConfig(saved);
            set_add_machine_config(true);
        };
        fetch_data();
    };


    let close_unlock = () => {
        set_locked(false);
    }

    let new_pallet = (val: boolean) => () => {
	if (machine_configs.length > 0 || !val) {
            set_add_pallet_config(val);
            setEditPalletConfig(null);
	}
    };

    let new_machine = (val: boolean) => () => {
        set_add_machine_config(val);
        setEditMachineConfig(null);
    };

    let pallet_count = pallet_configs.length;
    let machine_count = machine_configs.length;

    return (
        <Fragment>
            <div className="ConfigContainer">
                <ConfigContainer title={machine_title} configs={machine_configs} start_editor={startMachineEditor} start_add_config={new_machine(true)} />
                <ConfigContainer title={pallet_title} configs={pallet_configs} start_editor={startPalletEditor} start_add_config={new_pallet(true)} />
            </div>
            {add_pallet_config && <PalletConfigurator id={editPalletId} close={new_pallet(false)} machine_configs={machine_configs} palletConfig={editPalletConfig} index={pallet_count} />}
            {add_machine_config && <MachineConfigurator id={editMachineId} close={new_machine(false)} index={machine_count} machineConfig={editMachineConfig} />}
            {locked && <Unlock close={close_unlock} />}
        </Fragment>
    );
};

export default Configuration;
