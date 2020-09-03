// Express
import express, { Request, Response } from "express";



// File Handling
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// Python process.
import { spawn } from "child_process";

let BUILD_PATH: fs.PathLike = path.join(__dirname, '..', 'client', 'build');
let PYTHON_PATH: fs.PathLike = path.join(__dirname, '..', '..', 'machine', 'machine.py');


function handleCatch(res: Response) {
    return (e: any) => {
        console.log(e);
        res.sendStatus(500);
    }
};


//---------------Router---------------

let router: express.Router = express.Router();
router.use(express.json());

router.post("/configs/set", (req: Request, res: Response) => {
    let handler = req.databaseHandler;

    let { id, is_machine } = req.body;

    let updater: (i: number) => Promise<any>;

    if (is_machine) {
        updater = handler.setCurrentMachineConfig;
    } else {
        updater = handler.setCurrentPalletConfig;
    }
    updater(id).then((d) => {
        res.sendStatus(200);
    }).catch(handleCatch(res));
});

router.post("/configs/savepallet", (req: Request, res: Response) => {
    let handler = req.databaseHandler;
    let { name, config } = req.body;

    handler.addPalletConfig(name, config).then(() => {
        res.sendStatus(200);
    }).catch(handleCatch(res));
});

router.post("/configs/savemachine", (req: Request, res: Response) => {
    let handler = req.databaseHandler;
    let { name, config } = req.body;

    handler.addMachineConfig(name, config).then(() => {
        res.sendStatus(200);
    }).catch(handleCatch(res));
});

router.post("/configs/getmachine", (req: Request, res: Response) => {
    let handler = req.databaseHandler;
    let { id } = req.body;

    handler.getMachineConfig(id).then((c: any) => {
        res.send(c);
    }).catch(handleCatch(res));
});


router.post("/configs/getpallet", (req: Request, res: Response) => {
    let handler = req.databaseHandler;
    let { id } = req.body;
    handler.getPalletConfig(id).then((c: any) => {
        res.send(c);
    }).catch(handleCatch(res));
});

router.get("/configs", (req: Request, res: Response) => {

    let handler = req.databaseHandler;

    handler.getAllConfigs().then((all: any) => {
        handler.getCurrentConfigs().then((currents: any) => {
            res.send({
                current: currents,
                configs: all
            });
        }).catch(handleCatch(res));
    }).catch(handleCatch(res));
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
