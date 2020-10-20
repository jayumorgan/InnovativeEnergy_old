import React from "react";
import { Rect } from "../../geometry/geometry";


export interface IconProps {
    height: number;
    width: number;
}


export function XIcon({ height, width }: IconProps) {
    const line_1 = {
        x1: "2%",
        x2: "98%",
        y1: "2%",
        y2: "98%"
    } as any;

    const line_2 = {
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


export interface RotateIconProps {
    size: number;
    rotate: boolean;
};

export function RotateIcon({ size, rotate }: RotateIconProps) {
    let dString: string = "M 35 15 L 35 15, 70 15 C 75 15, 75 15, 75 35 L 75 35 75 55";
    let scale = Math.round(size / 100 * 10) / 10;
    let scaleString = `scale(${scale}, ${scale})`;
    let rectProps: Rect = {
        x: 10,
        y: 30,
        width: 50,
        height: 50,
        fill: "none",
        stroke: "black",
        strokeWidth: 3
    };

    let pathProps = {
        d: dString,
        stroke: "black",
        strokeWidth: size / 15,
        fill: "transparent",
    } as any;

    if (!rotate) {
        pathProps.markerStart = "url(#arrowheadback)";
    } else {
        pathProps.markerEnd = "url(#arrowhead)";
    }

    return (
        <svg width={size} height={size}>
            <g transform={scaleString}>
                <marker id="arrowhead" markerWidth={5} markerHeight={4}
                    refX="0" refY="2" orient="auto">
                    <polygon points="0 0, 5 2, 0 4" />
                </marker>
                <marker id="arrowheadback" markerWidth={5} markerHeight={4}
                    refX="2.5" refY="2" orient="auto">
                    <polygon points="5 0, 0 2, 5 4" />
                </marker>
                <rect {...rectProps} />
                <path {...pathProps} />
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




