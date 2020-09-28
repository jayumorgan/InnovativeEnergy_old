import React from "react";
import Modal, { ModalProps } from "./Modal";
import Jogger, { JoggerProps, ForceHome, ForceHomeProps } from "./teach/Jogger";
import { SavedMachineConfiguration } from "./MachineConfig";


import "./css/MachineJogger.scss";
import { CoordinateRot } from "../geometry/geometry";

export interface MachineJoggerProps {
    savedMachineConfiguration: SavedMachineConfiguration | null;
    close: () => void;
};


/* export interface JoggerProps {
 *     selectAction: (c: CoordinateRot) => void;
 *     updateName: (s: string) => void;
 *     machineConfigId: number;
 *     name: string;
 *     hideName?: boolean;
 *     savedMachineConfig?: SavedMachineConfiguration;
 * };
 *  */
export default function MachineJogger({ savedMachineConfiguration, close }: MachineJoggerProps) {

    const modalProps: ModalProps = {
        close
    };

    const id = 0;

    const joggerProps: JoggerProps = {
        selectAction: (_: CoordinateRot) => { return; },
        updateName: (_: string) => { return; },
        machineConfigId: 0, // Irrelevant
        name: savedMachineConfiguration!.name,
        hideName: true,
        savedMachineConfig: savedMachineConfiguration!
    };
    return (
        <Modal {...modalProps} >
            <div className="MachineJogger">
                <div className="Header">
                    <div className="Title">
                        <span>
                            {joggerProps.name}
                        </span>
                    </div>
                </div>
                <div className="SplitView">
                    <Jogger {...joggerProps} />

                </div>
            </div>
        </Modal>
    );
};
