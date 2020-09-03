// Express
import express from "express";

import { dbRequest } from "./server";

// File Handling
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// Python process.
import { spawn } from "child_process";
import { setSelectedConfig, PALLET_PATH, MACHINE_PATH, ConfigData, ConfigUpload, getConfigs } from "./config/config";

let BUILD_PATH: fs.PathLike = path.join(__dirname, '..', 'client', 'build');
let PYTHON_PATH: fs.PathLike = path.join(__dirname, '..', '..', 'machine', 'machine.py');


let router: express.Router = express.Router();

router.use(express.json());

router.post("/configs/new", (req: express.Request, res: express.Response) => {

    res.sendStatus(200);

    let { filename, data, machine } = req.body as ConfigUpload;

    let file_path = path.join((machine ? MACHINE_PATH : PALLET_PATH).toString(), filename);

    fs.writeFile(file_path, JSON.stringify(data, null, "\t"), () => {
        console.log("Wrote file: " + file_path);
    });
});

router.post("/configs/set", (req: express.Request, res: express.Response) => {

    let file_name = req.body.file_name as string;
    let config_type = req.body.config_type as string;

    setSelectedConfig(file_name, config_type).then((b: boolean) => {
        res.sendStatus(b ? 200 : 500);
    }).catch((e: any) => {
        console.log(e);
        res.sendStatus(500);
    });
});

router.post("/configs/savepallet", (req: express.Request, res: express.Response) => {

    let { name, config } = req.body;

    if (!fs.existsSync(PALLET_PATH)) {
        fs.mkdirSync(PALLET_PATH);
    }

    let file_path = path.join(PALLET_PATH.toString(), name + ".json");

    res.sendStatus(200);

    fs.writeFile(file_path, JSON.stringify(config, null, "\t"), () => {
        console.log("Wrote pallet configuration: ", file_path);
    });
});

router.post("/configs/savemachine", (req: express.Request, res: express.Response) => {
    let { name, config } = req.body;

    if (!fs.existsSync(MACHINE_PATH)) {
        fs.mkdirSync(PALLET_PATH);
    }

    let file_path = path.join(MACHINE_PATH.toString(), name + ".json");

    res.sendStatus(200);

    fs.writeFile(file_path, JSON.stringify(config, null, "\t"), () => {
        console.log("Wrote machine configuration: ", file_path);
    });
});

// Serve the static configuration files.
router.use("/machine", express.static(MACHINE_PATH.toString()));
router.use("/pallet", express.static(PALLET_PATH.toString()));

router.post("/machine", (req: express.Request, res: express.Response) => {

    let { filename } = req.body;
    let p = path.join(MACHINE_PATH.toString(), filename);

    if (fs.existsSync(p)) {
        fs.readFile(p, { encoding: 'utf-8' }, (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                console.log("Read file error " + p.toString(), err);
                res.sendStatus(500);
            } else {
                res.send(JSON.parse(data));
            }
        });

    } else {
        console.log("Machine configuration: " + filename + " not found.");
        res.sendStatus(404);
    }
});

router.post("/pallet", (req: express.Request, res: express.Response) => {
    let { filename } = req.body;
    let p = path.join(PALLET_PATH.toString(), filename);

    if (fs.existsSync(p)) {
        fs.readFile(p, { encoding: 'utf-8' }, (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                console.log("Read file error " + p.toString(), err);
                res.sendStatus(500);
            } else {
                res.send(JSON.parse(data));
            }
        });

    } else {
        console.log("Pallet configuration: " + filename + " not found.");
        res.sendStatus(404);
    }
});

// List current configurations.
router.get("/configs", (req: express.Request, res: express.Response) => {
    getConfigs().then((c: ConfigData) => {
        res.json(c);
    }).catch((e: any) => {
        console.log("Error: ", e);
        res.sendStatus(500);
    });
});

router.use(express.static(BUILD_PATH));

router.get("/*", (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(BUILD_PATH.toString(), "index.html").toString());
});

function start_machine() {
    let file_path = PYTHON_PATH.toString();

    console.log("Python path: " + file_path);

    let python_process = spawn("python3", [file_path]);

    // Does this work?
    python_process.stdout.on('data', (chunk: any) => {
        console.log("machine.py: " + chunk.toString('utf-8'));
    });
    python_process.stderr.on("data", (chunk: any) => {

        console.log("machine.py: " + chunk.toString('utf-8'));
    });
    python_process.on("close", () => {
        console.log("machine.py closed.");
    });
}


export { start_machine };

export default router;
