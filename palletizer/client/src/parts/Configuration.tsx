import React, { useContext, useState, Fragment } from 'react';
import { Unlock } from "./Modal";
import PalletConfigurator from "./TeachMode";
import MachineConfigurator from "./MachineConfig";
import { ConfigContext } from "../context/ConfigContext";
import { ConfigState } from "../types/Types";
import { SavedPalletConfiguration } from "./TeachMode";
import { SavedMachineConfiguration } from "./MachineConfig";
import { get_config, delete_config, get_machine_config } from "../requests/requests";
import { ConfigItem } from "../types/Types";
import MachineJogger, { MachineJoggerProps } from "./MachineJogger";

// Styles
import "./css/Configuration.scss";
import "./css/Login.scss";

interface ConfigCellProps {
    name: string;
    id: number;
    start_editor: (id: number) => void;
    is_machine: boolean;
    complete: boolean;
    start_jogger?: (id: number) => void;
};

function ConfigCell({ name, id, start_editor, is_machine, complete, start_jogger }: ConfigCellProps) {

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

    const handle_jogger = () => {
        if (start_jogger) {
            start_jogger(id);
        }
    };

    const display_name: string = name + (complete ? "" : " (Incomplete)");

    return (
        <div className="ConfigCell">
            <span>
                {display_name}
            </span>
            <div className="EditConfigButton" onClick={handle_edit}>
                <span> Edit </span>
            </div>
            {is_machine &&
                <div className="EditConfigButton" onClick={handle_jogger}>
                    <span> Jogger </span>
                </div>}
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
    start_jogger?: (id: number) => void;
};

function ConfigContainer({ title, configs, start_editor, start_add_config, is_machine, start_jogger }: ConfigContainerProps) {
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
                            is_machine,
                            start_jogger
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
    const machine_title = "Machine Configuration";
    const pallet_title = "Pallet Configuration";

    const { machine_configs, pallet_configs, reloadConfigs } = useContext(ConfigContext) as ConfigState;
    const [locked, set_locked] = useState<boolean>(false);
    const [add_pallet_config, set_add_pallet_config] = useState<boolean>(false);
    const [add_machine_config, set_add_machine_config] = useState<boolean>(false);
    const [editPalletConfig, setEditPalletConfig] = useState<SavedPalletConfiguration | null>(null);
    const [editMachineConfig, setEditMachineConfig] = useState<SavedMachineConfiguration | null>(null);
    const [editPalletId, setEditPalletId] = useState<number | null>(null);
    const [editMachineId, setEditMachineId] = useState<number | null>(null);
    const [showJogger, setShowJogger] = useState<boolean>(false);

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
            setEditPalletConfig(null);
            setEditPalletId(null);
            set_add_pallet_config(val);
        }
        if (!val) {
            reloadConfigs();
        }
    };

    const new_machine = (val: boolean) => () => {
        setEditMachineConfig(null);
        setEditMachineId(null);
        set_add_machine_config(val);
        if (!val) {
            reloadConfigs();
        }
    };

    const close_jogger = () => {
        setShowJogger(false);
    };

    let machineJoggerProps = {
        close: close_jogger
    } as any;

    const start_jogger = (id: number) => {
        get_machine_config(id).then((smc: SavedMachineConfiguration) => {
            machineJoggerProps.config = smc;
        }).catch((e: any) => {
            console.log("Error start jogger", e);
        })
        setShowJogger(true);
    };

    const pallet_count = pallet_configs.length;
    const machine_count = machine_configs.length;

    const machineProps: ConfigContainerProps = {
        title: machine_title,
        is_machine: true,
        configs: machine_configs,
        start_editor: startMachineEditor,
        start_add_config: new_machine(true),
        start_jogger: start_jogger
    };

    const palletProps: ConfigContainerProps = {
        title: pallet_title,
        is_machine: false,
        configs: pallet_configs,
        start_editor: startPalletEditor,
        start_add_config: new_pallet(true)
    };

    return (
        <Fragment>
            <div className="ConfigContainer">
                <ConfigContainer {...machineProps} />
                <ConfigContainer {...palletProps} />
            </div>
            {showJogger &&
                <MachineJogger {...(machineJoggerProps as MachineJoggerProps)} />
            }
            {add_pallet_config && <PalletConfigurator id={editPalletId} close={new_pallet(false)} machine_configs={machine_configs} palletConfig={editPalletConfig} index={pallet_count} />}
            {add_machine_config && <MachineConfigurator id={editMachineId} close={new_machine(false)} index={machine_count} machineConfig={editMachineConfig} />}
            {locked && <Unlock close={close_unlock} />}
        </Fragment>
    );
};

export default Configuration;
