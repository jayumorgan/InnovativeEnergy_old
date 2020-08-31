import React from 'react';
import {Link} from "react-router-dom";
import "./css/NavBar.scss";

interface NavBarProps {
    tabs: string[];
    selected_index: number;
}


function NavBar({tabs, selected_index} : NavBarProps) {
    return (
        <div className="NavBarContainer" >
            {tabs.map((item, index)=>{
                let class_name = "NavBarItem";
                class_name += index===selected_index ? " selected" : "";
                return (
                    <Link className={class_name} to={"/" + item.toLowerCase()} key={index}>
                            {item}
                        </Link>
                    )
            })}
        </div>
    );
}


export default NavBar;





