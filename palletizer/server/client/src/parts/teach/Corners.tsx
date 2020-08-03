import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import { Coordinate, PlaneDimensions, PalletGeometry } from "./structures/Data";

import Jogger from "./Jogger";

import PalletRender from "./3D/PalletRender";
import PlusIcon, { IconProps, XIcon } from "./PlusIcon";


import { LayoutModel } from "./Layout";

// Styles for summary -- rename later.
import "./css/BoxSize.scss";
//import "../css/TeachMode.scss";
import "./css/Corners.scss";

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



interface PalletCellProps {
    pallet: PalletGeometry;
}

function PalletCell({ pallet }: PalletCellProps) {

    let { width, length } = pallet.getDimensions();

    let iconSize = 30;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <LayoutModel pallet={pallet} size={100} />
                    {/* <img src={PalletImage} /> */}
                </div>
                <div className="BoxDetails">
                    <div className="BoxName">
                        <input type="text" value={pallet.name} />
                    </div>
                    <div className="BoxDimensions">
                        <DimensionCell axis={"Width"} value={width} />
                        <DimensionCell axis={"Length"} value={length} />
                    </div>
                </div>
                <div className="Buttons">
                    <div className="SingleEditButton">
                        <div className="Button">
                            <span>
                                {"Edit Corner Positions"}
                            </span>
                        </div>
                    </div>
                    <div className="DeleteButton">
                        <XIcon width={30} height={30} />
                    </div>
                </div>
            </div>
        </div >
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
                            <PalletCell key={index} pallet={pallet} />
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

    let [summaryScreen, setSummaryScreen] = useState<boolean>(false);

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
        instruction = "Create and edit pallets";
        return (
            <ContentItem instruction={instruction} >
                <CornerSummary startEdit={startEdit} allPallets={allPallets} />
            </ContentItem>
        );
    } else {
        instruction = "Move to and select three pallet corners";
        return (
            <ContentItem instruction={instruction} >
                <div className="CornerGrid">
                    <div className="SubInstruction">
                        <span>
                            {title}
                        </span>
                    </div>
                    <div className="PickLocationGrid">
                        <Jogger selectAction={selectAction} />
                        <div className="PalletContainer">
                            <PalletRender cornerNumber={cornerNumber as number} />
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};

export default PalletCorners;
