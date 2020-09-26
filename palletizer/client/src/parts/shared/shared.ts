import { ChangeEvent } from "react";

export interface ControlProps {
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

export enum COLORS {
    BOX = "rgb(89,69,50)",
    CLEAR_BOX = "rgba(89,69,50,0.9)",
    MOVE_BOX = "rgba(195,129,66, 0.9)",
    LOG = "#D2AB6F",
    PLANK = "#E6BF83",
    DARK_PLANK = "rgb(230, 191,131)",
    YELLOW_METAL = "#725932",
    CARDBOARD = "#AD8762"
};

export function changeEventToNumber(e: ChangeEvent): number {
    let val: number = +(e.target as any).value;
    return val;
};

export function changeEventToString(e: ChangeEvent): string {
    let val: string = (e.target as any).value;
    return String(val);
};

export function wrapChangeEventString(fn: (s: string) => void): (e: ChangeEvent) => void {
    return (e: ChangeEvent) => {
        fn(changeEventToString(e));
    };
};

export function wrapChangeEventNumber(fn: (n: number) => void): (e: ChangeEvent) => void {
    return (e: ChangeEvent) => {
        fn(changeEventToNumber(e));
    }
};

