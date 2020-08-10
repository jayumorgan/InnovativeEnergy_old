import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


export interface ButtonProps {
    name: string;
    action: () => void;
};

export interface ContentItemProps {
    children: ReactElement;
    instruction: string;
    instructionNumber: number;
    LeftButton: ButtonProps;
    RightButton: ButtonProps;
}

let capitalize = (s: string) => {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};



export default function ContentItem({ children, instruction, LeftButton, RightButton, instructionNumber }: ContentItemProps) {
    return (
        <Fragment>
            <div className="TeachModeInstruction">
                <span>
                    {"Step " + String(instructionNumber) + ":"}
                </span>


                <span className="Instruction">
                    {capitalize(instruction)}
                </span>
            </div>
            <div className="TeachModeContent">
                {children}
            </div>
            <div className="TeachModeBottom">
                <div className="Left" onClick={LeftButton.action}>
                    <div className="Button">
                        <span>
                            {LeftButton.name}
                        </span>
                    </div>
                </div>
                <div className="Right">
                    <div className="Button" onClick={RightButton.action}>
                        <span>
                            {RightButton.name}
                        </span>
                    </div>

                </div>
            </div>
        </Fragment>
    );
}


