import React, { useContext, useState, Fragment, ReactElement, ChangeEvent } from 'react';





interface CurrentStepBarProps {
    fraction: Fraction;
};


interface DotProps {
    complete: boolean;
}

function CompletionDot({ complete }: DotProps) {

    let circle_id = complete ? "complete" : "incomplete";

    return (
        <svg height="15" width="15">
            <g transform="scale(1,1)">
                <circle cx="50%" cy="50%" r="50%" id={circle_id} />
            </g>
        </svg>
    );
};


function CompletionDots({ fraction }: CurrentStepBarProps) {
    let arr = new Array(fraction.d).fill(null).map((_, i) => i + 1);

    return (
        <div className="StatusBarCompletion">
            <div className="CompletionContainer">
                {arr.map((index: number) => {
                    return (<CompletionDot complete={index <= fraction.n} key={index} />)
                })}
            </div>
        </div>
    );
}

export interface Fraction {
    n: number;
    d: number;
};


export default CompletionDots;

