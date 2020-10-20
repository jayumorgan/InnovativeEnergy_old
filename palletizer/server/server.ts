// Express
import express from "express";
import morgan from "morgan";
import * as dotenv from "dotenv";
import { AddressInfo } from "net";
//---------------Router---------------
import router from "./routes/router";
//---------------Database Handler---------------
import { initDatabaseHandler, DatabaseHandler } from "./database/db";
//---------------Control Engine---------------
import { Engine } from "./engine/engine";

dotenv.config();
console.log("Server starting in " + process.env.ENVIRONMENT + " environment.");

const PORT = 3011;
const HOSTNAME = "127.0.0.1";

// Express app setup.
const app = express();
app.use(express.json());
app.use(morgan('dev'));

initDatabaseHandler().then((handler: DatabaseHandler) => {
    const attachDatabaseHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.databaseHandler = handler;
        next();
    };
    const engine = new Engine(handler);

    app.use(attachDatabaseHandler);
    app.use(router);

    const server = app.listen(PORT, HOSTNAME, () => {
        let address = server.address() as AddressInfo;
        let address_string = "http://" + address.address + ":" + address.port;
        console.log(`Palletizer machine application server running at ${address_string}.`);
    });

}).catch((e) => {
    console.log("Error initializing database handler", e);
});

