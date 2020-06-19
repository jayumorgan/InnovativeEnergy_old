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

const PORT = 3011;

interface ConfigUpload {
    filename : string;
    machine: boolean;
    data: any;
};

console.log(CONFIG_PATH);

// On selected
function set_selected_config(file_name : string, callback: ()=>void) {
    let data = {
        file_name
    } as any;
    fs.writeFile(CURRENT_CONFIG_PATH, JSON.stringify(data, null, "\t"), () => {
        callback();
    });
}


function get_selected_config(callback : (file_name : string | null) => void) {
    fs.readFile(CURRENT_CONFIG_PATH, {encoding : 'utf-8'}, (err : NodeJS.ErrnoException | null, data : string) => {
        if (err) {
            console.log("Error (get_selected_config) server.ts: ", err);
            callback(null);
        }else{
            let obj = JSON.parse(data) as any;
            let file_name = obj.file_name as string;
            callback(file_name);
        }
    });
}




// Express app setup.
const app = express();
app.use(express.json());
app.use(morgan('dev'));

let router : express.Router = express.Router();

router.post("/configs/new", (req:express.Request, res: express.Response) => {
    res.sendStatus(200);
    let {filename, data} = req.body as ConfigUpload;
    let file_path = path.join(CONFIG_PATH.toString(), filename);
    console.log(file_path, data, filename);
    fs.writeFile(file_path, JSON.stringify(data, null, "\t"), ()=>{
        console.log("Wrote file: " + file_path);
    });
});

router.post("/configs/set", (req: express.Request, res: express.Response) => {
    let file_name = req.body.file_name as string;
    set_selected_config(file_name, ()=>{
        res.sendStatus(200); 
    });
});

// Serve the static configuration files.
router.use("/config", express.static(CONFIG_PATH));

// List current configurations.
router.get("/configs", (req:express.Request, res: express.Response)=>{
    
    let options = {
        withFileTypes: true
    } as BaseEncodingOptions;
    
    let config = fs.readdirSync(CONFIG_PATH, options);


    get_selected_config((file_name : string | null) => {
        let result = {
            configurations: [] as string[],
            current_index : 0
        } as any;
        
        config.forEach((item: any, index: number)=> {
            item = item as Dirent;
            if (item.isFile() && path.extname(item.name) === ".json") {
                result.configurations.push(item.name);
                if (file_name && item.name === file_name){
                    result.current_index = index;
                } 
            } 
        });

        res.json(result);
    });
});

router.get("/", (req: express.Request, res: express.Response)=> {
    res.send("Index worked.");
});

app.use(router);

let server = app.listen(PORT, "localhost",()=>{

    let address = server.address() as AddressInfo;
    let address_string = "http://"+address.address+":"+address.port;
    
    console.log(`Server running at ${address_string}.`);
});
