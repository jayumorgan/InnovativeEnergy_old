import React from "react";

export enum ROTATION {
    UP,
    RIGHT,
    DOWN,
    LEFT
};

interface ArrowProps {
    size: number;
    rotation?: ROTATION;
    longer?: number;
};


function percentage(p: number, scale: number) {
    return String(p * scale / 100);
}


interface point {
    x: number;
    y: number;
}

function rotate(p: point, center: point, θ: number): point {
    let vec: number[] = [p.x, p.y];
    let c: number[] = [center.x, center.y];
    let sine = Math.sin(θ);
    let cosine = Math.cos(θ);
    // Clockwise rotation matrix
    let rM: number[][] = [[cosine, -1 * sine], [1 * sine, cosine]];
    let outvec = rM.map((row: number[]) => {
        let val = 0;
        row.forEach((r: number, i: number) => {
            val += r * (vec[i] - c[i]);
        });
        return val;
    });
    return {
        x: outvec[0] + c[0],
        y: outvec[1] + c[1]
    } as point;
}

export default function SolidArrow({ size, rotation, longer }: ArrowProps) {
    let width = size;
    let height = longer ? longer : size;

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

    let rot = rotation ? rotation as number : 0;
    let center: point = {
        x: 50,
        y: 50
    };

    let isSideways = !(rot % 2 === 0);

    let svgProps = {
        height: isSideways ? width : height,
        width: isSideways ? height : width
    };

    points.forEach((p: point) => {
        let pt = rotate(p, center, rot * Math.PI / 2);
        polygon.points += percentage(pt.x, svgProps.width);
        polygon.points += "," + percentage(pt.y, svgProps.height);
        polygon.points += " ";
    });

    let g_props = {
        transform: `scale(1,1)`
        //transform: `scale(1,1), rotate(${rot * 90} ${width / 2} ${height / 2})`
    } as any;

    return (
        <svg {...svgProps}>
            <g {...g_props} >
                <polygon {...polygon} />
            </g>
        </svg>
    );
};
