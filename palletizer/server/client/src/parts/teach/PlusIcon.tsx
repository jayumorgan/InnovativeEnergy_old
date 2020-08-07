import React from "react";


export interface IconProps {
    height: number;
    width: number;
}



export function XIcon({ height, width }: IconProps) {

    let line_1 = {
        x1: "2%",
        x2: "98%",
        y1: "2%",
        y2: "98%"
    } as any;

    let line_2 = {
        x1: "2%",
        x2: "98%",
        y1: "98%",
        y2: "2%"
    } as any;

    return (
        <svg height={height} width={width}>
            <g transform="scale(1,1)">
                <line {...line_1} />
                <line {...line_2} />
            </g>
        </svg>
    );
};



export default function PlusIcon({ height, width }: IconProps) {
    let line_1 = {
        x1: "50%",
        y1: "0%",
        x2: "50%",
        y2: "100%"
    } as any;

    let line_2 = {
        x1: "0%",
        x2: "100%",
        y1: "50%",
        y2: "50%"
    } as any;

    return (
        <svg height={height} width={width}>
            <g transform="scale(1,1)">
                <line {...line_1} />
                <line {...line_2} />
            </g>
        </svg>
    );
}


