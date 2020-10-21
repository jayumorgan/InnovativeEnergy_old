import winston from "winston";
import * as dotenv from "dotenv";
import path from "path";
import { Transports } from "winston/lib/winston/transports";

dotenv.config();

const LOG_FP: string | undefined = (() => {
    const env: string | undefined = process.env.ENVIRONMENT;
    if (env && env === "PRODUCTION") { // Log.
        return path.join(__dirname, "..", "logs", "palletizer.log");
    }
})();

export type log_fn = (...s: any[]) => void;

export interface LogFns {
    db_log: log_fn;
    engine_log: log_fn;
    //    router_log: log_fn;
};

export default function Logger(): LogFns {
    let transports: any[] = [new winston.transports.Console()];

    if (LOG_FP) {
        transports.push(new winston.transports.File({ filename: LOG_FP.toString() }));
    }

    const l = winston.createLogger({ transports });

    const db_log = (...s: any[]) => {
        l.info({ location: "db", msg: s });
    };

    const engine_log = (...s: any[]) => {
        l.info({ location: "engine", msg: s });
    };

    // const router_log = (...s: any[]) => {
    //     l.info({ location: "router", msg: s });
    // };

    return { db_log, engine_log };
};
