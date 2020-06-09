import React, {createContext, useReducer} from 'react';

type PalletizerState = {
    status : string;
    cycle: number;
    current_box: number; // [current, next]
    total_box: number;
    time: number; // hours? 
    errors: string[];
};

type ReducerAction = {
    type: string;
    payload: any;
};


function PalletizerReducer(state : PalletizerState, action : ReducerAction) {

    switch (action.type) {
        default : {
            return state;
        }
    }
}

const PalletizerContext = createContext<Partial<PalletizerState>>({});


function AppState(props: any) {
    let initial_state : PalletizerState = {
        status : "N/A",
        cycle: 0, 
        current_box: 0,
        total_box: 0,
        time: 0,
        errors: [] as string[]
    };

    const [state, dispatch] = useReducer(PalletizerReducer, initial_state);

    return (
        <PalletizerContext.Provider value={state}>
            {props.children}
        </PalletizerContext.Provider>
    )

    
}




export default AppState;
