import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import PlusIcon, { IconProps } from "./PlusIcon";

import { BoxDimensions } from "./3D/BoxRender";

import { PalletGeometry } from "./structures/Data";

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

}
function LayoutModel({ pallet }: LayoutModelProps) {

    return (
        <div className="LayoutModel">
            <svg>


            </svg>
        </div>
    );
};
//---------------Box Image Props---------------
interface BoxImageProps {
    width: number;
    length: number;
}


interface Rect {
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

    let rect: Rect = {
        x,
        y,
        width: w,
        height: h,
        fill: "#AD8762",
        stroke: "black",
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
    allBoxes: BoxDimensions[];
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
                            {allBoxes.map((box: BoxDimensions, key: number) => {
                                return (
                                    <div className="BoxCellContainer" key={key}>
                                        <div className="BoxCell">
                                            <BoxImage {...box} />
                                            <div className="BoxDetails">
                                                <div className="BoxName">
                                                    <span>
                                                        {"Box 1"}
                                                    </span>
                                                </div>
                                                <div className="BoxDimensions">
                                                    <DimensionCell axis={"Width"} value={box.width} />
                                                    <DimensionCell axis={"Length"} value={box.length} />
                                                    <DimensionCell axis={"Height"} value={box.height} />
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
                    </div>
                </div>
            </ContentItem>
        );
    }
};


export default Layout;
