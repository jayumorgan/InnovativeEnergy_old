import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Logger, { log_fn } from "../log/log";

const BUILD_PATH: fs.PathLike = path.join(__dirname, '..', '..', 'client', 'build');
const log: log_fn = Logger().db_log;

function handleCatch(res: Response) {
    return (e: any) => {
        log(e);
        res.sendStatus(500);
    }
};

//---------------Router---------------
let router: express.Router = express.Router();
router.use(express.json());

router.post("/configs/set", (req: Request, res: Response) => {
    const handler = req.databaseHandler;

    let { id } = req.body;

    handler.setCurrentPalletConfig(id).then(() => {
        res.sendStatus(200);
    }).catch(handleCatch(res))
});

router.post("/configs/savepallet", (req: Request, res: Response) => {
    const handler = req.databaseHandler;
    const { name, config, id, complete } = req.body;

    if (id === null) {
        handler.addPalletConfig(name, config, complete).then(() => {
            res.sendStatus(200);
        }).catch(handleCatch(res));
    } else {
        handler.updatePalletConfig(id, name, config, complete).then(() => {
            res.sendStatus(200);
        }).catch(handleCatch(res));
    }
});

router.post("/configs/savemachine", (req: Request, res: Response) => {
    const handler = req.databaseHandler;
    const { name, config, id, complete } = req.body;

    if (id === null) {
        handler.addMachineConfig(name, config, complete).then(() => {
            res.sendStatus(200);
        }).catch(handleCatch(res));
    } else {
        handler.updateMachineConfig(id, name, config, complete).then(() => {
            res.sendStatus(200);
        }).catch(handleCatch(res));
    }
});

router.post("/configs/getmachine", (req: Request, res: Response) => {
    const handler = req.databaseHandler;
    const { id } = req.body;

    handler.getMachineConfig(id).then((c: any) => {
        res.send(c);
    }).catch(handleCatch(res));
});

router.post("/configs/getpallet", (req: Request, res: Response) => {
    const handler = req.databaseHandler;
    let { id } = req.body;
    handler.getPalletConfig(id).then((c: any) => {
        res.send(c);
    }).catch(handleCatch(res));
});

router.get("/configs", (req: Request, res: Response) => {
    const handler = req.databaseHandler;
    handler.getAllConfigs().then((all: any) => {
        handler.getCurrentConfigs().then((currents: any) => {
            res.send({
                current: currents,
                configs: all
            });
        }).catch(handleCatch(res));
    }).catch(handleCatch(res));
});

router.post("/configs/delete", (req: Request, res: Response) => {
    const handler = req.databaseHandler;
    const { id, is_machine } = req.body;
    let handleFn: (id: number) => Promise<any> = is_machine ? handler.deleteMachineConfig.bind(handler) : handler.deletePalletConfig.bind(handler);

    handleFn(id).then(() => {
        res.sendStatus(200);
    }).catch(handleCatch(res));
});

router.use(express.static(BUILD_PATH));

router.get("/*", (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(BUILD_PATH.toString(), "index.html").toString());
});

export default router;
