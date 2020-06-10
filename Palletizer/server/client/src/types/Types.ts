
export type PalletizerError = {
    date: Date;
    description: string;
}


export type PalletizerState = {
    status : string;
    cycle: number;
    current_box: number; 
    total_box: number;
    time: number; // hours? 
    errors: PalletizerError[];
};

export type PartialState = {
    status : string;
    cycle: number;
    current_box: number; 
    total_box: number;
    time: number; // hours? 
};

