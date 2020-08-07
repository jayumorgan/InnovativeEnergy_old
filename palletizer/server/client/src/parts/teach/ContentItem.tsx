import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';


export interface ButtonProps {
    name: string;
    action: () => void;
};

export interface ContentItemProps {
    children: ReactElement;
    instruction: string;
    LeftButton: ButtonProps;
    RightButton: ButtonProps;
}

export default function ContentItem({ children, instruction, LeftButton, RightButton }: ContentItemProps) {
    return (
        <Fragment>
            <div className="TeachModeInstruction">
                <span>
                    {instruction.toLowerCase()}
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


