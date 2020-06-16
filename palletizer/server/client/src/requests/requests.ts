import axios, { AxiosResponse } from "axios";
import {PalletizerState} from "../types/Types";



function get_configs(callback: any){
    let url = "/configs";
    axios.get(url).then((res: AxiosResponse)=>{
        let data = res.data as PalletizerState;
        callback(data); 
    });
}

async function get_machine_config(filename : string) {
    let res = await axios.get("/config/machine/" + filename);
    return res.data;
}

async function get_pallet_config(filename : string) {
    let res = await axios.get("/config/pallet/" + filename);
    return res.data;
}


function post_config(filename: string, content: any, machine: boolean, callback: any) {
    let url = "/config/new";

    let data = {
        filename: filename,
        data: content,
        machine: machine
    };
    
    axios.post(url, data).then((res : AxiosResponse)=>{
        console.log(res);
        callback();
    });
}



export {get_configs, get_machine_config, get_pallet_config};

export {post_config};
