import { DatabaseHandler } from "../database/db";


declare global {
    namespace Express {
        interface Request {
            databaseHandler: DatabaseHandler
        }
    }
};
