import MachineMotion, { MM_Network, AXES } from "./MM/MM";
import { vResponse } from "./MM/MMResponse";

import { ConfigData, getConfigs } from "../config/config";

let NETWORK: MM_Network = {
    machineIP: "127.0.0.1",
    mqttPort: "1883",
    serverPort: "8000"
};











// Then we need the following which.

let m = new MachineMotion(NETWORK);

m.digitalRead(1, 1);

// Should read the configurations from the defaults of course.
// class Palletizer extends MachineMotion {
//     constructor(mm_network: MM_Network, configuration: any) {
//         super
//     }
// }


