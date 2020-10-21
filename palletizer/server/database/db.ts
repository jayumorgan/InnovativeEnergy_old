import sqlite3 from "sqlite3";
import { open, Database as sqliteDB } from "sqlite";
import path from "path";
import fs from "fs";
import Logger, { log_fn } from "../log/log";

//---------------Log---------------
const log: log_fn = Logger().db_log;

//---------------Notes---------------
// Make it easier to modify raw_json (development).


//-------NB: These we be in the dist directory (typescript)-------
const DATABASE_DIRECTORY = path.join(__dirname, "..", "db");
//const filename: string = "cf.sqlite3";
//const DATABASE_PATH = path.join(DATABASE_DIRECTORY.toString(), "cf.sqlite3");
const DATABASE_PATH = path.join(DATABASE_DIRECTORY.toString(), "Configurations.sqlite3");

// NB: This is a first step in the move from .json configuraiton files to sqlite3 to improve 
// inter and intra config stability. Eventually data should migrate from raw_json to other columns + tables (allowing reuse of boxes, MM's, references from Machine Config -> Pallet Config)

//---------------Initialization Queries---------------
const CREATE_MACHINE_CONFIGS: string = `
CREATE TABLE IF NOT EXISTS machine_configs (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
name TEXT,
raw_json BLOB,
complete INTEGER NOT NULL DEFAULT 0
);`;
const CREATE_PALLET_CONFIGS: string = `
CREATE TABLE IF NOT EXISTS pallet_configs (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
name TEXT,
raw_json BLOB,
machine_config_id INTEGER NOT NULL,
complete INTEGER NOT NULL DEFAULT 0,
selected INTEGER NOT NULL DEFAULT 0,
FOREIGN KEY(machine_config_id) REFERENCES machine_configs(id)
);`;

//---------------Select Queries---------------
const SELECT_ALL_MACHINE_CONFIGS = `SELECT id, name, complete FROM machine_configs;`
const SELECT_ALL_COMPLETE_MACHINE_CONFIGS = `SELECT id, name, complete FROM machine_configs WHERE complete = 1;`;
const SELECT_ALL_PALLET_CONFIGS = `SELECT id, name, machine_config_id, complete FROM pallet_configs;`;
const SELECT_ALL_COMPLETE_PALLET_CONFIGS = `SELECT id, name, machine_config_id, complete FROM pallet_configs WHERE complete = 1;`;

//---------------Select Configurations By ID---------------
const SELECT_MACHINE_CONFIG_ID = `SELECT id, name, raw_json, complete FROM machine_configs WHERE id = ?`;
const SELECT_PALLET_CONFIG_ID = `SELECT id, name, raw_json, machine_config_id, complete FROM pallet_configs WHERE id = ?`;
const SELECT_CURRENT_PALLET_CONFIG = `SELECT id, name, raw_json, machine_config_id, complete FROM pallet_configs WHERE selected = 1;`;

//---------------Write Queries---------------
const UPDATE_CURRENT_PALLET = `UPDATE pallet_configs SET selected = (CASE WHEN id = ? THEN 1 ELSE 0 END) WHERE id > 0;`;
const INSERT_MACHINE_CONFIG = `INSERT INTO machine_configs (name, raw_json, complete) VALUES (?,?,?);`;
const INSERT_PALLET_CONFIG = `INSERT INTO pallet_configs (name, raw_json, machine_config_id, complete) VALUES (?,?,?,?);`;
const UPDATE_PALLET_CONFIG = `UPDATE pallet_configs SET name = ?, raw_json = ?, machine_config_id = ?, complete = ? WHERE id = ?;`;
const UPDATE_MACHINE_CONFIG = `UPDATE machine_configs SET name = ?, raw_json = ?, complete = ? WHERE id = ?;`

//---------------Delete Queries---------------
const DELETE_MACHINE_CONFIG = `DELETE FROM machine_configs WHERE id = ?;`;
const DELETE_PALLET_BY_MACHINE = `DELETE FROM pallet_configs WHERE machine_config_id = ?;`;
const DELETE_PALLET_CONFIG = `DELETE FROM pallet_configs WHERE id = ?;`;

//---------------Current Config Checks---------------
const DEFAULT_CURRENT_PALLET_CONFIG = `UPDATE pallet_configs SET selected = (CASE WHEN EXISTS(SELECT 1 FROM pallet_configs WHERE selected = 1 LIMIT 1) = 1 THEN selected ELSE 1 END) WHERE id IN (SELECT MIN(id) FROM pallet_configs);`

export class DatabaseHandler {
    db: sqliteDB;


    constructor(db: sqliteDB) {
        this.db = db;
    };

    __checkCurrentConfigs() {
        const my = this;
        return new Promise((resolve, reject) => {
            my.db.run(DEFAULT_CURRENT_PALLET_CONFIG).then(() => {
                resolve();
            }).catch((e: any) => {
                my
                reject(e);
            });
        });
    };

    getMachineConfigs() {
        return this.db.all(SELECT_ALL_MACHINE_CONFIGS);
    };

    getCompleteMachineConfigs() {
        return this.db.all(SELECT_ALL_COMPLETE_MACHINE_CONFIGS);
    };

    getPalletConfigs() {
        return this.db.all(SELECT_ALL_PALLET_CONFIGS);
    };

    getCompletePalletConfigs() {
        return this.db.all(SELECT_ALL_COMPLETE_PALLET_CONFIGS);
    };

    getAllConfigs() {
        const my = this;
        return new Promise((resolve, reject) => {
            my.__checkCurrentConfigs().then(() => {
                my.getMachineConfigs().then((machine: any) => {
                    my.getPalletConfigs().then((pallet: any) => {
                        resolve({
                            pallet,
                            machine
                        });
                    }).catch(e => reject(e));
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
        const my = this;
        return new Promise((resolve, reject) => {
            my.__checkCurrentConfigs().then(() => {
                my.db.get(SELECT_CURRENT_PALLET_CONFIG).then((pallet: any) => {
                    if (pallet) {
                        let { machine_config_id } = pallet;
                        my.getMachineConfig(machine_config_id).then((machine: any) => {
                            resolve({
                                machine,
                                pallet
                            });
                        }).catch(e => reject(e));
                    } else {
                        resolve({
                            machine: [] as any,
                            pallet: [] as any
                        })
                    }
                }).catch(e => reject(e));
            }).catch(e => reject(e));
        });
    };

    setCurrentPalletConfig(id: number) {
        // Current machine configuration is inferred from the pallet configuration.
        return this.db.run(UPDATE_CURRENT_PALLET, [id]);
    };

    addPalletConfig(name: string, data: any, complete: boolean) {
        let machine_config_id = data.config.machine_config_id;
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(INSERT_PALLET_CONFIG, [name, data_string, machine_config_id, complete ? 1 : 0]);
    };

    addMachineConfig(name: string, data: any, complete: boolean) {
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(INSERT_MACHINE_CONFIG, [name, data_string, complete ? 1 : 0]);
    };

    updateMachineConfig(id: number, name: string, data: any, complete: boolean) {
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(UPDATE_MACHINE_CONFIG, [name, data_string, complete, id]);
    };

    updatePalletConfig(id: number, name: string, data: any, complete: boolean) {
        let machine_config_id = data.config.machine_config_id;
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(UPDATE_PALLET_CONFIG, [name, data_string, machine_config_id, complete, id]);
    };

    async deleteMachineConfig(id: number) {
        const my = this;
        return my.db.run(DELETE_PALLET_BY_MACHINE, [id]).then(() => {
            return my.db.run(DELETE_MACHINE_CONFIG, [id]);
        });
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
            db.exec(CREATE_MACHINE_CONFIGS + CREATE_PALLET_CONFIGS).then(() => {
                resolve(db);
            }).catch((e: any) => {
                reject(e);
            });
        }).catch((e) => {
            log(e);
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
