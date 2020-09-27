import React, { useContext, useState, Fragment } from 'react';
import { Unlock } from "./Modal";
import PalletConfigurator from "./TeachMode";
import MachineConfigurator from "./MachineConfig";
import { ConfigContext } from "../context/ConfigContext";
import { ConfigState } from "../types/Types";
import { SavedPalletConfiguration } from "./TeachMode";
import { SavedMachineConfiguration } from "./MachineConfig";
import { get_config, delete_config } from "../requests/requests";
import { ConfigItem } from "../types/Types";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";


interface ConfigCellProps {
    name: string;
    id: number;
    start_editor: (id: number) => void;
    is_machine: boolean;
    complete: boolean;
};

function ConfigCell({ name, id, start_editor, is_machine, complete }: ConfigCellProps) {

    const { reloadConfigs } = useContext(ConfigContext) as ConfigState;

    const handle_edit = () => {
        start_editor(id);
    };

    const handle_delete = () => {
        delete_config(id, is_machine).then(() => {
            reloadConfigs();
        }).catch((e: any) => {
            console.log("Error deleting configuration.", id, is_machine, e);
        });
    };

    return (
        <div className="ConfigCell">
            <span> {name + (complete ? "" : " (Incomplete)")} </span>
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
};

interface ConfigContainerProps {
    title: string;
    configs: ConfigItem[];
    start_editor: (id: number) => void;
    start_add_config: () => void;
    is_machine: boolean;
};

function ConfigContainer({ title, configs, start_editor, start_add_config, is_machine }: ConfigContainerProps) {
    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span> {title} </span>
            </div>
            <div className="ConfigGrid">
                <div className="ConfigScroll" >
                    {configs.map((item: ConfigItem, index: number) => {
                        const cc_props: ConfigCellProps = {
                            id: item.id,
                            name: item.name,
                            complete: item.complete,
                            start_editor,
                            is_machine
                        };
                        return (<ConfigCell key={index} {...cc_props} />)
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
    let machine_title = "Machine Configuration";
    let pallet_title = "Pallet Configuration";

    const { machine_configs, pallet_configs, reloadConfigs } = useContext(ConfigContext) as ConfigState;
    const [locked, set_locked] = useState<boolean>(false);
    const [add_pallet_config, set_add_pallet_config] = useState<boolean>(false);
    const [add_machine_config, set_add_machine_config] = useState<boolean>(false);
    const [editPalletConfig, setEditPalletConfig] = useState<SavedPalletConfiguration | null>(null);
    const [editMachineConfig, setEditMachineConfig] = useState<SavedMachineConfiguration | null>(null);
    const [editPalletId, setEditPalletId] = useState<number | null>(null);
    const [editMachineId, setEditMachineId] = useState<number | null>(null);

    const startPalletEditor = (id: number) => {
        if (machine_configs.length > 0) {
            let fetch_data = async () => {
                const res_data = await get_config(id, false) as any;
                const saved = JSON.parse(res_data.raw_json);
                const complete: boolean = res_data.complete as boolean;
                setEditPalletId(id);
                setEditPalletConfig({ ...saved, complete });
                set_add_pallet_config(true);
            }
            fetch_data();
        } else {
            console.log("Unable to start pallet configuration editor. No machine configurations available.");
        }
    };

    const startMachineEditor = (id: number) => {
        const fetch_data = async () => {
            const res_data = await get_config(id, true) as any;
            const saved = JSON.parse(res_data.raw_json);
            const complete: boolean = res_data.complete as boolean;
            setEditMachineId(id)
            setEditMachineConfig({ ...saved, complete });
            set_add_machine_config(true);
        };
        fetch_data();
    };

    const close_unlock = () => {
        set_locked(false);
    };

    const new_pallet = (val: boolean) => () => {
        if (machine_configs.length > 0 || !val) {
            set_add_pallet_config(val);
            setEditPalletConfig(null);
        }
        if (!val) {
            reloadConfigs();
        }
    };

    const new_machine = (val: boolean) => () => {
        set_add_machine_config(val);
        setEditMachineConfig(null);
        if (!val) {
            reloadConfigs();
        }
    };

    let pallet_count = pallet_configs.length;
    let machine_count = machine_configs.length;

    return (
        <Fragment>
            <div className="ConfigContainer">
                <ConfigContainer title={machine_title} is_machine={true} configs={machine_configs} start_editor={startMachineEditor} start_add_config={new_machine(true)} />
                <ConfigContainer title={pallet_title} is_machine={false} configs={pallet_configs} start_editor={startPalletEditor} start_add_config={new_pallet(true)} />
            </div>
            {add_pallet_config && <PalletConfigurator id={editPalletId} close={new_pallet(false)} machine_configs={machine_configs} palletConfig={editPalletConfig} index={pallet_count} />}
            {add_machine_config && <MachineConfigurator id={editMachineId} close={new_machine(false)} index={machine_count} machineConfig={editMachineConfig} />}
            {locked && <Unlock close={close_unlock} />}
        </Fragment>
    );
};

export default Configuration;
