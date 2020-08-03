import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import PlusIcon, { IconProps } from "./PlusIcon";

import { BoxDimensions } from "./3D/BoxRender";

import { PalletGeometry } from "./structures/Data";

import "./css/Layout.scss";

interface NewLayoutCellProps {
    startEdit: () => void;
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
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allBoxes.map((box: BoxDimensions, key: number) => {
                                return (
                                    <div className="BoxCellContainer" key={key}>
                                        <div className="BoxCell">
                                            <div className="BoxImage">

                                            </div>
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

                </div>
            </ContentItem>
        );
    }
};


export default Layout;
