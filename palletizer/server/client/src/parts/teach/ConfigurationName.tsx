import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


import ContentItem, { ContentItemProps } from "./ContentItem";


interface NameProps {
    handleUpdate: (name: string) => void;
}


function ConfigurationName({ handleUpdate }: NameProps) {

    let onChange = (e: ChangeEvent) => {
        let value = (e.target as HTMLInputElement).value;
        handleUpdate(value);

    };

    let instruction = "Enter a name for your new pallet configuration";
    return (
        <ContentItem instruction={instruction}>

            <div className="ConfigurationName">
                <div className="NameHolder">
                    <input type="text" name="ConfigurationName" placeholder="Pallet Configuration 1" onChange={onChange} />
                </div>
            </div>
        </ContentItem>
    );
}


export default ConfigurationName;
