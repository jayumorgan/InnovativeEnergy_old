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
    console.log(res);
    return res.data;
    // return await res.json();
}

async function get_pallet_config(filename : string) {
    let res = await axios.get("/config/pallet/" + filename);
    console.log(res);
    return res.data;
}



export {get_configs, get_machine_config, get_pallet_config};
