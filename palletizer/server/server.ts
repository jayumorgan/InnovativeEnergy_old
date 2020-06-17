// Express
import express from "express";
import morgan from "morgan";

// File Handling
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// Types
import { AddressInfo } from "net";

// Configuration
let CONFIG_PATH : fs.PathLike = path.join(__dirname, '..', '..' , 'machine', 'config', 'config');
const PORT = 3011;

interface ConfigUpload {
    filename : string;
    machine: boolean;
    data: any;
};

console.log(CONFIG_PATH);

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

// Serve the static configuration files.
router.use("/config", express.static(CONFIG_PATH));

// List current configurations.
router.get("/configs", (req:express.Request, res: express.Response)=>{
    
    let options = {
        withFileTypes: true
    } as BaseEncodingOptions;
    
    let config = fs.readdirSync(CONFIG_PATH, options);

    let configs = [] as string[];

    config.forEach((item: any)=> {
        item = item as Dirent;
        if (item.isFile() && path.extname(item.name) === ".json") {
                configs.push(item.name);
        } 
    });

    res.json({ configurations : configs, current_index : 0});

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
