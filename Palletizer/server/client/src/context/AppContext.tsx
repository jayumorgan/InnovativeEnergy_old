import React, {createContext, useReducer, useEffect} from 'react';

// For server sent events -- see server.js for further details.

import {PalletizerState, PalletizerError} from "../types/Types";

type ReducerAction = {
    type_of: string;
    payload: any;
};

function PalletizerReducer(state : PalletizerState, action : ReducerAction) {

    switch (action.type_of) {
        default : {
            return {...action.payload};
        }
    }
}

const PalletizerContext = createContext<Partial<PalletizerState>>({});

export { PalletizerContext };

function AppState(props: any) {
    // Initial state -- mirrored in server.js
    let initial_state : PalletizerState = {
        status : "N/A",
        cycle: 0, 
        current_box: 0,
        total_box: 0,
        time: 10,
        errors: [] as PalletizerError[] // This will change to a structured format.
    };

    const [state, dispatch] = useReducer(PalletizerReducer, initial_state);

    useEffect( () => {
        let event_source = new EventSource("http://localhost:3011/events");


        event_source.onopen = function(e: Event) {
            console.log("Opened event_source.", e);
        }

        event_source.onerror = function(e:Event) {
            console.log(e, "Error in AppContext.tsx - event_source");
        }

        event_source.addEventListener("message", (e: MessageEvent)=> {
            let data = JSON.parse(e.data);
            // Call dispatch and set new app data.
            dispatch({
                type_of: "state",
                payload: data
            });

        });

    }, []);

    return (
        <PalletizerContext.Provider value={state}>
            {props.children}
        </PalletizerContext.Provider>
    )
}

export default AppState;
