import React from 'react';
import "./css/Footer.scss";

const Version: string = process.env.REACT_APP_VERSION ? process.env.REACT_APP_VERSION : "-42";

function Footer() {
    return (
        <div className="Footer">
            <span> {"V" + String(Version)} </span>
        </div>
    );
}

export default Footer;
