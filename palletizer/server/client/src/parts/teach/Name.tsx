import React, { ChangeEvent } from "react";


import { XIcon } from "./PlusIcon";


import "./css/Name.scss";



interface NameProps {
    name: string;
    close: () => void;
    changeName: (s: string) => void;
    handleStart: () => void;
}

export default function TeachModeName({ name, close, changeName, handleStart }: NameProps) {

    let icon_size = 25;
    let onChange = (e: ChangeEvent) => {
        let newName: string = (e.target as any).value;
        changeName(newName);
    };


    return (
        <div className="TeachModeNameStart">
            <div className="ClosePartition" onClick={close}>
                <XIcon height={icon_size} width={icon_size} />
            </div>
            <div className="ContentPartition">
                <div className="Instruction">
                    <span>
                        {"Enter a name for your new pallet configuration"}
                    </span>
                </div>
                <div className="NameInput">
                    <input type="text" value={name} onChange={onChange} />
                </div>
                <div className="StartConfigButton">
                    <div className="StartButton" onClick={handleStart}>
                        <span>
                            {"Start Configuration"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};




