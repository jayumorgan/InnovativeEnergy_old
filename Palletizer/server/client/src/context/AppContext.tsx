import React, {createContext, useReducer, useEffect} from 'react';
import {MQTTSubscriber} from "../mqtt/MQTT";
// For server sent events -- see server.js for further details.

import {PalletizerState, PalletizerError, PartialState} from "../types/Types";

type ReducerAction = {
    type_of: string;
    payload: any;
};

function PalletizerReducer(state : PalletizerState, action : ReducerAction) {

    switch (action.type_of) {
        case "ERROR" : {
            state.errors.push(action.payload as PalletizerError)
            return state;
        }
        case "STATE" : {
            return {errors: state.errors, ...(action.payload as PartialState)} as PalletizerState;
        }
        default : {
            return state
        }
    }
}

const PalletizerContext = createContext<Partial<PalletizerState>>({});

export { PalletizerContext };

function PalletizerHub(props: any) {

    let initial_state : PalletizerState = {
        status : "N/A",
        cycle: 0, 
        current_box: 0,
        total_box: 0,
        time: 10,
        errors: [] as PalletizerError[]
    };

    const [state, dispatch] = useReducer(PalletizerReducer, initial_state);

    useEffect(() => {
        // Change the error structure.
        let handle_error = (message: any) => {
            dispatch({
               type_of: "ERROR",
               payload: message 
            });
        };

        let handle_state = (message: any) => {
            dispatch({
               type_of: "STATE",
                payload: message
            });
        };

        MQTTSubscriber(handle_error, handle_state);

    }, []);

    return (
        <PalletizerContext.Provider value={state}>
            {props.children}
        </PalletizerContext.Provider>
    )
}

export default PalletizerHub;
