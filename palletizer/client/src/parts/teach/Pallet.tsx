import React, { useState, ChangeEvent } from 'react';
import ContentItem, { ButtonProps } from "./ContentItem";
import { getPalletDimensions, Coordinate, PalletGeometry, CoordinateRot } from "../../geometry/geometry";
import Jogger, { JoggerProps } from "./Jogger";
import {
    LayoutModel,
    PALLETCORNERS,
    IncreaseCorner,
    CornerNumber
} from "./Layouts";

//---------------Styles---------------
import "./css/BoxSize.scss";
import "./css/Pallet.scss";
import { ControlProps } from '../shared/shared';


//---------------Pallet Model---------------
interface PalletModelProps {
    pallet: PalletGeometry;
    size: number; // 650 for half content width;
    corner: PALLETCORNERS;
};

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
    deletePallet: () => void;
};

function PalletCell({ pallet, startEdit, editName, deletePallet }: PalletCellProps) {

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
                                {"Width: " + String(Math.round(width))}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {"Length: " + String(Math.round(length))}
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
            <div className="Trash" onClick={deletePallet}>
                <span className="icon-delete">
                </span>
            </div>
        </div >
    );
};


interface PalletCornerProps extends ControlProps {
    allPallets: PalletGeometry[];
    machineConfigId: number;
    setPallets: (pallets: PalletGeometry[]) => void;
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
    const [summaryScreen, setSummaryScreen] = useState<boolean>(allPallets.length > 0);
    const [cornerNumber, setCornerNumber] = useState<PALLETCORNERS>(PALLETCORNERS.TOP_LEFT); // ()
    const [editingPallet, setEditingPallet] = useState<PalletGeometry>(defaultPallet(allPallets.length + 1));
    const [editComplete, setEditComplete] = useState<boolean>(false);
    const [editingIndex, setEditingIndex] = useState<number>(allPallets.length);

    const LeftButton: ButtonProps = {
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

    const RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
        action: () => {
            if (summaryScreen) {
                if (allPallets.length > 0) {
                    handleNext();
                }
            } else {
                // if All corners are selected.
                if (editComplete) {
                    let temp: PalletGeometry = { ...editingPallet };
                    temp.Layouts = [];
                    temp.Stack = [];
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
        enabled: (summaryScreen && allPallets.length > 0) || editComplete
    };

    const setPalletName = (name: string) => {
        setEditingPallet({ ...editingPallet, name });
    };

    const editName = (palletIndex: number) => (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        let newPallets = [...allPallets];
        newPallets[palletIndex].name = newName;
        setPallets(newPallets);
    };

    const startEdit = (index: number) => () => {
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

    const addCorner = (c: Coordinate) => {
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

        const AddButton: ButtonProps = {
            name: "Add new pallet",
            action: startEdit(-1)
        };

        const contentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
            AddButton
        };

        const deletePallet = (pallet_index: number) => () => {
            let cp = [...allPallets];
            cp.splice(pallet_index, 1);
            setPallets(cp);
        };

        return (
            <ContentItem {...contentItemProps} >
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allPallets.map((p: PalletGeometry, i: number) => {
                                const palletCellProps: PalletCellProps = {
                                    pallet: p,
                                    startEdit: startEdit(i),
                                    editName: editName(i),
                                    deletePallet: deletePallet(i)
                                };
                                return (
                                    <PalletCell key={i} {...palletCellProps} />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );

    } else {
        let size = 650;

        instruction = "Move to corner " + String(CornerNumber(cornerNumber) + 1) + " and click select. ";

        const savedCoordinate: CoordinateRot = (() => {
            switch (cornerNumber) {
                case PALLETCORNERS.TOP_LEFT: {
                    return editingPallet.corner1 as CoordinateRot;
                }
                case PALLETCORNERS.BOTTOM_LEFT: {
                    return editingPallet.corner2 as CoordinateRot;
                }
                case PALLETCORNERS.BOTTOM_RIGHT: {
                    return editingPallet.corner3 as CoordinateRot;
                }
                default: {
                    return { x: 0, y: 0, z: 0, θ: 0 } as CoordinateRot;
                }
            }
        })();

        const joggerProps: JoggerProps = {
            machineConfigId,
            selectAction: addCorner,
            name: editingPallet.name,
            updateName: setPalletName,
            allowManualEntry: true,
            savedCoordinate
        };

        return (
            <ContentItem instructionNumber={instructionNumber} instruction={instruction} LeftButton={LeftButton} RightButton={RightButton} >
                <div className="CornerGrid">
                    <div className="PickLocationGrid">
                        <Jogger {...joggerProps} />
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
