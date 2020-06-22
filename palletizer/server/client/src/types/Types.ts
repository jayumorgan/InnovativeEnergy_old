export type ReducerAction = {
    type_of: string;
    payload: any;
};


export type PalletizerError = {
    date: Date;
    description: string;
}


export type PalletizerState = {
    status : string;
    cycle : number;
    current_box: number; 
    total_box: number;
    time: number; // hours? 
    errors: PalletizerError[];
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

