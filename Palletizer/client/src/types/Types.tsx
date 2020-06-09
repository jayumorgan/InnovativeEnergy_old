
export type PalletizerState = {
    status : string;
    cycle: number;
    current_box: number; // [current, next]
    total_box: number;
    time: number; // hours? 
    errors: string[];
};
