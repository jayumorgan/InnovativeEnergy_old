import sqlite3 from "sqlite3";
import { open, Database as sqliteDB } from "sqlite";
import path from "path";
import fs from "fs";

//-------NB: These we be in the dist directory (typescript)-------
const DATABASE_DIRECTORY = path.join(__dirname, "..", "db");
const DATABASE_PATH = path.join(DATABASE_DIRECTORY.toString(), "Configurations.sqlite3");




class Database {
    db: sqliteDB | null;

    constructor() {
        if (!fs.existsSync(DATABASE_DIRECTORY)) {
            fs.mkdirSync(DATABASE_DIRECTORY);
        }

        let db_options = {
            filename: DATABASE_PATH.toString(),
            driver: sqlite3.Database
        } as any;

        this.db = null;
        let my = this;

        open(db_options).then((d: sqliteDB) => {
            my.db = d;
        }).catch((err) => {
            console.log("Error opening database ", db_options);

        });
    };

};

