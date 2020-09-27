import React, { createContext, useEffect, useState } from 'react';

import { getConfigs } from "../requests/requests";
import { ConfigState, ConfigItem } from "../types/Types";

const ConfigContext = createContext<Partial<ConfigState>>({});

export { ConfigContext };


function ConfigHub(props: any) {
    const reloadConfigs = (setter: (cs: ConfigState) => void) => () => {
        getConfigs().then((cs: ConfigState) => {
            console.log("Reloading configuartions", cs);
            setter(cs);
        }).catch((e: any) => {
            console.log("Error get configs", e);
        });
    };
    const initial_state: ConfigState = {
        machine_configs: [] as ConfigItem[],
        pallet_configs: [] as ConfigItem[],
        machine_index: 0,
        pallet_index: 0,
        reloadConfigs: () => { return; }
    };
    const [state, set_state] = useState(initial_state);
    const value = { ...state, reloadConfigs: reloadConfigs(set_state) };
    useEffect(() => {
        reloadConfigs(set_state)();
    }, []);
    return (
        <ConfigContext.Provider value={value}>
            {props.children}
        </ConfigContext.Provider>
    );
};


export default ConfigHub;
