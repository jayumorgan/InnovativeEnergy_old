import React, { createContext, useEffect, useState } from 'react';

import { get_configs } from "../requests/requests";
import { ConfigState, ConfigItem } from "../types/Types";

const ConfigContext = createContext<Partial<ConfigState>>({});

export { ConfigContext };


function ConfigHub(props: any) {

    let initial_state: ConfigState = {
        machine_configs: [] as ConfigItem[],
        pallet_configs: [] as ConfigItem[],
        machine_index: 0,
        pallet_index: 0
    };

    var [state, set_state] = useState(initial_state);

    useEffect(() => {
        get_configs((data: ConfigState) => {
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
