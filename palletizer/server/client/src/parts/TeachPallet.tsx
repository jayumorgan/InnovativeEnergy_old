import React, { useContext, useState, Fragment, ReactElement } from 'react';

import Modal from "./Modal";

import { PalletConfiguration, Pallet, PickLocation, Layer, Corner } from "../services/TeachMode";

//import {ConfigContext} from "../context/ConfigContext";

//import {ConfigState} from "../types/Types";

// Styles
// import "./css/Configuration.scss";
// import "./css/Login.scss";
import "./css/TeachMode.scss";
import "./css/Jogger.scss";

import Up from "./images/up.png";
import Down from "./images/down.png";
import Left from "./images/left.png";
import Right from "./images/right.png";

enum Directions {
    UP="Up",
    DOWN="Down",
    LEFT="Left",
    RIGHT="Right"
};

interface ArrowImageProps {
    direction : Directions;
};

function ArrowImage({direction} : ArrowImageProps) {
    let image : string;

    switch (direction) {
	case (Directions.UP) : {
	    image = Up;
	    break;
	};
	case(Directions.DOWN) : {
	    image = Down;
	    break;
	};
	case (Directions.LEFT) : {
	    image = Left;
	    break;
	};
	case (Directions.RIGHT) : {
	    image = Right;
	    break;
	    console.log("Right image");
	};
    };
    console.log(direction, image);    
    return (
	<div className={direction}>
	    <img src={image}/>
	</div>
    );
};

enum PalletTeachState {
    PALLET_CORNERS,
    PICK_LOCATION,
    BOX_SIZE,
    LAYER_SETUP,
    ASSIGN_LAYOUT,
    SUMMARY
};

function JogIncrement() {

    return (
	<div className="JogIncrement">
	    <input type="number" min="1" max="1000"/>
	    <span>
		mm
	    </span>
	</div>
    );
}


function JoggerDisplay() {

    let directions : Directions[] = [
	Directions.UP,
	Directions.DOWN,
	Directions.LEFT,
	Directions.RIGHT
    ];
    
      return (
	<div className="JoggerContainer">
	    <div className="JoggerContainerInner">
		<div className="JoggerCircle">
		    <JogIncrement />
		    {directions.map((d: Directions, index: number)=>{
			return (
			    <ArrowImage direction={d} key={index} />
			)
		    })}
		</div>
	    </div>
	</div>
    );
};

/* <div className="JoggerCircle">
 * </div>
 *  */

function PickLocationElement() {
    return (
	<div className="PickLocationGrid">
	    <JoggerDisplay />
	    <span>
		"Here is the pick location element." 
	    </span>
	</div>
    );
}

interface PalletConfiguratorProps {
    close: () => void;
};

interface CurrentStepBarProps {
    completion_fraction: number;
};




function CurrentStepBar({completion_fraction} : CurrentStepBarProps) {
    let style = {
	width: `${completion_fraction * 100}%`
    } as React.CSSProperties;
    return (
	<div className="CurrentStepBar">
	    <div className="ProgressBar">
		<div className="ProgressBarFilled" style={style}>
		    <span>
			1/5
		    </span>
		</div>
	    </div>
	</div>
    );
    
}


function PalletConfigurator({ close }: PalletConfiguratorProps) {

    let [palletConfig, setPalletConfig] = useState<PalletConfiguration>(new PalletConfiguration());

    let [teachState, setTeachState] = useState<PalletTeachState>(PalletTeachState.PICK_LOCATION);

    let [completionFraction, setCompletionFraction] = useState<number>(1/5);

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
	    <div className="TeachModeContainer">
		<div className="TeachModeHeader">
		    <div className="StatusBar">
			<div className="StatusBarTitle">
			    <span>
				Pallet Configuration Setup
			    </span>
			</div>
			<CurrentStepBar completion_fraction={completionFraction} />
		    </div>
		</div>

		{ChildElement}
	    </div>
        </Modal>
    );
};

export default PalletConfigurator;



