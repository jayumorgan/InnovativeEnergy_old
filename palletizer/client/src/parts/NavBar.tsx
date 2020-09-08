import React from 'react';
import { Link } from "react-router-dom";
import "./css/NavBar.scss";

interface NavBarProps {
    tabs: string[];
    selected_index: number;
};

function NavBar({ tabs, selected_index }: NavBarProps) {

    let get_class_name = (name: string, index: number) => {
        return name + (index === selected_index ? " selected" : "");
    };

    return (
        <div className="NavBarContainer" >
            {tabs.map((item, index) => {
                return (
                    <Link className={get_class_name("NavBarItem", index)} to={"/" + item.toLowerCase()} key={index}>
                        {item}
                    </Link>
                );
            })}
        </div>
    );
};


export default NavBar;





