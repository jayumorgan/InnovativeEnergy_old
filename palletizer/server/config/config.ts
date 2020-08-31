// File Handling
import fs, { BaseEncodingOptions, Dirent } from "fs";
import path from "path";

// Python process.
import { spawn } from "child_process";

// Configuration
export const CONFIG_ROOT: fs.PathLike = path.join(__dirname, '..', '..', '..', 'machine', 'config');
export const CURRENT_CONFIG_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'current_configuration.json');
export const CONFIG_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'config');
export const MACHINE_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'machine');
export const PALLET_PATH: fs.PathLike = path.join(CONFIG_ROOT.toString(), 'pallet');

export interface ConfigUpload {
    filename: string;
    machine: boolean;
    data: any;
};

console.log(CONFIG_PATH);

export interface ConfigData {
    machine_configs: string[];
    pallet_configs: string[];
    machine_index: number;
    pallet_index: number;
};

export interface CurrentConfig {
    machine: string;
    pallet: string;
};




export function getConfigs(): Promise<ConfigData> {

    return new Promise<ConfigData>((resolve, reject) => {
        fs.readFile(CURRENT_CONFIG_PATH, { encoding: "utf-8" }, (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                reject(err);
            } else {
                let { machine, pallet } = JSON.parse(data) as CurrentConfig;

                let options = {
                    withFileTypes: true
                } as BaseEncodingOptions;

                let machine_configs = fs.readdirSync(MACHINE_PATH, options);
                let pallet_configs = fs.readdirSync(PALLET_PATH, options);

                let m_configs = [] as string[];
                let p_configs = [] as string[];
                let m_selected = -1;
                let p_selected = -1;

                machine_configs.forEach((item: any, index: number) => {
                    item = item as Dirent;
                    if (item.isFile() && path.extname(item.name) === ".json") {
                        m_configs.push(item.name);
                        if (machine && item.name === machine) {
                            m_selected = index;
                        }
                    }
                });

                if (m_selected === -1) {
                    m_selected = 0;
                    if (machine_configs.length > 0) {
                        setSelectedConfig(m_configs[0] as string, "machine");
                    }
                }

                pallet_configs.forEach((item: any, index: number) => {
                    item = item as Dirent;
                    if (item.isFile() && path.extname(item.name) === ".json") {
                        p_configs.push(item.name);
                        if (pallet && item.name === pallet) {
                            p_selected = index;
                        }
                    }
                });

                if (p_selected === -1) {
                    p_selected = 0;
                    if (pallet_configs.length > 0) {
                        setSelectedConfig(p_configs[0] as string, "pallet");
                    }
                };

                let config_data: ConfigData = {
                    machine_configs: m_configs,
                    pallet_configs: p_configs,
                    machine_index: m_selected,
                    pallet_index: p_selected
                };

                resolve(config_data);
            }
        });
    });
};

export interface Configs {
    machine: string,
    pallet: string
};

// On selected
export function setSelectedConfig(file_name: string, config_type: string): Promise<boolean> {

    return new Promise<boolean>((resolve, reject) => {

        fs.readFile(CURRENT_CONFIG_PATH, { encoding: 'utf-8' }, (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                reject(err);
            } else {

                let cf = JSON.parse(data) as Configs;

                if (config_type) {
                    if (config_type === "machine") {
                        cf.machine = file_name;
                    } else {
                        cf.pallet = file_name;
                    }
                    fs.writeFile(CURRENT_CONFIG_PATH, JSON.stringify(cf, null, "\t"), () => {
                        resolve(true);
                        //                        callback(true);
                    });
                } else {
                    resolve(false)
                }
            }
        });

    });
};


