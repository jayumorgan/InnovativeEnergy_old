import { SavedPalletConfiguration } from "../parts/TeachMode";
import { DropCoordinate } from "../context/PalletizerContext";

export type ReducerAction = {
    type_of: string;
    payload: any;
};

export type PalletizerInformation = {
    DateString: string;
    Description: string;
    Type: string;
};

export enum PALLETIZER_STATUS {
    SLEEP = "Sleep",
    PAUSED = "Paused",
    COMPLETE = "Complete",
    ERROR = "Error",
    STOPPED = "Stopped",
    RUNNING = "Running",
    OFFLINE = "Offline"
};


export interface PalletizerState {
    status: PALLETIZER_STATUS;
    cycle: number;
    current_box: number;
    total_box: number;
    time: number; // hours? 
    palletConfig?: SavedPalletConfiguration;
    dropCoordinates: DropCoordinate[];
    information: PalletizerInformation[];
};

export interface ConfigItem {
    id: number;
    name: string;
    machine_config_id?: number;
    complete: boolean;
};

export type ConfigState = {
    machine_configs: ConfigItem[];
    pallet_configs: ConfigItem[];
    machine_index: number;
    pallet_index: number;
    reloadConfigs: () => void;
};

