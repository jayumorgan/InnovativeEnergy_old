import axios, { AxiosResponse } from "axios";


function control_request(command: string) {
    command = command.toLowerCase();
    let url = "control/" + command;
    axios.get(url).then((res: AxiosResponse)=>{
       if (res.status!==200) {
           console.log("Error with control request", res);
       } 
    });
}


function estop_request() {
    let url = "estop";
    axios.get(url).then((res:AxiosResponse)=>{
        if (res.status!==200){
            console.log("Error with estop request", res);
        }
    });
}

export {control_request, estop_request};

