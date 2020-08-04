import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import PlusIcon, { IconProps } from "./PlusIcon";


import { PalletGeometry, PlaneDimensions, BoxDimensions, BoxObject } from "./structures/Data";

import "./css/Layout.scss";

interface NewLayoutCellProps {
    startEdit: () => void;
}

interface DropDownProps {
    allPallets: PalletGeometry[];
}

function LayoutDropDown({ allPallets }: DropDownProps) {
    return (
        <div className="LayoutDropDown">
            <select>
                {allPallets.map((pallet: PalletGeometry, index: number) => {
                    return (
                        <option value={index} key={index}> {pallet.name} </option>
                    );
                })}
            </select>
        </div>
    );
};

interface LayoutModelProps {
    pallet: PalletGeometry;
    size: number; // 650 for half content width;
}


export function LayoutModel({ pallet, size }: LayoutModelProps) {
    let dimensions: PlaneDimensions = pallet.getDimensions();

    let norm = Math.sqrt(dimensions.width ** 2 + dimensions.length ** 2);

    let w = dimensions.width / norm * size;
    let l = dimensions.length / norm * size;

    // Scale up the coordinates to take maximum size.
    let scale = (w >= l) ? size / w : size / l;

    w *= scale;
    l *= scale;

    let cx = size / 2;
    let cy = size / 2;

    let logColor = "#D2AB6F";

    let bottomLog: Rect = {
        x: cx - w / 2,
        y: size - (size - l) / 2 - size / 10,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };

    let topLog: Rect = {
        x: cx - w / 2,
        y: (size - l) / 2,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };

    // Horizontal planks....
    let plankColor = "#E6BF83";

    let planks = [] as Rect[];
    let plankNumber = 6;
    let spaceFraction = 2 / 3;
    let plankWidth = w * spaceFraction / plankNumber;
    let iX = (w - plankNumber * plankWidth) / (plankNumber - 1) + plankWidth;
    let startX = (size - w) / 2;
    let Y = (size - l) / 2;

    for (let i = 0; i < plankNumber; i++) {
        let plk: Rect = {
            x: startX + i * iX,
            y: Y,
            width: plankWidth,
            height: l,
            fill: plankColor,
            stroke: plankColor,
            strokeWidth: 0
        };
        planks.push(plk);
    }

    return (

        <svg width={size} height={size} >
            <rect {...bottomLog} />
            <rect {...topLog} />
            {planks.map((r: Rect, index: number) => {
                return (
                    <rect {...r} key={index} />
                );
            })}
            {/* <rect {...rect} /> */}
        </svg>

    );
};
//---------------Box Image Props---------------
interface BoxImageProps {
    width: number;
    length: number;
}


export interface Rect {
    x: string | number;
    y: string | number;
    width: string | number;
    height: string | number;
    fill: string;
    stroke: string;
    strokeWidth: number | string;
};

/* <rect x="50" y="20" width="150" height="150"
 * style="fill:blue;stroke:pink;stroke-width:5;fill-opacity:0.1;stroke-opacity:0.9" /> */

function BoxImage({ width, length }: BoxImageProps) {
    let norm = Math.sqrt(width ** 2 + length ** 2);

    let w = width / norm * 100;
    let h = length / norm * 100;

    let x = 50 - w / 2;
    let y = 50 - h / 2;

    let cardboard = "#AD8762";
    let box = "#DC9F61";

    let rect: Rect = {
        x,
        y,
        width: w,
        height: h,
        fill: box,
        stroke: cardboard,
        strokeWidth: "1"
    };
    return (
        <div className="BoxImage">
            <svg width="100" height="100">
                <g transform="scale(1,1)">
                    <rect {...rect} />
                </g>
            </svg>
        </div>
    )
}


function NewLayoutCell({ startEdit }: NewLayoutCellProps) {
    let iconSize = {
        height: 50,
        width: 50
    } as IconProps;

    return (
        <div className="BoxCellContainer">
            <div className="NewBoxCell" onClick={startEdit}>
                <div className="Icon">
                    <PlusIcon {...iconSize} />
                </div>
                <div className="BoxName">
                    <span>
                        {"Create A New Layout"}
                    </span>
                </div>
            </div>
        </div>
    );
};



interface DimensionCellProps {
    axis: string;
    value: number;
}

function DimensionCell({ axis, value }: DimensionCellProps) {

    return (
        <div className="DimensionCell">
            <span>
                {axis + ": " + String(value)}
            </span>
        </div>
    );
}


interface SummaryProps {
    startEdit: () => void;
}

function LayoutSummary({ startEdit }: SummaryProps) {
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    <NewLayoutCell startEdit={startEdit} />
                    {/* {allBoxes.map((val: BoxDimensions, index: number) => {
                        return (
                        <BoxCell {...val} />
                        )
			})} */}
                </div>
            </div>
        </div>
    );
}




interface LayoutProps {
    allBoxes: BoxObject[];
    allPallets: PalletGeometry[];
};


function Layout({ allBoxes, allPallets }: LayoutProps) {

    let [summaryScreen, setSummaryScreen] = useState<boolean>(true);

    let startEdit = () => {
        setSummaryScreen(false);
    };

    let instruction: string;
    let placeholder = "Pallet Layout " + String(1);


    if (summaryScreen) {
        instruction = "Create and edit layouts";
        return (
            <ContentItem instruction={instruction}>
                <LayoutSummary startEdit={startEdit} />
            </ContentItem>
        );

    } else {
        instruction = "Drag and drop boxes to create a layout";
        return (
            <ContentItem instruction={instruction}>
                <div className="LayoutContainer">
                    <div className="LayoutName">
                        <div className="NameHolder">
                            <input type="text" placeholder={placeholder} />
                        </div>
                    </div>
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allBoxes.map((box: BoxObject, key: number) => {
                                return (
                                    <div className="BoxCellContainer" key={key}>
                                        <div className="BoxCell">
                                            <BoxImage {...box.dimensions} />
                                            <div className="BoxDetails">
                                                <div className="BoxName">
                                                    <span>
                                                        {"Box 1"}
                                                    </span>
                                                </div>
                                                <div className="BoxDimensions">
                                                    <DimensionCell axis={"Width"} value={box.dimensions.width} />
                                                    <DimensionCell axis={"Length"} value={box.dimensions.length} />
                                                    <DimensionCell axis={"Height"} value={box.dimensions.height} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="LayoutModel">
                        <LayoutDropDown allPallets={allPallets} />
                        <div className="LayoutDisplay">
                            <LayoutModel pallet={allPallets[0]} size={650} />
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};


export default Layout;
