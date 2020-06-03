import React, {Component} from 'react';


import "./css/Configuration.scss"

interface AddConfigButtonProps {
    title: string;
}

class AddConfigButton extends Component<AddConfigButtonProps> {
    render(){
        let {title} = this.props;
        title.toLowerCase();
        title = "Add " + title;
        return(
            <div className="AddConfigButton" >
                <span> {title} </span>
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
            </div>
        );
    }
}



interface HalfContainerProps {
    title: string;
    configs: string[];
}

class HalfContainer extends Component<HalfContainerProps> {
    render() {
        let {title, configs} = this.props;
        return(
            <div className="HalfContainer">
                <div className="HalfHeader">
                    <span> {title} </span>
                </div>
                <div className="HalfConfigContainer" >
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
    render(){
        let pallet_configs = ['Pallet 1', 'Pallet 2', 'Pallet 3'];
        let machine_configs = ['Machine 1', 'Machine 2', 'Machine 3'];
        return(
            <div className="Configuration" >
                <HalfContainer title={"Pallet Configuration"} configs={pallet_configs} />
                <HalfContainer title={"Machine Configuration"} configs={machine_configs} />
            </div>
        );
    }
}

export default Configuration;
