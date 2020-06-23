// Express
import express from "express";
import morgan from "morgan";

// File Handling
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// Types
import { AddressInfo } from "net";

// Configuration
let CONFIG_ROOT : fs.PathLike = path.join(__dirname, '..', '..', 'machine', 'config');
let CURRENT_CONFIG_PATH = path.join(CONFIG_ROOT.toString(), 'current_configuration.json');
let CONFIG_PATH : fs.PathLike = path.join(CONFIG_ROOT.toString(), 'config');
let MACHINE_PATH : fs.PathLike = path.join(CONFIG_ROOT.toString(), "machine");
let PALLET_PATH : fs.PathLike = path.join(CONFIG_ROOT.toString(), "pallet");
let BUILD_PATH : fs.PathLike = path.join(__dirname,"..", "client", "build");

const PORT = 3011;

interface ConfigUpload {
    filename : string;
    machine: boolean;
    data: any;
};

console.log(CONFIG_PATH);


interface ConfigData {
    machine_configs : string[];
    pallet_configs:  string[];
    machine_index : number;
    pallet_index : number;
}

interface CurrentConfig {
    machine: string;
    pallet : string;
}

function get_configurations(callback : (c : ConfigData|null) => void) {

    fs.readFile(CURRENT_CONFIG_PATH, {encoding : 'utf-8'}, (err : NodeJS.ErrnoException | null, data : string) => {
        if (err) {
            console.log("Error (get_selected_config) server.ts: ", err);
            callback(null);
        }else{
            let {machine, pallet} = JSON.parse(data) as CurrentConfig;

            let options = {
                withFileTypes: true
            } as BaseEncodingOptions;
            
            let machine_configs = fs.readdirSync(MACHINE_PATH, options);
            let pallet_configs = fs.readdirSync(PALLET_PATH, options);

            let m_configs = [] as string[];
            let p_configs = [] as string[];
            let m_selected = 0;
            let p_selected = 0;
            
            machine_configs.forEach((item : any, index: number)=> {
                item = item as Dirent;
                if (item.isFile() && path.extname(item.name) === ".json") {
                    m_configs.push(item.name);
                    if (machine && item.name === machine){
                        m_selected = index;
                    } 
                } 
            });

            pallet_configs.forEach((item: any, index: number) => {
                item = item as Dirent
                if (item.isFile() && path.extname(item.name) === ".json") {
                    p_configs.push(item.name);
                    if (pallet && item.name === pallet){
                        p_selected = index;
                    } 
                } 
            });

            let config_data : ConfigData = {
                machine_configs : m_configs,
                pallet_configs : p_configs,
                machine_index : m_selected,
                pallet_index : p_selected
            };

            callback(config_data);
        }
    });
}

// On selected
function set_selected_config(file_name : string, config_type : string,  callback: (success: boolean)=>void) {
    fs.readFile(CURRENT_CONFIG_PATH, {encoding : 'utf-8'}, (err : NodeJS.ErrnoException | null, data : string) => {
        if (err) {
            console.log("Error (set_selected_config) server.ts: ", err);
            callback(false);
        }else{
            
            let cf = JSON.parse(data) as {[ key: string] : any};
            if (config_type) {
                cf[config_type as string] = file_name;
                fs.writeFile(CURRENT_CONFIG_PATH, JSON.stringify(data, null, "\t"), () => {
                    callback(true);
                });

            }else{
                callback(false);
            }

        }
    });

}

// Express app setup.
const app = express();
// app.use(express.json());
app.use(morgan('dev'));

let router : express.Router = express.Router();

router.use(express.json());

router.post("/configs/new", (req:express.Request, res: express.Response) => {
    res.sendStatus(200);

    let {filename, data, machine} = req.body as ConfigUpload;

    let file_path = path.join((machine ? MACHINE_PATH : PALLET_PATH).toString(), filename);
    
    fs.writeFile(file_path, JSON.stringify(data, null, "\t"), ()=>{
        console.log("Wrote file: " + file_path);
    });
});

router.post("/configs/set", (req: express.Request, res: express.Response) => {

    let file_name = req.body.file_name as string;
    let config_type = req.body.config_type as string;
    
    set_selected_config(file_name,config_type,(success: boolean)=>{
        res.sendStatus(success ? 200 : 500); 
    });
});

// Serve the static configuration files.
router.use("/machine", express.static(MACHINE_PATH));
router.use("/pallet", express.static(PALLET_PATH));

// List current configurations.
router.get("/configs", (req:express.Request, res: express.Response)=>{
    get_configurations((c : ConfigData|null) => {
        res.json(c);
    });
});

router.get("/", (req: express.Request, res: express.Response)=> {
    res.send("Index worked.");
});


router.get("/palletizer", (req : express.Request, res : express.Response)=>{
    res.sendFile(path.join(BUILD_PATH.toString(), "index.html").toString());
    
});

router.use(express.static(BUILD_PATH));

app.use(router);

// export default router;


let server = app.listen(PORT, "localhost",()=>{

    let address = server.address() as AddressInfo;
    let address_string = "http://"+address.address+":"+address.port;
    
    console.log(`Server running at ${address_string}.`);
});
