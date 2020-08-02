import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import ContentItem, { ContentItemProps } from "./ContentItem";

import Jogger from "./Jogger";

import PalletRender from "./3D/PalletRender";
import PlusIcon, { IconProps } from "./PlusIcon";


// Styles for summary -- rename later.
import "./css/BoxSize.scss";


enum Corners {
    ONE,
    TWO,
    THREE
};



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
};


function CornerSummary({ startEdit }: SummaryProps) {
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    <NewPalletCell startEdit={startEdit} />
                </div>
            </div>
        </div>
    );
};





function PalletCorners() {

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
        instruction = "Add or edit pallets";
        return (
            <ContentItem instruction={instruction} >
                <CornerSummary startEdit={startEdit} />
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
