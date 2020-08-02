import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import { Coordinate, PlaneDimensions, PalletGeometry } from "./structures/Data";


import Jogger from "./Jogger";

import PalletRender from "./3D/PalletRender";
import PlusIcon, { IconProps } from "./PlusIcon";


// Styles for summary -- rename later.
import "./css/BoxSize.scss";

import PalletImage from "../images/Pallet.jpg";

enum Corners {
    ONE,
    TWO,
    THREE
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



function PalletCell() {
    let width = 100;
    let height = 100;
    let length = 100;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <img src={PalletImage} />
                </div>
                <div className="BoxDetails">
                    <div className="BoxName">
                        <span>
                            {"Pallet 1"}
                        </span>
                    </div>
                    <div className="BoxDimensions">
                        <DimensionCell axis={"Width"} value={width} />
                        <DimensionCell axis={"Length"} value={length} />
                        <DimensionCell axis={"Height"} value={height} />
                    </div>
                </div>
                <div className="Buttons">
                    <div className="EditButton">
                        <div className="Button">
                            <span>
                                {"Edit"}
                            </span>
                        </div>
                    </div>
                    <div className="DeleteButton">
                        <div className="Button">
                            <span>
                                {"Delete"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



interface NewPalletCellProps {
    startEdit: () => void;
}

function NewPalletCell({ startEdit }: NewPalletCellProps) {
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
                        {"Add A New Pallet"}
                    </span>
                </div>
            </div>
        </div>
    );
};

interface SummaryProps {
    startEdit: () => void;
    allPallets: PalletGeometry[];
};


function CornerSummary({ startEdit, allPallets }: SummaryProps) {
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    <NewPalletCell startEdit={startEdit} />
                    {allPallets.map((pallet: PalletGeometry, index: number) => {
                        return (
                            <PalletCell key={index} />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


interface PalletCornerProps {
    //    allPallets =
    allPallets: PalletGeometry[];
}

function PalletCorners({ allPallets }: PalletCornerProps) {

    let [cornerNumber, setCornerNumber] = useState<Corners>(Corners.ONE); // ()

    let [summaryScreen, setSummaryScreen] = useState<boolean>(true);

    let startEdit = () => {
        setSummaryScreen(false);
    };

    let title = "Select Corner " + String(cornerNumber as number + 1);

    let selectAction = () => {
        if (cornerNumber === Corners.THREE) {
            console.log("Done");
        } else {
            setCornerNumber(cornerNumber as number + 1);
        }
    };

    let backAction = () => {
        if (cornerNumber !== Corners.ONE) {
            setCornerNumber(cornerNumber as number - 1);
        }
    };

    let instruction: string;

    if (summaryScreen) {
        instruction = "Add and edit pallets";
        return (
            <ContentItem instruction={instruction} >
                <CornerSummary startEdit={startEdit} allPallets={allPallets} />
            </ContentItem>
        );
    } else {
        instruction = "Move to and select three pallet corners";
        return (
            <ContentItem instruction={instruction} >
                <div className="PickLocationGrid">
                    <Jogger selectAction={selectAction} />
                    <div className="PalletDisplay">
                        <div className="PalletDisplayHeader">
                            <div className="CornerBackButton">
                                {(cornerNumber as number > 0) &&
                                    <div className="BackButton" onClick={backAction}>
                                        <span>
                                            {"Back"}
                                        </span>
                                    </div>
                                }
                            </div>
                            <div className="CenterText">
                                <span>
                                    {title}
                                </span>
                            </div>
                        </div>
                        <div className="DisplayContainer">
                            <PalletRender cornerNumber={cornerNumber as number} />
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};

export default PalletCorners;
