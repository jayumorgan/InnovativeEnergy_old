import React, { useState } from "react";

import { MachineMotion } from "./MachineMotions";

import ContentItem, { ButtonProps } from "../teach/ContentItem";


export interface IOState {
    MachineMotionIndex: number;
    NetworkId: number;
    Pin: number;
};

export interface IO {
    On: IOState[];
    Off: IOState[];
};

export function defaultIO(): IO {
    return {
        On: [],
        Off: []
    };
}

function defaultIOState(): IOState {
    return {
        MachineMotionIndex: 0,
        NetworkId: 0, // 0, 1, 2? 
        Pin: 0 // 0,1,2,3
    };
};

interface IOConfigProps {
    allMachines: MachineMotion[];
    io: IO;
    setIO: (io: IO) => void;
    handleBack: () => void;
    handleNext: () => void;
    instructionNumber: number;
};

enum IO_STATES {
    ON,
    OFF
};

export default function IOConfig({ io, allMachines, setIO, handleBack, handleNext, instructionNumber }: IOConfigProps) {

    let [currentStateStep, setCurrentStateStep] = useState<boolean>(false);

    let [editingIOs, setEditingIOs] = useState<IOState[]>((() => {
        let curr: IOState[] = [];
        if (currentStateStep) {
            curr = [...io.On];
        } else {
            curr = [...io.Off];
        }
        if (curr.length < 1) {
            curr = [defaultIOState()];
        }
        return curr;
    })());

    let instruction: string = (currentStateStep) ? "Configure the digital outputs for active (suction on)" : "Configure the digital outputs for idle (suction off)";


    let LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            handleNext();
        },
        enabled: true
    };

    let contentItemProps = {
        instruction,
        instructionNumber,
        LeftButton,
        RightButton,
    } as any;

    // This is a two step process. (Idle state and on state);
    // Will have to specify all input outputs of course


    return (
        <ContentItem {...contentItemProps}>
            <div className="IOConfig">

            </div>
        </ContentItem>
    );
}
