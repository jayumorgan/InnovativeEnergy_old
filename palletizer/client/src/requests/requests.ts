import axios, { AxiosResponse } from "axios";
import {
    ConfigItem,
    ConfigState
} from "../types/Types";
import { SavedMachineConfiguration } from "../parts/MachineConfig";

const get_url = (url: string): string => {
    return "" + url;
};

export function delete_config(id: number, is_machine: boolean) {
    const url = get_url("/configs/delete");
    return new Promise<boolean>((resolve, reject) => {
        axios.post(url, { id, is_machine }).then((res: AxiosResponse) => {
            if (res.status === 200) {
                resolve(true)
            } else {
                reject(false);
            }
        }).catch((e) => {
            console.log("Error with axios delete", e);
            reject(e);
        })
    });
};

export function getConfigs() {
    const url = get_url("/configs");
    return new Promise<ConfigState>((resolve, reject) => {
        axios.get(url).then((res: AxiosResponse) => {
            if (res.status === 200) {
                const { current, configs } = res.data;
                const cState: ConfigState = {
                    machine_configs: configs.machine as ConfigItem[],
                    pallet_configs: configs.pallet as ConfigItem[],
                    machine_index: current.machine ? current.machine.id : 0,
                    pallet_index: current.pallet ? current.pallet.id : 0,
                    reloadConfigs: () => { return; }
                };
                resolve(cState);
            } else {
                reject(url + " failed: " + String(res.status));
            }
        }).catch((e: any) => {
            reject(e);
        });
    });
};


export function get_machine_config(id: number): Promise<SavedMachineConfiguration> {
    const url = get_url("/configs" + "/getmachine");
    return new Promise<SavedMachineConfiguration>((resolve, reject) => {
        axios.post(url, { id }).then((res: any) => {
            let data = res.data as any;
            let config = JSON.parse(data.raw_json) as SavedMachineConfiguration;
            resolve(config);
        }).catch((e: any) => {
            reject(e);
        });
    });
};

export async function get_config(id: number, machine: boolean) {
    const url = get_url("/configs" + (machine ? "/getmachine" : "/getpallet"));
    let res = await axios.post(url, { id });
    return res.data;
};

export function set_config(id: number) {
    const url = get_url("/configs/set");

    let data = {
        id
    } as any;

    return new Promise((resolve, reject) => {
        axios.post(url, data).then((res: AxiosResponse) => {
            if (res.status === 200) {
                resolve();
            } else {
                reject("Axios request failed: " + url);
            }
        }).catch(e => reject(e));
    });
};

export function SavePalletConfig(name: string, config: any, id: number | null, complete: boolean) {
    const url = get_url("/configs/savepallet");
    let data = {
        name,
        config,
        id,
        complete
    } as any;
    return axios.post(url, data);
};

export function SaveMachineConfig(name: string, config: any, id: number | null, complete: boolean) {
    const url = get_url("/configs/savemachine");
    let data = {
        name,
        config,
        id,
        complete
    } as any;
    return axios.post(url, data);
};
