import React from "react";


export interface IconProps {
    height: number;
    width: number;
}

export default function PlusIcon({height, width} : IconProps) {
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


