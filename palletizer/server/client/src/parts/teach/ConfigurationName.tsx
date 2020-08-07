import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


import ContentItem, { ContentItemProps, ButtonProps } from "./ContentItem";


interface NameProps {
    handleUpdate: (name: string) => void;
    handleNext: () => void;
    handleBack: () => void;
    name: string;
}


function ConfigurationName({ name, handleUpdate, handleNext, handleBack }: NameProps) {

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };
    let RightButton: ButtonProps = {
        name: "Next",
        action: handleNext
    };

    let onChange = (e: ChangeEvent) => {
        let value = (e.target as HTMLInputElement).value;
        handleUpdate(value);
    };

    let instruction = "Enter a name for your new pallet configuration";

    return (
        <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton}>
            <div className="ConfigurationName">
                <div className="NameHolder">
                    <input type="text" name="ConfigurationName" placeholder={name} onChange={onChange} />
                </div>
            </div>
        </ContentItem>
    );
}


export default ConfigurationName;
