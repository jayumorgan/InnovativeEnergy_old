import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

import Jogger from "./Jogger";

import PalletRender from "../PalletRender";


enum Corners {
    ONE,
    TWO,
    THREE
};

function PalletCorners() {

    let [cornerNumber, setCornerNumber] = useState<Corners>(Corners.ONE); // ()

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

    return (
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
    );
};

export default PalletCorners;
