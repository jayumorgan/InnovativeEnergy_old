import React, { useState, ChangeEvent } from 'react';

import ContentItem, { ButtonProps } from "./ContentItem";

import { getPalletDimensions, Coordinate, PalletGeometry } from "./structures/Data";

//import { PalletGeometry, getPalletDimensions, Coordinate, PlaneDimensions } from "./structures/Data";

import Jogger from "./Jogger";

// import PalletRender from "./3D/PalletRender";
//import PlusIcon, { IconProps, XIcon } from "./PlusIcon";

import { LayoutModel, PALLETCORNERS, IncreaseCorner, CornerNumber } from "./Layouts";

// Styles for summary -- rename later.
import "./css/BoxSize.scss";
//import "../css/TeachMode.scss";
import "./css/Pallet.scss";


//---------------Pallet Model---------------
interface PalletModelProps {
    pallet: PalletGeometry;
    size: number; // 650 for half content width;
    corner: PALLETCORNERS;
}


function PalletModel({ pallet, size, corner }: PalletModelProps) {
    let s = size * 9 / 10;
    let layoutProps: any = {
        size: s,
        pallet,
        outerHeight: s,
        outerWidth: s,
        fullWidth: size,
        fullHeight: size,
        corner
    };

    return (
        <svg width={size} height={size}>
            <LayoutModel {...layoutProps} />
        </svg>
    );
};

interface PalletCellProps {
    pallet: PalletGeometry;
    startEdit: () => void;
    editName: (e: ChangeEvent) => void;
}

function PalletCell({ pallet, startEdit, editName }: PalletCellProps) {

    let { width, length } = getPalletDimensions(pallet)

    let size = 100;

    let model_props = {
        pallet,
        size,
        outerWidth: size,
        outerHeight: size
    };

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <LayoutModel {...model_props} />
                    {/* <img src={PalletImage} /> */}
                </div>
                <div className="Name">
                    <input type="text" value={pallet.name} onChange={editName} />
                </div>
                <div className="Dimensions">
                    <div className="DimensionsGrid2">
                        <div className="Dimension">
                            <span>
                                {"Width: " + String(width)}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {"Length: " + String(length)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="Edit">
                    <div className="EditButton" onClick={startEdit}>
                        <span>
                            {"Edit"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="Trash">
                <span className="icon-delete">
                </span>
            </div>
        </div >
    );
}


interface PalletCornerProps {
    allPallets: PalletGeometry[];
    machineConfigId: number;
    handleNext: () => void;
    handleBack: () => void;
    setPallets: (pallets: PalletGeometry[]) => void;
    instructionNumber: number;
};


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
        Layouts: [],
        Stack: []
    };
    return p;
}

function PalletCorners({ instructionNumber, allPallets, handleNext, handleBack, setPallets, machineConfigId }: PalletCornerProps) {
    let [summaryScreen, setSummaryScreen] = useState<boolean>(allPallets.length > 0);

    let [cornerNumber, setCornerNumber] = useState<PALLETCORNERS>(PALLETCORNERS.TOP_LEFT); // ()

    // Start with a default pallet for editing...
    let [editingPallet, setEditingPallet] = useState<PalletGeometry>(defaultPallet(allPallets.length + 1));

    let [editComplete, setEditComplete] = useState<boolean>(false);

    let [editingIndex, setEditingIndex] = useState<number>(allPallets.length);

    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            if (summaryScreen) {
                handleBack()
            } else {
                if (PALLETCORNERS.TOP_LEFT === cornerNumber) {
                    if (allPallets.length > 0) {
                        setSummaryScreen(true);
                    } else {
                        handleBack();
                    }
                } else {
                    if (cornerNumber === PALLETCORNERS.BOTTOM_LEFT) {
                        setCornerNumber(PALLETCORNERS.TOP_LEFT)
                    } else {
                        setCornerNumber(PALLETCORNERS.BOTTOM_LEFT);
                    }
                }

            }
        }
    };

    let RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
        action: () => {
            if (summaryScreen) {
                handleNext();
            } else {
                // if All corners are selected.
                if (editComplete) {
                    let temp: PalletGeometry = { ...editingPallet };
                    temp.Layouts = [];
                    // Save the data.
                    let newPallets: PalletGeometry[] = [];
                    if (editingIndex > allPallets.length || allPallets.length === 0) {
                        newPallets = [...allPallets, temp];
                    } else {
                        allPallets.forEach((p: PalletGeometry, i: number) => {
                            if (i === editingIndex) {
                                newPallets.push(editingPallet);
                            } else {
                                newPallets.push(p)
                            }
                        });
                    }
                    setPallets(newPallets);
                    setSummaryScreen(true);
                }
            }
        },
        enabled: summaryScreen || editComplete
    };

    let setPalletName = (name: string) => {
        setEditingPallet({ ...editingPallet, name });
    };

    let editName = (palletIndex: number) => (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        let newPallets = [...allPallets];
        newPallets[palletIndex].name = newName;
        setPallets(newPallets);
    };

    let startEdit = (index: number) => () => {
        if (index >= 0) {
            setEditComplete(true);
            setEditingPallet(allPallets[index]);
            setEditingIndex(index);
        } else {
            setEditComplete(false);
            setEditingIndex(allPallets.length + 1);
            setEditingPallet(defaultPallet(allPallets.length + 1));
        }
        setCornerNumber(PALLETCORNERS.TOP_LEFT);
        setSummaryScreen(false);
    };

    //let title = "Select Corner " + String(CornerNumber(cornerNumber) + 1);

    /* let backAction = () => {
     *     if (cornerNumber !== PALLETCORNERS.TOP_LEFT) {
     *         setCornerNumber(DecreaseCorner(cornerNumber));
     *     }
     * }; */

    let addCorner = (c: Coordinate) => {
        switch (cornerNumber) {
            case (PALLETCORNERS.TOP_LEFT): {
                setEditingPallet({ ...editingPallet, corner1: c });
                break;
            };
            case (PALLETCORNERS.BOTTOM_LEFT): {
                setEditingPallet({ ...editingPallet, corner2: c });
                break;

            };
            case (PALLETCORNERS.BOTTOM_RIGHT): {
                setEditingPallet({ ...editingPallet, corner3: c });
                break;
            };
        };

        if (cornerNumber === PALLETCORNERS.BOTTOM_RIGHT) {
            setEditComplete(true);
        } else {
            setCornerNumber(IncreaseCorner(cornerNumber));
        }
    };

    let instruction: string;

    if (summaryScreen) {
        instruction = "Create and edit pallets";

        let AddButton: ButtonProps = {
            name: "Add new pallet",
            action: startEdit(-1)
        };

        let contentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
            AddButton
        };

        return (
            <ContentItem {...contentItemProps} >
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allPallets.map((p: PalletGeometry, i: number) => {
                                return (
                                    <PalletCell pallet={p} key={i} startEdit={startEdit(i)} editName={editName(i)} />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );

    } else {
        let size = 650;

        instruction = "Move to corner " + String(CornerNumber(cornerNumber) + 1) + " and click select. ";

        return (
            <ContentItem instructionNumber={instructionNumber} instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <div className="CornerGrid">
                    <div className="PickLocationGrid">
                        <Jogger machineConfigId={machineConfigId} selectAction={addCorner} name={editingPallet.name} updateName={setPalletName} />
                        <div className="PalletContainer">
                            <div className="PalletMount">
                                <PalletModel size={size} pallet={defaultPallet(-2)} corner={cornerNumber} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );

    };
}

// <PalletRender cornerNumber={cornerNumber as number} />

export default PalletCorners;
