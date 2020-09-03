import sqlite3 from "sqlite3";
import { open, Database as sqliteDB } from "sqlite";
import path from "path";
import fs from "fs";
import { resolve } from "dns";

//-------NB: These we be in the dist directory (typescript)-------
const DATABASE_DIRECTORY = path.join(__dirname, "..", "db");
const DATABASE_PATH = path.join(DATABASE_DIRECTORY.toString(), "Configurations.sqlite3");


//NB: This is a first step in the move from .json configuraiton files to sqlite3 to improve 
//inter and intra config stability.

//---------------Initialization Queries---------------
const CREATE_MACHINE_CONFIGS: string = `
CREATE TABLE IF NOT EXISTS machine_configs (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
name TEXT,
raw_json BLOB
);`;



const CREATE_PALLET_CONFIGS: string = `
CREATE TABLE IF NOT EXISTS pallet_configs (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
name TEXT,
raw_json BLOB
);`;


const CREATE_CURRENT_TABLE: string = `
CREATE TABLE IF NOT EXISTS current_config (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
machine_config_id INTEGER NOT NULL,
pallet_config_id INTEGER NOT NULL,
FOREIGN KEY(machine_config_id) REFERENCES machine_configs(id),
FOREIGN KEY(pallet_config_id) REFERENCES pallet_configs(id)
);`;

//---------------Select Queries---------------
const SELECT_ALL_MACHINE_CONFIGS = `SELECT id, name FROM machine_configs;`
const SELECT_ALL_PALLET_CONFIGS = `SELECT id, name FROM pallet_configs`;
const SELECT_MACHINE_CONFIG_ID = `SELECT raw_json FROM machine_configs WHERE id = ?`;
const SELECT_PALLET_CONFIG_ID = `SELECT raw_json FROM pallet_configs WHERE id = ?`;

const SELECT_CURRENT_MACHINE_CONFIG = `SELECT id, name, raw_json FROM machine_configs WHERE id IN (SELECT machine_config_id FROM current_config);`;
const SELECT_CURRENT_PALLET_CONFIG = `SELECT id, name, raw_json FROM pallet_configs WHERE id IN (SELECT pallet_config_id FROM current_config);`;


//---------------Write Queries---------------
const UPDATE_CURRENT_PALLET = `UPDATE current_configs SET pallet_config_id = ? WHERE id > 0;`;
const UPDATE_CURRENT_MACHINE = `UPDATE current_configs SET machine_config_id = ? WHERE i > 0;`;
const INSERT_MACHINE_CONFIG = `INSERT INTO machine_configs (name, raw_json) VALUES (?,?)`;
const INSERT_PALLET_CONFIG = `INSERT INTO pallet_configs (name, raw_json) VALUES (?,?)`;


//---------------Delete Queries---------------
const DELETE_MACHINE_CONFIG = `DELETE FROM machine_configs WHERE id = ?;`;
const DELETE_PALLET_CONFIG = `DELTE FROM pallet_configs WHERE id = ?;`;

export class DatabaseHandler {
    db: sqliteDB;

    constructor(db: sqliteDB) {
        this.db = db;
    };

    getMachineConfigs() {
        return this.db.all(SELECT_ALL_MACHINE_CONFIGS);
    };

    getPalletConfigs() {
        return this.db.all(SELECT_ALL_PALLET_CONFIGS);
    };

    getAllConfigs() {
        let my = this;
        return new Promise((resolve, reject) => {
            my.getMachineConfigs().then((mc: any) => {
                my.getPalletConfigs().then((pc: any) => {
                    resolve({
                        pallet: pc,
                        machine: mc
                    });
                }).catch(e => reject(e));
            }).catch(e => reject(e));
        });
    };

    getMachineConfig(id: number) {
        return this.db.get(SELECT_MACHINE_CONFIG_ID, [id]);
    };

    getPalletConfig(id: number) {
        return this.db.get(SELECT_PALLET_CONFIG_ID, [id]);
    };

    getCurrentConfigs() {
        let my = this;
        return new Promise((resolve, reject) => {
            my.db.get(SELECT_CURRENT_MACHINE_CONFIG).then((machine: any) => {
                my.db.get(SELECT_CURRENT_PALLET_CONFIG).then((pallet: any) => {
                    resolve({ machine, pallet });
                }).catch((e) => {
                    reject(e);
                });
            }).catch((e) => {
                reject(e);
            });
        });
    };

    setCurrentPalletConfig(id: number) {
        return this.db.run(UPDATE_CURRENT_PALLET, [id]);
    };

    setCurrentMachineConfig(id: number) {
        return this.db.run(UPDATE_CURRENT_MACHINE, [id]);
    };

    addPalletConfig(name: string, data: any) {
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(INSERT_PALLET_CONFIG, [name, data_string]);
    };

    addMachineConfig(name: string, data: any) {
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(INSERT_MACHINE_CONFIG, [name, data_string]);
    };

    deleteMachineConfig(id: number) {
        return this.db.run(DELETE_MACHINE_CONFIG, [id]);
    };

    deletePalletConfig(id: number) {
        return this.db.run(DELETE_PALLET_CONFIG, [id]);
    };


};

function getDatabase(): Promise<sqliteDB> {
    if (!fs.existsSync(DATABASE_DIRECTORY)) {
        fs.mkdirSync(DATABASE_DIRECTORY);
    }

    let db_options = {
        filename: DATABASE_PATH.toString(),
        driver: sqlite3.Database
    } as any;

    // create the tables,

    return new Promise((resolve, reject) => {
        open(db_options).then((db: sqliteDB) => {
            db.exec(CREATE_MACHINE_CONFIGS + CREATE_PALLET_CONFIGS + CREATE_CURRENT_TABLE).then(() => {
                resolve(db);
            }).catch((e: any) => {
                reject(e);
            });
        }).catch((e) => {
            console.log(e);
            reject(e)
        });
    });
};


export function initDatabaseHandler(): Promise<DatabaseHandler> {
    return new Promise((resolve, reject) => {
        getDatabase().then((db: sqliteDB) => {
            let handler = new DatabaseHandler(db);
            resolve(handler);
        }).catch(reject);;
    });
}
