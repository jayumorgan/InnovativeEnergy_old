import axios, { AxiosResponse } from "axios";

import { ConfigItem, ConfigState } from "../types/Types";


function get_url(url: string): string {
    return "" + url;
}

export function get_configs(callback: (a: ConfigState) => void) {
    let url = get_url("/configs");
    axios.get(url).then((res: AxiosResponse) => {

        let { current, configs } = res.data;
        let cState: ConfigState = {
            machine_configs: configs.machine as ConfigItem[],
            pallet_configs: configs.pallet as ConfigItem[],
            machine_index: current.machine ? current.machine : 0,
            pallet_index: current.pallet ? current.pallet : 0
        };
        callback(cState);
    });
};

export async function get_config(id: number, machine: boolean) {
    let url = get_url("/configs" + (machine ? "/getmachine" : "/getpallet"));
    let res = await axios.post(url, { id });
    return res.data;
};

export function set_config(id: number, machine: boolean) {
    let url = get_url("/configs/set");

    let data = {
        id,
        is_machine: machine
    } as any;

    axios.post(url, data);
}


export function SavePalletConfig(name: string, config: any, id: number | null) {
    let url = get_url("/configs/savepallet");

    let data = {
        name,
        config,
        id
    } as any;

    axios.post(url, data);
};


export function SaveMachineConfig(name: string, config: any, id: number | null) {
    let url = get_url("/configs/savemachine");

    let data = {
        name,
        config,
        id
    } as any;

    axios.post(url, data);
};

// export {
//     get_configs,
//     get_config,
//     post_config,
//     set_config,
//     get_state_config,
//     SavePalletConfig,
//     SaveMachineConfig
// };
