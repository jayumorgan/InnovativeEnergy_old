import React from "react";

export enum ROTATION {
    UP,
    RIGHT,
    DOWN,
    LEFT
};

interface ArrowProps {

    size: number;
    rotation?: ROTATION
};


function percentage(p: number, scale: number) {
    return String(p * scale / 100);
}


interface point {
    x: number;
    y: number;
}

export default function SolidArrow({ size, rotation }: ArrowProps) {
    let width = size;
    let height = size;

    let polygon = {
        points: ""
    } as any;

    let leftX = 0;
    let rightX = 100;
    let innerX = 20;
    let outerX = rightX - innerX;
    let midX = (rightX - leftX) / 2;

    let topY = 0;
    let bottomY = 100;
    let sideY = (bottomY - topY) / 2;

    let points = [] as point[];

    points.push({ x: leftX, y: sideY }); // left corner
    points.push({ x: midX, y: topY }); // top peak
    points.push({ x: rightX, y: sideY }); // right corner
    points.push({ x: outerX, y: sideY }); // right inset
    points.push({ x: outerX, y: bottomY }); // right bottom;
    points.push({ x: innerX, y: bottomY }); // left bottom;
    points.push({ x: innerX, y: sideY }); // right inset;

    points.forEach((p: point) => {
        polygon.points += percentage(p.x, width);
        polygon.points += "," + percentage(p.y, height);
        polygon.points += " ";
    });



    let rot = rotation ? rotation as number : 0;


    let g_props = {
        transform: `scale(1,1), rotate(${rot * 90} ${width / 2} ${height / 2})`
    } as any;


    return (
        <svg width={width} height={height}>
            <g {...g_props} >
                <polygon {...polygon} />
            </g>
        </svg>
    );
};
