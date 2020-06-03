import React, {Component} from 'react';
import {Link} from "react-router-dom";
import "./css/NavBar.scss";



interface NavBarItemProps {
    title: string;
    selected: boolean;
}

class NavBarItem extends Component<NavBarItemProps> {
    
    render() {
        let {title, selected} = this.props;
        let class_name = "NavBarItem";
        class_name += selected ? " selected" : "";
        return (
            <div className={class_name}>
                <Link to={"/" + title}>
                    {title}
                </Link>
            </div>
        )
    }
}


interface NavBarProps {
    tabs: string[];
    selected_index: number;
}


class NavBar extends Component<NavBarProps> {
    render() {
        let {tabs, selected_index } = this.props;
        return (
            <div className="NavBarContainer" >
                {tabs.map((item, index)=>{
                    return (<NavBarItem title={item} selected={index == selected_index} key={index} />)  
                })}
            </div>
        ); 
    }
}

export default NavBar;





