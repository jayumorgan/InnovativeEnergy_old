import axios, { AxiosResponse } from "axios";
import {PalletizerState} from "../types/Types";



function get_configs(callback: any){
    let url = "/configs";
    axios.get(url).then((res: AxiosResponse)=>{
        let data = res.data as PalletizerState;
        callback(data); 
    });
}

export {get_configs};
