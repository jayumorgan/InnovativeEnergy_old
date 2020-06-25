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
    status : string;
    cycle : number;
    current_box: number; 
    total_box: number;
    time: number; // hours? 
    information: PalletizerInformation[];
    coordinates: any[];
};

export type PartialState = {
    status : string;
    cycle : number;
    current_box: number; 
    total_box: number;
    time: number; // hours? 
    coordinates: any[];
};

export type ConfigState = {
    machine_configs : string[];
    pallet_configs : string[];
    machine_index : number|null;
    pallet_index : number|null;
}

