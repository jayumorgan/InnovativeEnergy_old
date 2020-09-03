import sqlite3 from "sqlite3";
import { open, Database as sqliteDB } from "sqlite";
import path from "path";
import fs from "fs";
//---------------Notes---------------
// Make promise chains less stupid.


//-------NB: These we be in the dist directory (typescript)-------
const DATABASE_DIRECTORY = path.join(__dirname, "..", "db");
const DATABASE_PATH = path.join(DATABASE_DIRECTORY.toString(), "Configurations.sqlite3");


// NB: This is a first step in the move from .json configuraiton files to sqlite3 to improve 
// inter and intra config stability. Eventually data should migrate from raw_json to other columns + tables (allowing reuse of boxes, MM's, references from Machine Config -> Pallet Config)

//---------------Initialization Queries---------------
const CREATE_MACHINE_CONFIGS: string = `
CREATE TABLE IF NOT EXISTS machine_configs (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
name TEXT,
raw_json BLOB,
selected INTEGER NOT NULL DEFAULT 0
);`;
const CREATE_PALLET_CONFIGS: string = `
CREATE TABLE IF NOT EXISTS pallet_configs (
id INTEGER PRIMARY KEY NOT NULL UNIQUE,
name TEXT,
raw_json BLOB,
selected INTEGER NOT NULL DEFAULT 0
);`;
// const CREATE_CURRENT_TABLE: string = `
// CREATE TABLE IF NOT EXISTS current_config (
// id INTEGER PRIMARY KEY NOT NULL UNIQUE,
// machine_config_id INTEGER NOT NULL,
// pallet_config_id INTEGER NOT NULL,
// FOREIGN KEY(machine_config_id) REFERENCES machine_configs(id),
// FOREIGN KEY(pallet_config_id) REFERENCES pallet_configs(id)
// );`;

//---------------Select Queries---------------
const SELECT_ALL_MACHINE_CONFIGS = `SELECT id, name FROM machine_configs;`
const SELECT_ALL_PALLET_CONFIGS = `SELECT id, name FROM pallet_configs`;
const SELECT_MACHINE_CONFIG_ID = `SELECT raw_json FROM machine_configs WHERE id = ?`;
const SELECT_PALLET_CONFIG_ID = `SELECT raw_json FROM pallet_configs WHERE id = ?`;
const SELECT_CURRENT_MACHINE_CONFIG = `SELECT id, name, raw_json FROM machine_configs WHERE selected = 1`;
const SELECT_CURRENT_PALLET_CONFIG = `SELECT id, name, raw_json FROM pallet_configs WHERE selected = 1;`;

//---------------Write Queries---------------
const UPDATE_CURRENT_PALLET = `UPDATE pallet_configs SET selected = (CASE WHEN id = ? THEN 1 ELSE 0 END) WHERE id > 0;`;
const UPDATE_CURRENT_MACHINE = `UPDATE machine_configs SET selected = (CASE WHEN id = ? THEN 1 ELSE 0 END) WHERE id > 0;`;
const INSERT_MACHINE_CONFIG = `INSERT INTO machine_configs (name, raw_json) VALUES (?,?);`;
const INSERT_PALLET_CONFIG = `INSERT INTO pallet_configs (name, raw_json) VALUES (?,?);`;
const UPDATE_PALLET_CONFIG = `UPDATE pallet_configs SET name = ?, raw_json = ? WHERE id = ?;`;
const UPDATE_MACHINE_CONFIG = `UPDATE machine_configs SET name = ?, raw_json = ? WHERE id =?;`

//---------------Delete Queries---------------
const DELETE_MACHINE_CONFIG = `DELETE FROM machine_configs WHERE id = ?;`;
const DELETE_PALLET_CONFIG = `DELTE FROM pallet_configs WHERE id = ?;`;

//---------------Current Config Checks---------------
const DEFAULT_CURRENT_MACHINE_CONFIG = `UPDATE machine_configs SET selected = (CASE WHEN EXISTS(SELECT 1 FROM machine_configs WHERE selected = 1 LIMIT 1) THEN selected ELSE 1 END) WHERE id IN (SELECT MIN(id) FROM machine_configs);`
const DEFAULT_CURRENT_PALLET_CONFIG = `UPDATE pallet_configs SET selected = (CASE WHEN EXISTS(SELECT 1 FROM pallet_configs WHERE selected = 1 LIMIT 1) = 1 THEN selected ELSE 1 END) WHERE id IN (SELECT MIN(id) FROM pallet_configs);`


export class DatabaseHandler {
    db: sqliteDB;

    constructor(db: sqliteDB) {
        this.db = db;
    };

    __checkCurrentConfigs() {
        let my = this;
        return new Promise((resolve, reject) => {
            my.db.run(DEFAULT_CURRENT_PALLET_CONFIG).then(() => {
                return my.db.run(DEFAULT_CURRENT_MACHINE_CONFIG)
            }).then(() => {
                resolve();
            }).catch(e => reject(e));
        });
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
            my.__checkCurrentConfigs().then(() => {
                my.getMachineConfigs().then((mc: any) => {
                    my.getPalletConfigs().then((pc: any) => {
                        resolve({
                            pallet: pc,
                            machine: mc
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
        let my = this;
        return new Promise((resolve, reject) => {
            my.__checkCurrentConfigs().then(() => {
                my.db.get(SELECT_CURRENT_MACHINE_CONFIG).then((machine: any) => {
                    my.db.get(SELECT_CURRENT_PALLET_CONFIG).then((pallet: any) => {
                        resolve({
                            machine,
                            pallet
                        });
                    }).catch(e => reject(e));
                }).catch(e => reject(e));
            }).catch(e => reject(e));
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

    updateMachineConfig(name: string, data: any, id: number) {
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(UPDATE_MACHINE_CONFIG, [name, data_string, id]);
    };

    updatePalletConfig(name: string, data: any, id: number) {
        let data_string = JSON.stringify(data, null, "\t");
        return this.db.run(UPDATE_PALLET_CONFIG, [name, data_string, id]);
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
            db.exec(CREATE_MACHINE_CONFIGS + CREATE_PALLET_CONFIGS).then(() => {
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
