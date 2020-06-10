import React, {createContext, useReducer, useEffect} from 'react';

import {ConfigState, ReducerAction} from "../types/Types";


function ConfigReducer(state: ConfigState, action: ReducerAction) {
    return state;
}

const ConfigContext = createContext<Partial<ConfigState>>({});

export { ConfigContext };


function ConfigHub(props: any) {

    let initial_state : ConfigState = {
        machine_configs: [] as string[],
        pallet_configs: [] as string[]
    };

    
    const [state, dispatch] = useReducer(ConfigReducer, initial_state);

    useEffect(()=>{
        
    });

    return (
        <ConfigContext.Provider value={state}>
            {props.children}
        </ConfigContext.Provider>
    );
};


export default ConfigHub;
