import { SavedPalletConfiguration } from "../parts/TeachMode";
import { CoordinateRot } from "../geometry/geometry";

export type ReducerAction = {
    type_of: string;
    payload: any;
};

export type PalletizerInformation = {
    DateString: string;
    Description: string;
    Type: string;
};

export interface PartialState {
    status: string;
    cycle: number;
    current_box: number;
    total_box: number;
    time: number; // hours? 
    palletConfig?: SavedPalletConfiguration;
    dropCoordinates?: CoordinateRot[];
};

export interface PalletizerState extends PartialState {
    information: PalletizerInformation[];
};

export interface ConfigItem {
    id: number;
    name: string;
    machine_config_id?: number;
}

export type ConfigState = {
    machine_configs: ConfigItem[];
    pallet_configs: ConfigItem[];
    machine_index: number;
    pallet_index: number;
};

