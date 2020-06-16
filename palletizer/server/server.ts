import express from "express";
import morgan from "morgan";
// For configuration file storage
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// For types
import { AddressInfo } from "net";

// Config Paths.
let CONFIG_PATH : fs.PathLike = path.join(__dirname, '..', '..' , 'machine', 'config', 'config');


console.log(CONFIG_PATH);
const PORT = 3011;

const app = express();
app.use(express.json());
app.use(morgan('dev'));


interface ConfigUpload {
    filename : string;
    machine: boolean;
    data: any;
};


app.post("/configs/new", (req:express.Request, res: express.Response) => {
    res.sendStatus(200);
    let {filename, data} = req.body as ConfigUpload;
    let file_path = path.join(CONFIG_PATH.toString(), filename);
    console.log(file_path, data, filename);
    fs.writeFile(file_path, JSON.stringify(data, null, "\t"), ()=>{
        console.log("Wrote file: " + file_path);
    });
});




// Serve the static configuration files.
app.use("/config", express.static(CONFIG_PATH));

// List current configurations.
app.get("/configs", (req:express.Request, res: express.Response)=>{
    
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

    res.json({ configurations : configs});

});



app.get("/", (req: express.Request, res: express.Response)=> {
    res.send("Index worked.");
});



let server = app.listen(PORT, "localhost",()=>{

    let address = server.address() as AddressInfo;
    let address_string = "http://"+address.address+":"+address.port;
    
    console.log(`Server running at ${address_string}.`);
});
