import React, { Fragment, ReactElement } from 'react';


import PlusIcon from "./PlusIcon";

export interface ButtonProps {
    name: string;
    action: () => void;
    enabled?: boolean;
};

export interface ContentItemProps {
    instruction: string;
    instructionNumber: number;
    LeftButton: ButtonProps;
    RightButton: ButtonProps;
    AddButton?: ButtonProps;
};

interface FullContentItemProps extends ContentItemProps {
    children: ReactElement;
};

const capitalize = (s: string) => {
    return s;
    //    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function ContentItem({ children, instruction, LeftButton, RightButton, instructionNumber, AddButton }: FullContentItemProps) {
    let { enabled } = RightButton;

    return (
        <Fragment>
            <div className="TeachModeInstruction">
                <div className="Left">
                    <span>
                        {"Step " + String(instructionNumber) + ":"}
                    </span>
                    <span className="Instruction">
                        {capitalize(instruction)}
                    </span>
                </div>
                <div className="Right">
                    {AddButton &&
                        <div className="AddButton" onClick={AddButton.action}>
                            <PlusIcon height={20} width={20} />
                            <span>
                                {AddButton.name}
                            </span>
                        </div>}
                </div>
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
                    {enabled ?
                        (<div className="ButtonEnabled" onClick={RightButton.action}>
                            <span>
                                {RightButton.name}
                            </span>
                        </div>)
                        :
                        (<div className="Button">
                            <span>
                                {RightButton.name}
                            </span>
                        </div>)
                    }

                </div>
            </div>
        </Fragment >
    );
}


