import React, { useContext, useState, Fragment, ReactElement } from 'react';

import Modal from "./Modal";

import { PalletConfiguration, Pallet, PickLocation, Layer, Corner } from "../services/TeachMode";

//import {ConfigContext} from "../context/ConfigContext";

//import {ConfigState} from "../types/Types";

// Styles
// import "./css/Configuration.scss";
// import "./css/Login.scss";

enum PalletTeachState {
    PALLET_CORNERS,
    PICK_LOCATION,
    BOX_SIZE,
    LAYER_SETUP,
    ASSIGN_LAYOUT,
    SUMMARY
};


function PickLocationElement() {
    return (
        <span>
            {"Pick Location"}
        </span>
    );
}


interface PalletConfiguratorProps {
    close: () => void;
};

function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.PICK_LOCATION);

    let ChildElement: ReactElement = (<></>);

    switch (teachState) {
        case (PalletTeachState.PICK_LOCATION): {
            ChildElement = (<PickLocationElement />)
            break;
        };
        case (PalletTeachState.PALLET_CORNERS): {
            break;
        };
        case (PalletTeachState.BOX_SIZE): {
            break;
        }
        case (PalletTeachState.LAYER_SETUP): {
            break;
        }
        case (PalletTeachState.ASSIGN_LAYOUT): {
            break;
        }
        case (PalletTeachState.SUMMARY): {
            break
        }
        default: {
            console.log("Default Pallet Configurator Case -- unhandled");
        }
    };



    return (
        <Modal close={close}>
            {ChildElement}
        </Modal>
    );
};

export default PalletConfigurator;



