import express from "express";
import morgan from "morgan";
// For configuration file storage
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// For types
import { AddressInfo } from "net";

// Config Paths.
let CONFIG_PATH : fs.PathLike = path.join(__dirname, '..', '..' , 'machine', 'config');
let MACHINE_PATH : fs.PathLike = path.join(CONFIG_PATH, "machine");
let PALLET_PATH : fs.PathLike = path.join(CONFIG_PATH, "pallet");


console.log(CONFIG_PATH, MACHINE_PATH, PALLET_PATH);
const PORT = 3011;

const app = express();


app.use(morgan('dev'));


// List current configurations.
app.get("/configs", (req:express.Request, res: express.Response)=>{
    
    let options = {
        withFileTypes: true
    } as BaseEncodingOptions;
    
    let machine = fs.readdirSync(MACHINE_PATH, options);
    let pallet = fs.readdirSync(PALLET_PATH, options);

    let machine_configs = [] as string[];
    let pallet_configs = [] as string[];

    machine.forEach((item: any)=> {
        item = item as Dirent;
        if (item.isFile() && path.extname(item.name) === ".json") {
                machine_configs.push(item.name);
        } 
    });

    pallet.forEach((item: any)=>{
        item = item as Dirent;
        if (item.isFile() && path.extname(item.name) === ".json" ) {
            pallet_configs.push(item.name);
        } 
    });
    

    res.json({
        machine_configs: machine_configs,
        pallet_configs: pallet_configs
    });

});



app.get("/", (req: express.Request, res: express.Response)=> {
    res.send("Index worked.");
});



let server = app.listen(PORT, "localhost",()=>{

    let address = server.address() as AddressInfo;
    let address_string = "http://"+address.address+":"+address.port;
    
    console.log(`Server running at ${address_string}.`);
});
