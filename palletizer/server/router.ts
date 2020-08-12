// Express
import express from "express";

// File Handling
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// Python process.
import { spawn } from "child_process";

// Configuration
let CONFIG_ROOT: fs.PathLike = path.join(__dirname, '..', '..', 'machine', 'config');
let CURRENT_CONFIG_PATH = path.join(CONFIG_ROOT.toString(), 'current_configuration.json');
let CONFIG_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'config');
let MACHINE_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'machine');
let PALLET_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'pallet');
let BUILD_PATH: fs.PathLike = path.join(__dirname, '..', 'client', 'build');
let PYTHON_PATH: fs.PathLike = path.join(__dirname, '..', '..', 'machine', 'machine.py');

interface ConfigUpload {
    filename: string;
    machine: boolean;
    data: any;
};

console.log(CONFIG_PATH);

interface ConfigData {
    machine_configs: string[];
    pallet_configs: string[];
    machine_index: number;
    pallet_index: number;
}

interface CurrentConfig {
    machine: string;
    pallet: string;
}

function get_configurations(callback: (c: ConfigData | null) => void) {

    fs.readFile(CURRENT_CONFIG_PATH, { encoding: 'utf-8' }, (err: NodeJS.ErrnoException | null, data: string) => {
        if (err) {
            console.log("Error (get_selected_config) server.ts: ", err);
            callback(null);
        } else {
            let { machine, pallet } = JSON.parse(data) as CurrentConfig;

            let options = {
                withFileTypes: true
            } as BaseEncodingOptions;

            let machine_configs = fs.readdirSync(MACHINE_PATH, options);
            let pallet_configs = fs.readdirSync(PALLET_PATH, options);

            let m_configs = [] as string[];
            let p_configs = [] as string[];
            let m_selected = 0;
            let p_selected = 0;

            machine_configs.forEach((item: any, index: number) => {
                item = item as Dirent;
                if (item.isFile() && path.extname(item.name) === ".json") {
                    m_configs.push(item.name);
                    if (machine && item.name === machine) {
                        m_selected = index;
                    }
                }
            });

            pallet_configs.forEach((item: any, index: number) => {
                item = item as Dirent;
                if (item.isFile() && path.extname(item.name) === ".json") {
                    p_configs.push(item.name);
                    if (pallet && item.name === pallet) {
                        p_selected = index;
                    }
                }
            });

            let config_data: ConfigData = {
                machine_configs: m_configs,
                pallet_configs: p_configs,
                machine_index: m_selected,
                pallet_index: p_selected
            };

            callback(config_data);
        }
    });
}


interface Configs {
    machine: string,
    pallet: string
};

// On selected
function set_selected_config(file_name: string, config_type: string, callback: (success: boolean) => void) {
    fs.readFile(CURRENT_CONFIG_PATH, { encoding: 'utf-8' }, (err: NodeJS.ErrnoException | null, data: string) => {
        if (err) {
            console.log("Error (set_selected_config) server.ts: ", err);
            callback(false);
        } else {
            console.log(data);
            let cf = JSON.parse(data) as Configs;
            if (config_type) {
                if (config_type === "machine") {
                    cf.machine = file_name;
                } else {
                    cf.pallet = file_name;
                }
                fs.writeFile(CURRENT_CONFIG_PATH, JSON.stringify(cf, null, "\t"), () => {
                    callback(true);
                });
            } else {
                callback(false);
            }

        }
    });

}


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

    set_selected_config(file_name, config_type, (success: boolean) => {
        res.sendStatus(success ? 200 : 500);
    });
});

router.post("/configs/savepallet", (req: express.Request, res: express.Response) => {

    let { name, config } = req.body;

    if (!fs.existsSync(PALLET_PATH)) {
        fs.mkdirSync(PALLET_PATH);
    }

    let file_path = path.join(PALLET_PATH.toString(), name + ".json");

    fs.writeFile(file_path, JSON.stringify(config, null, "\t"), () => {
        console.log("Wrote pallet configuration: ", file_path);
    });
});


// Serve the static configuration files.
router.use("/machine", express.static(MACHINE_PATH));
router.use("/pallet", express.static(PALLET_PATH));

// List current configurations.
router.get("/configs", (req: express.Request, res: express.Response) => {
    get_configurations((c: ConfigData | null) => {
        res.json(c);
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
