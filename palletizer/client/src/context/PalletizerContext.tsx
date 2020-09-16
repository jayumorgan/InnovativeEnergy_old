import React, { createContext, useReducer, useEffect } from 'react';
import { MQTTSubscriber, RequestState } from "../mqtt/MQTT";
import {
    PalletizerState,
    PalletizerInformation,
    ReducerAction
} from "../types/Types";
import { CoordinateRot } from '../geometry/geometry';

function PalletizerReducer(state: PalletizerState, action: ReducerAction) {
    switch (action.type_of) {
        case "INFORMATION": {
            let information = action.payload as PalletizerInformation[];
            return { ...state, information };
        }
        case "STATE": {
            return { information: state.information, ...action.payload } as PalletizerState;
        }
        default: {
            return state
        }
    }
};

const PalletizerContext = createContext<Partial<PalletizerState>>({});

export { PalletizerContext };

function PalletizerHub(props: any) {

    let initial_state: PalletizerState = {
        status: "N/A",
        cycle: 0,
        current_box: 0,
        total_box: 0,
        time: 0,
        information: [] as PalletizerInformation[],
        dropCoordinates: [] as CoordinateRot[]
    };

    const [state, dispatch] = useReducer(PalletizerReducer, initial_state);

    useEffect(() => {

        let handle_information = (message: any) => {
            dispatch({
                type_of: "INFORMATION",
                payload: message
            });
        };

        let handle_state = (message: any) => {
            dispatch({
                type_of: "STATE",
                payload: message
            });
        };

        MQTTSubscriber(handle_information, handle_state);
        RequestState();
    }, []);

    return (
        <PalletizerContext.Provider value={state}>
            {props.children}
        </PalletizerContext.Provider>
    )
}

export default PalletizerHub;
