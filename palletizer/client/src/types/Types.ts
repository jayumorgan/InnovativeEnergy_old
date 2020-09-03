import { SavedPalletConfiguration } from "../parts/TeachMode";

export type ReducerAction = {
    type_of: string;
    payload: any;
};


export type PalletizerInformation = {
    DateString: string;
    Description: string;
    Type: string;
};

export type PalletizerState = {
    status: string;
    cycle: number;
    current_box: number;
    total_box: number;
    time: number; // hours? 
    information: PalletizerInformation[];
    palletConfig?: SavedPalletConfiguration;
};

export type PartialState = {
    status: string;
    cycle: number;
    current_box: number;
    total_box: number;
    time: number; // hours? 
    palletConfig?: SavedPalletConfiguration;
};


export interface ConfigItem {
    id: number;
    name: string;
}

export type ConfigState = {
    machine_configs: ConfigItem[];
    pallet_configs: ConfigItem[];
    machine_index: number;
    pallet_index: number;
}

