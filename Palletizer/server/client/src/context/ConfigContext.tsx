import React, { createContext, useReducer, useEffect, useState} from 'react';

import {get_configs} from "../requests/requests";

import {ConfigState, ReducerAction} from "../types/Types";

function ConfigReducer(state: ConfigState, action: ReducerAction) {
    console.log(action.payload);
    return {...action.payload};
}

const ConfigContext = createContext<Partial<ConfigState>>({});

export { ConfigContext };


function ConfigHub(props: any) {

    let initial_state : ConfigState = {
        machine_configs: [] as string[],
        pallet_configs: [] as string[]
    };

    var [state, set_state] = useState(initial_state);

    useEffect(()=>{

        get_configs((data:ConfigState)=>{
            set_state(data); 
        });
    }, []);


    return (
        <ConfigContext.Provider value={state}>
            {props.children}
        </ConfigContext.Provider>
    );
};


export default ConfigHub;
