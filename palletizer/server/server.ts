// Express
import express from "express";
import morgan from "morgan";

// Router
import router, { start_machine } from "./router";

// Types
import { AddressInfo } from "net";

import { initDatabaseHandler, DatabaseHandler } from "./database/db";


// Config
const PORT = 3011;

// Express app setup.
const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(router);


export interface dbRequest extends express.Request {
    databaseHandler?: DatabaseHandler;
};


initDatabaseHandler().then((handler: DatabaseHandler) => {

    let attachDatabaseHandler = (req: dbRequest, res: express.Response, next: express.NextFunction) => {
        req.databaseHandler = handler;
        next();
    };

    app.use(attachDatabaseHandler);

    let server = app.listen(PORT, () => {
        let address = server.address() as AddressInfo;
        let address_string = "http://" + address.address + ":" + address.port;
        console.log(`Server running at ${address_string}.`);
    });

    handler.getMachineConfigs().then((m) => {
        console.log(m);
    });


}).catch((e) => {
    console.log("Error initializing database handler", e);
})




