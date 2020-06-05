import React, {Component} from 'react';


import "./css/Configuration.scss";
import "./css/Login.scss";
interface AddConfigButtonProps {
    title: string;
}

class AddConfigButton extends Component<AddConfigButtonProps> {
    render(){
        let {title} = this.props;
        title.toLowerCase();
        title = "Add " + title;
        return(
            <div className="AddContainer" >
            <div className="AddConfigButton" >
                <span> {title} </span>
            </div>
                </div>
        )
    }
    
}


interface ConfigCellProps {
    title: string;
}


class ConfigCell extends Component<ConfigCellProps> {
    render() {
        let {title} = this.props;
        return (
            <div className="ConfigCell">
                <span> {title} </span>
                <div className="EditConfigButton" >
                    <span> Edit </span>
                </div>
                <div className="DeleteConfigButton">
                <span className="icon-delete">
                </span>
                    <span id="button-text">
                        Delete
                    </span>
                </div>
            </div>
        );
    }
}




interface HalfContainerProps {
    title: string;
    configs: string[];
}

class ConfigContainer extends Component<HalfContainerProps> {
    render() {
        let {title, configs} = this.props;
        return(
            <div className="StackContainer">
                <div className="StackTitle">
                    <span> {title} </span>
                </div>
                <div className="StackScroll" >
                    {configs.map((title, index)=>{
                        return (<ConfigCell title={title} key={index} />)
                    })}
                </div>
                <AddConfigButton title={title}/>
            </div>
        )
    }
}



class Configuration extends Component {

    render() {
        let pallet_configs = [] as string[];
        let machine_configs = [] as string[];
        for (let i = 0; i< 20; i++){
            pallet_configs.push("Pallet configuration "+String(i+1));
            machine_configs.push("Machine configuration " + String(i+1));
        }
        return (
            <div className="ConfigGrid">
                <div className="PalletConfig">
                    <ConfigContainer title={"Pallet Configuration"} configs={pallet_configs} />
                </div>
                <div className="MachineConfig">
                    <ConfigContainer title={"Machine Configuration"} configs={machine_configs} />
                </div>
                </div>
        )
    }
}







export default Configuration;
