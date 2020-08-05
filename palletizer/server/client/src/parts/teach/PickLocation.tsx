import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import Jogger from "./Jogger";

interface CoordinateItemProps {
    axis: string;
    value: number;
};

function CoordinateItem({ axis, value }: CoordinateItemProps) {
    return (
        <div className="Coordinate">
            <span className="Axis">
                {axis.toUpperCase() + " :"}
            </span>
            <span className="Value">
                {value}
            </span>
        </div>
    );
}

interface CrossHairProps {
    scale: number;
    x: number; // Percent
    y: number; // Percent
};

function CrossHairs({ scale, x, y }: CrossHairProps) {
    let size = scale * 10;

    let x_c = `${x}%`;
    let y_c = `${y}%`;

    let fif = "50%";
    let sev = "75%";
    let twe = "25%";

    let line_1 = {
        x1: fif,
        y1: sev,
        x2: fif,
        y2: twe
    } as any;

    let line_2 = {
        x1: twe,
        x2: sev,
        y1: fif,
        y2: fif
    } as any;

    return (
        <svg height={size * 4} width={size * 4} x={x_c} y={y_c}>
            <g transform="scale(1,1)">
                <circle cx={fif} cy={fif} r={"15%"} />
                <line {...line_1} />
                <line {...line_2} />
            </g>
        </svg>
    );
};

function PickLocationMap() {
    let coordinates = {
        x: 20,
        y: 10,
        z: 400
    } as { [key: string]: number };

    let crossProps = {
        scale: 2,
        x: 50,
        y: 50
    } as CrossHairProps;

    return (
        <div className="PickLocationMap">
            <div className="Map">
                <svg width="200" height="200">
                    <g transform="scale(1,1)">
                        <rect width="100%" height="100%" />
                        <CrossHairs {...crossProps} />
                    </g>
                </svg>
            </div>
            <div className="CoordinateDisplay">
                {Object.keys(coordinates).map((key: string, index: number) => {
                    return (
                        <CoordinateItem axis={key} value={coordinates[key]} key={index} />
                    )
                })}
            </div>
        </div>
    );
};




// This should be moved into the box area


function PickLocation() {

    let pallet_seq_name = "Pallet Sequence 1";
    let input_name = "PalletSequenceTitle";

    let handle_input = (c: ChangeEvent) => {
        console.log("Handle change pallet seq name.");
    };

    let selectAction = () => {
        console.log("Jogger Position Selected");
    };

    let instruction = "Move and select box pick location";

    return (
        <ContentItem instruction={instruction}>
            <div className="PickLocationGrid">
                <Jogger selectAction={selectAction} />
                <PickLocationMap />
            </div>
        </ContentItem>
    );
    //    <PickLocationMap />
}


export default PickLocation;
