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
const HOSTNAME = "127.0.0.1";

// Express app setup.
const app = express();
app.use(express.json());
app.use(morgan('dev'));



initDatabaseHandler().then((handler: DatabaseHandler) => {

    let attachDatabaseHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.databaseHandler = handler;
        next();
    };

    app.use(attachDatabaseHandler);

    app.use(router);

    let server = app.listen(PORT, HOSTNAME, () => {
        let address = server.address() as AddressInfo;
        let address_string = "http://" + address.address + ":" + address.port;
        console.log(`Server running at ${address_string}.`);
    });
}).catch((e) => {
    console.log("Error initializing database handler", e);
})




