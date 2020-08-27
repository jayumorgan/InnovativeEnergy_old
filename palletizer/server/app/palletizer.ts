import MachineMotion, { MM_Network } from "./MM/MM";


let NETWORK: MM_Network = {
    machineIP: "127.0.0.1",
    mqttPort: "1883",
    serverPort: "8000"
};


let m = new MachineMotion(NETWORK);

export { m };





