import React, {createContext, useReducer, useEffect} from 'react';
import {MQTTSubscriber} from "../mqtt/MQTT";
// For server sent events -- see server.js for further details.

import {PalletizerState, PalletizerError, PartialState, MachineState} from "../types/Types";

type ReducerAction = {
    type_of: string;
    payload: any;
};

function MachineReducer(state : MachineState, action : ReducerAction) {

    switch (action.type_of) {
        case "ERROR" : {
            state.palletizer_state.errors.push(action.payload as PalletizerError);
            return state;
        }
        case "STATE" : {
            return {
                ...state,
                palletizer_state: {errors: state.palletizer_state.errors, ...(action.payload as PartialState)} as PalletizerState
            };
        }
        default : {
            return state
        }
    }
}

const MachineContext = createContext<Partial<MachineState>>({});

export { MachineContext };

function AppState(props: any) {

    let initial_state : MachineState = {
        pallet_configs : [] as string[],
        machine_configs : [] as string[],
        palletizer_state: {
            status : "N/A",
            cycle: 0, 
            current_box: 0,
            total_box: 0,
            time: 10,
            errors: [] as PalletizerError[]
        } as PalletizerState
    };

    const [state, dispatch] = useReducer(MachineReducer, initial_state);

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
        <MachineContext.Provider value={state}>
            {props.children}
        </MachineContext.Provider>
    )
}

export default AppState;
