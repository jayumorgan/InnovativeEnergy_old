import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps, ButtonProps } from "./ContentItem";

import { getPalletDimensions, Coordinate, PlaneDimensions, PalletGeometry } from "./structures/Data";

//import { PalletGeometry, getPalletDimensions, Coordinate, PlaneDimensions } from "./structures/Data";

import Jogger from "./Jogger";

import PalletRender from "./3D/PalletRender";
import PlusIcon, { IconProps, XIcon } from "./PlusIcon";

import { Rect, LayoutModel } from "./Layers";

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

/* 
 * interface PalletGeometry {
 *     name: string;
 *     corner1: Coordinate;
 *     corner2: Coordinate;
 *     corner3: Coordinate;
 * 
 * } */


interface DimensionCellProps {
    axis: string;
    value: number;
}

function DimensionCell({ axis, value }: DimensionCellProps) {
    return (
        <div className="DimensionCell">
            <span>
                {axis + ": " + String(value) + "mm"}
            </span>
        </div>
    );
}

//---------------Pallet Model---------------


interface PalletModelProps {
    pallet: PalletGeometry;
    size: number; // 650 for half content width;
}

function PalletModel({ pallet, size }: PalletModelProps) {

    let s = size * 9 / 10;

    return (
        <svg width={size} height={size}>
            <LayoutModel size={s} pallet={pallet} outerHeight={s} outerWidth={s} />
        </svg>
    );
};



interface PalletCellProps {
    pallet: PalletGeometry;
}

function PalletCell({ pallet }: PalletCellProps) {

    let { width, length } = getPalletDimensions(pallet)

    let iconSize = 30;
    let size = 100;

    let model_props = {
        pallet,
        size,
        outerWidth: size,
        outerHeight: size
    };

    console.log(pallet.corner1, pallet.corner2, pallet.corner3);

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <LayoutModel {...model_props} />
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
    startEdit: (index: number) => () => void;
    allPallets: PalletGeometry[];
};


function CornerSummary({ startEdit, allPallets }: SummaryProps) {


    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    <NewPalletCell startEdit={startEdit(-1)} />
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
    handleNext: () => void;
    handleBack: () => void;
    setPallets: (pallets: PalletGeometry[]) => void;
}


function defaultPallet(index: number): PalletGeometry {
    let p: PalletGeometry = {
        name: "Pallet " + String(index),
        corner1:
        {
            x: 0,
            y: 500,
            z: 0,
        },
        corner2: {
            x: 0,
            y: 0,
            z: 0.
        },
        corner3: {
            x: 500,
            y: 0,
            z: 0
        },
        Layers: [],
        Stack: []
    };
    return p;
}

function PalletCorners({ allPallets, handleNext, handleBack, setPallets }: PalletCornerProps) {
    let [summaryScreen, setSummaryScreen] = useState<boolean>(allPallets.length > 0);

    let [cornerNumber, setCornerNumber] = useState<Corners>(Corners.ONE); // ()

    // Start with a default pallet for editing...
    let [editingPallet, setEditingPallet] = useState<PalletGeometry>(defaultPallet(allPallets.length + 1));

    let [editComplete, setEditComplete] = useState<boolean>(false);

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            if (summaryScreen) {
                handleBack()
            } else {
                if (allPallets.length > 0) {
                    setSummaryScreen(true);
                } else {
                    handleBack();
                }
            }
        }
    };

    let RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : (editComplete ? "Add Pallet" : ""),
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                // if All corners are selected.
                if (editComplete) {
                    console.log("Check that all corners are selected...");

                    let temp: PalletGeometry = { ...editingPallet };
                    temp.Layers = [];

                    // Save the data.
                    let newPallets = [...allPallets, temp];

                    setPallets(newPallets);
                    setSummaryScreen(true);
                }

            }
        }
    };

    let setPalletName = (e: ChangeEvent) => {
        let name = (e.target as any).value;
        setEditingPallet({ ...editingPallet, name });
    };

    let startEdit = (index: number) => () => {
        if (index >= 0) {
            setEditComplete(true);
            setEditingPallet(allPallets[index]);
        } else {
            setEditComplete(false);
            setEditingPallet(defaultPallet(allPallets.length));
        }
        setCornerNumber(Corners.ONE);
        setSummaryScreen(false);
    };

    let title = "Select Corner " + String(cornerNumber as number + 1);

    let backAction = () => {
        if (cornerNumber !== Corners.ONE) {
            setCornerNumber(cornerNumber as number - 1);
        }
    };

    let addCorner = (c: Coordinate) => {
        switch (cornerNumber) {
            case (Corners.ONE): {
                setEditingPallet({ ...editingPallet, corner1: c });
                break;
            };
            case (Corners.TWO): {
                setEditingPallet({ ...editingPallet, corner2: c });
                break;

            };
            case (Corners.THREE): {
                setEditingPallet({ ...editingPallet, corner3: c });
                break;
            };
        };

        if (cornerNumber === Corners.THREE) {
            setEditComplete(true);
        } else {
            setCornerNumber(cornerNumber as number + 1);
        }
    };

    let instruction: string;

    if (summaryScreen) {
        instruction = "Create and edit pallets";
        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton}>
                <CornerSummary startEdit={startEdit} allPallets={allPallets} />
            </ContentItem>
        );
    } else {
        let size = 650;
        // Dont use the same pallet on the model, 
        instruction = "Move to corner " + String(cornerNumber + 1) + " and click select. ";
        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <div className="CornerGrid">
                    <div className="PalletName">
                        <input type="text" placeholder={editingPallet.name} value={editingPallet.name} onChange={setPalletName} />
                    </div>
                    <div className="PickLocationGrid">
                        <Jogger selectAction={addCorner} />
                        <div className="PalletContainer">
                            <div className="PalletMount">
                                <PalletModel size={size} pallet={defaultPallet(-2)} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};

// <PalletRender cornerNumber={cornerNumber as number} />

export default PalletCorners;
