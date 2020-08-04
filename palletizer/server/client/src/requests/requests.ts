import axios, { AxiosResponse } from "axios";
import {ConfigState} from "../types/Types";


function get_url(url : string) : string {
    return "" + url;
}

function get_configs(callback: any){
    let url = get_url("/configs");
    axios.get(url).then((res: AxiosResponse)=>{
        let data = res.data as ConfigState; 
        callback(data); 
    });
}

async function get_config(filename : string, machine: boolean) {
    let url = get_url((machine ? "/machine/" : "/pallet/") + filename);
    let res = await axios.get(url);
    return res.data;
}

async function get_state_config(state : ConfigState) {
    let {machine_configs, pallet_configs, machine_index, pallet_index} = state;
    let machine_file = machine_configs[machine_index as number];
    let pallet_file = pallet_configs[pallet_index as number];

    let pallet_data = await get_config(pallet_file, false);
    let machine_data = await get_config(machine_file, true);

    return {machine: machine_data, pallet : pallet_data};
}

function post_config(filename: string, content: any, callback: any) {
    let url = get_url("/configs/new");

    let data = {
        filename: filename,
        data: content,
    };
    
    axios.post(url, data).then((res : AxiosResponse)=>{
        console.log(res);
        callback();
    });
}

function set_config(file_name: string, machine: boolean) {
    let url = get_url("/configs/set");

    let config_type = machine ? "machine" : "pallet";

    let data = {
        file_name,
        config_type
    } as any;

    axios.post(url, data);
}

export {
    get_configs,
    get_config,
    post_config,
    set_config,
    get_state_config
};
