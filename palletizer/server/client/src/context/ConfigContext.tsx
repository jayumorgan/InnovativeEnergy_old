import React, { createContext, useEffect, useState} from 'react';

import {get_configs} from "../requests/requests";
import {ConfigState} from "../types/Types";



const ConfigContext = createContext<Partial<ConfigState>>({});

export { ConfigContext };


function ConfigHub(props: any) {

    let initial_state : ConfigState = {
        configurations: [] as string[]
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