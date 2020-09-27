import React, {
    useContext,
    ChangeEvent,
    useState,
    ReactElement,
    useEffect
} from 'react';
import { MQTTControl } from "../mqtt/MQTT";
import { PalletizerContext } from "../context/PalletizerContext";
import { ConfigContext } from "../context/ConfigContext";
import { set_config, get_machine_config } from "../requests/requests";
import {
    ConfigState,
    PalletizerState,
    ConfigItem,
    PALLETIZER_STATUS
} from "../types/Types";
import Visualizer, { VisualizerProps } from "./Visualizer";
import JogController from "../jogger/Jogger";

//---------------Images---------------
import logo from "../images/vention_logo.png";
import { ReactComponent as BellImage } from "./images/bell.svg";
import { ReactComponent as ExclamationImage } from "./images/exclamation-circle.svg";
import { ReactComponent as InfoImage } from "./images/info-circle.svg";
import { ReactComponent as CircleImage } from "./images/circle.svg";

//---------------Styles---------------
import "./css/General.scss";
import { SavedMachineConfiguration } from './MachineConfig';

// Probably avoid using a global variable.
var control = MQTTControl();

// Support Functions:
function make_time_string(hours: number, minute: number): string {
    let hour_string = String(hours);
    let minute_string = minute < 10 ? `0${minute}` : String(minute);
    return hour_string + ":" + minute_string;
};

function make_date_string(day: number, month: number, year: number) {
    let day_string = day < 10 ? `0${day}` : String(day);
    let month_string = month < 10 ? `0${month}` : String(month + 1);
    let year_string = String(year);
    return year_string + "/" + month_string + "/" + day_string;
};

interface ExecuteProps {
    current_box: number;
    status: PALLETIZER_STATUS;
};

function ConfigCell({ title, children }: StackProps) {
    return (
        <div className="ConfigCell">
            <div className="ConfigTitle">
                <span>{title}</span>
            </div>
            {children}
        </div>
    );
};

function ExecutePane({ current_box, status }: ExecuteProps) {

    const {
        machine_configs,
        pallet_configs,
        machine_index,
        pallet_index,
        reloadConfigs
    } = useContext(ConfigContext) as ConfigState;
    const [start_box, set_start_box] = useState(0);
    const [machine_current_config, set_machine_current_config] = useState<number>(machine_index);
    const [pallet_current_config, set_pallet_current_config] = useState<number>(pallet_index);

    useEffect(() => {
        set_machine_current_config(machine_index);
        set_pallet_current_config(pallet_index);
    }, [machine_index, pallet_index]);

    useEffect(() => {
        const { update_start_box } = control;
        update_start_box(start_box);
    }, []);

    const handle_input = (e: ChangeEvent) => {
        let value: number = +(e.target as HTMLInputElement).value;
        let { update_start_box } = control;
        update_start_box(value);
        set_start_box(value);
    };

    let box_title = "Start From Box";
    let machine_config_title = "Machine Configuration";
    let pallet_config_title = "Pallet Configuration";

    const icons: string[] = [
        "icon-play",
        "icon-pause",
        "icon-stop"
    ];

    const stop_button = () => {
        let { stop } = control;
        stop();
    };

    const pause_button = () => {
        let { pause } = control;
        pause();
    };

    const start_button = () => {
        let { start } = control;
        start();
    };

    const home_button = () => {
        get_machine_config(machine_current_config).then((smc: SavedMachineConfiguration) => {
            const { machines, axes } = smc.config;
            let jc: JogController = new JogController(machines, axes, (_: any) => { return; });
            return jc.homeAllAxes();
        }).then(() => {
            console.log("Homing all axes.");
        }).catch((e: any) => {
            console.log("Error homing axes", e);
        });
    };

    const show_home: boolean = status === PALLETIZER_STATUS.STOPPED || status === PALLETIZER_STATUS.COMPLETE || status === PALLETIZER_STATUS.SLEEP;

    let is_running: boolean = (status === "Running");
    let start_icon = is_running ? icons[1] : icons[0];
    let start_fn = is_running ? pause_button : start_button;
    let start_text = is_running ? "Pause" : "Start";

    const handle_config_select = (machine: boolean) => (e: React.ChangeEvent) => {
        let id: number = +((e.target as any).value);
        if (!machine) {
            set_config(id).then(() => {
                let machine_id: number = machine_current_config;
                for (let i = 0; i < pallet_configs.length; i++) {
                    let ci: ConfigItem = pallet_configs[i];
                    if (ci.id === id) {
                        machine_id = ci.machine_config_id as number;
                        break;
                    }
                }
                set_pallet_current_config(id);
                set_machine_current_config(machine_id);
                reloadConfigs(); // reload from server. -- may be unessesary.
            }).catch((e) => {
                console.log("error set_config ", e);
            });
        }
    };

    return (
        <div className="ExecuteGrid">
            <ConfigCell title={machine_config_title} >
                <div className="ConfigItem">
                    <select onChange={handle_config_select(true)} value={machine_current_config}>
                        {machine_configs.filter((item: ConfigItem) => {
                            return item.complete;
                        }).map((item: ConfigItem, index: number) => {
                            return (<option value={item.id} key={index} > {item.name} </option>)
                        })}
                    </select>
                </div>
            </ConfigCell>
            <ConfigCell title={pallet_config_title}>
                <div className="ConfigItem">
                    <select onChange={handle_config_select(false)} value={pallet_current_config}>
                        {pallet_configs.filter((item: ConfigItem) => {
                            return item.complete;
                        }).map((item: ConfigItem, index: number) => {
                            return (<option value={item.id} key={index} > {item.name} </option>)
                        })}
                    </select>
                </div>
            </ConfigCell>
            <ConfigCell title={box_title}>
                <div className="BoxStartItem">
                    <input type="text" name={box_title} onChange={handle_input} value={start_box} />
                </div>
            </ConfigCell>
            <div className="ButtonGrid">
                <div className="StartButton">
                    <div className="ButtonContainer" onClick={start_fn}>
                        <span className={start_icon}> </span>
                        <span id="button-text">{start_text}</span>
                    </div>
                </div>
                {show_home ?
                    <div className="HomeButton">
                        <div className="ButtonContainer" onClick={home_button}>
                            <span> Home Icon </span>
                            <span id="button-text"> {"Home"} </span>
                        </div>
                    </div>
                    :
                    <div className="StopButton">
                        <div className="ButtonContainer" onClick={stop_button}>
                            <span className={icons[2]}> </span>
                            <span id="button-text">{"Stop"}</span>
                        </div>
                    </div>
                }
            </div>
        </div>
    );
}

interface StatusBarProps {
    items: StatusItem[];
}


function circle_image_style(value: string): any {
    let color: string = "gray";
    switch (value) {
        case "Running": {
            color = "rgb(91,196,126)";
            break;
        };
        case "Paused": {
            color = "rgb(250, 234, 47)";
            break;
        };
        case "Stopped": {
            color = "red";
            break;
        };
        case "Error": {
            color = "red";
            break;
        };
        default: {
            color = "grey";
            break;
        };
    };

    return { fill: color };
}

function StatusBar({ items }: StatusBarProps) {
    return (
        <div className="StatusBar">
            {items.map((item: StatusItem, index: number) => {
                return (
                    <div className="StatusItem" key={index}>
                        <span>{item.title.toUpperCase()}</span>
                        <div className="StatusValue">
                            {item.title.toUpperCase() === "STATUS" &&
                                <CircleImage style={circle_image_style(item.value)} />}
                            <span>
                                {item.value}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}


interface InformationLogProps {
    DateString: string;
    Description: string;
    Type: string;
}



function InformationLog({ DateString, Description, Type }: InformationLogProps) {

    let date = new Date(DateString);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();

    let date_string = make_date_string(day, month, year);
    let time_string = make_time_string(hours, minutes);

    let image: ReactElement;

    switch (Type) {
        case "Status": {
            image = (<InfoImage />);
            break;
        }
        case "Error": {
            image = (<ExclamationImage id={"Error"} />);
            break;
        }
        case "Warning": {
            image = (<BellImage id={"Warning"} />);
            break;
        }
        default: {
            image = (<InfoImage />);
            break;
        }
    }


    return (
        <div className="InformationLog">
            <div className="InformationLogLeft">
                <div className="InformationLogImage">
                    {image}
                </div>
                <div className="InformationLogDate">
                    <span>{time_string}</span>
                    <span id="DateString"> {date_string} </span>
                </div>
            </div>
            <span>
                {Description}
            </span>
            <div className="ErrorDismiss">
                <span>
                    {"Dismiss"}
                </span>
            </div>
        </div>
    );
}

function InformationLogContainer() {

    const palletizer_context = useContext(PalletizerContext);

    let { information } = palletizer_context as PalletizerState;

    return (
        <div className="InformationLogContainer">
            {information.map((err: InformationLogProps, index: number) => {
                return (<InformationLog {...err} key={index} />)
            })}
        </div>
    );
};

interface StackProps {
    title: string;
    children: ReactElement;
};

interface LegendProps {
    title: string;
    image: ReactElement,
    color: string;
};

function LegendItem({ title, image, color }: LegendProps) {
    let style = {
        backgroundColor: color
    };


    return (
        <div className="InformationLegendItem" style={style}>
            {image} <span> {title} </span>
        </div>
    );
}



function IStackContainer({ title, children }: StackProps) {

    let info_item = {
        title: "Info",
        image: <InfoImage />,
        color: "rgb(22,35,56)"
    } as LegendProps;

    let warning_item = {
        title: "Warning",
        image: <BellImage />,
        color: "rgb(105,122,151)"
    } as LegendProps;

    let error_item = {
        title: "Error",
        image: <ExclamationImage />,
        color: "red"
    } as LegendProps;

    let items: LegendProps[] = [info_item, warning_item, error_item];

    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span>
                    {title}
                </span>
                <div className="InformationLegend">
                    {items.map((item: LegendProps, index: number) => {
                        return (<LegendItem {...item} key={index} />)
                    })}
                </div>
            </div>
            {children}
        </div>
    );
}


function StackContainer({ title, children }: StackProps) {
    return (
        <div className="StackContainer">
            <div className="StackTitle">
                <span>
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
};

interface StatusItem {
    title: string;
    value: any;
};



function General() {
    const {
        status,
        cycle,
        total_box,
        current_box,
        time,
        palletConfig,
        dropCoordinates
    } = useContext(PalletizerContext) as PalletizerState;

    let items = [] as StatusItem[];

    items.push({
        title: "Status",
        value: status as string
    });

    items.push({
        title: "Cycle",
        value: String(cycle)
    });

    items.push({
        title: "Current Box",
        value: `${current_box} of ${total_box}`
    });

    items.push({
        title: "Time Remaining",
        value: `${time} Minutes`
    });

    const visualizerProps: VisualizerProps = {
        currentBoxNumber: current_box,
        palletConfig,
        dropCoordinates
    };

    return (
        <div className="GeneralGrid">
            <div className="ExecuteContainer">
                <StackContainer title={"Execute"}>
                    <ExecutePane current_box={current_box} status={status} />
                </StackContainer>
            </div>
            <div className="StatusContainer">
                <StackContainer title={"System"}>
                    <StatusBar items={items} />
                </StackContainer>
            </div>
            <div className="VisualizerContainer">
                <div className="Visualizer">
                    {palletConfig &&
                        <Visualizer {...visualizerProps} />}
                </div>
                <div className="LogoContainer">
                    <img src={logo} />
                </div>
            </div>
            <div className="InformationContainer">
                <IStackContainer title={"Information Console"}>
                    <InformationLogContainer />
                </IStackContainer>
            </div>
        </div>
    );
};

export default General;

