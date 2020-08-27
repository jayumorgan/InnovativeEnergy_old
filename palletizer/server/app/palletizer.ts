import MachineMotion, { MM_Network, AXES } from "./MM/MM";
import { vResponse } from "./MM/MMResponse";


let NETWORK: MM_Network = {
    machineIP: "127.0.0.1",
    mqttPort: "1883",
    serverPort: "8000"
};


// Things we will need to do to get the palletizer setup.
// 1. Parse Configurations.
// 2. Controls with User Interface.
// 3. Await Other Things.
// 4.

let m = new MachineMotion(NETWORK);

m.digitalRead(1, 1);


// So first lets parse a pallet configuration....
// Then we can handle the rest of course...















