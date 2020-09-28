import React from "react";
import Modal, { ModalProps } from "./Modal";
import Jogger, { JoggerProps, ForceHome, ForceHomeProps } from "./teach/Jogger";
import { SavedMachineConfiguration } from "./MachineConfig";


import "./css/MachineJogger.scss";
import { CoordinateRot } from "../geometry/geometry";

export interface MachineJoggerProps {
    savedMachineConfiguration: SavedMachineConfiguration;
    close: () => void;
};

export default function MachineJogger({ savedMachineConfiguration, close }: MachineJoggerProps) {

    const { name, id } = savedMachineConfiguration;

    const modalProps: ModalProps = {
        close
    };

    /* const joggerProps: JoggerProps = {
     *     selectAction: (_: CoordinateRot) => { return; },
     *     updateName: (_: string) => { return; },
     *     machineConfigId: 
       
       
     * };
     */
    return (
        <Modal {...modalProps} >
            <div className="MachineJogger">
                <div className="Header">
                    <div className="Title">
                        <span>
                            {name}
                        </span>
                    </div>
                </div>
                <div className="SplitView">


                </div>
            </div>
        </Modal>
    );
};
