import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

interface NameProps {
    handleUpdate: (name : string) => void;
}


function ConfigurationName ({handleUpdate} : NameProps) {
    
    let onChange = (e: ChangeEvent) => {
        let value = (e.target as HTMLInputElement).value;
	handleUpdate(value);
	
     };

   
    return (
	<div className="ConfigurationName">
	    <div className="NameHolder">
		<input type="text" name="ConfigurationName" placeholder="Pallet Configuration 1"  onChange={onChange} />
	    </div>
	</div>
    );
}


export default ConfigurationName;
