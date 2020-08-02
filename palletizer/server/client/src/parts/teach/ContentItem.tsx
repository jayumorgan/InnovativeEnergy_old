import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';

export interface ContentItemProps {
    children: ReactElement;
    instruction: string;
}

export default function ContentItem({ children, instruction }: ContentItemProps) {
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
        </Fragment>
    );
}


