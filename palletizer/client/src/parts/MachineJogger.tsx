import React, { useState } from "react";
import Modal, { ModalProps } from "./Modal";
import Jogger, { JoggerProps, ForceHome, ForceHomeProps } from "./teach/Jogger";
import { SavedMachineConfiguration } from "./MachineConfig";
import JogController from "../jogger/Jogger";
import { XIcon } from "./teach/PlusIcon";
import { CoordinateRot } from "../geometry/geometry";

import "./css/MachineJogger.scss";

export interface MachineJoggerProps {
    savedMachineConfiguration: SavedMachineConfiguration | null;
    close: () => void;
};

export default function MachineJogger({ savedMachineConfiguration, close }: MachineJoggerProps) {

    const [jogController, _] = useState<JogController>((() => {
        const { axes, machines } = savedMachineConfiguration!.config;
        return new JogController(machines, axes, (_: any) => { return; });
    })());

    const iconSize = 25;

    const modalProps: ModalProps = {
        close
    };

    const joggerProps: JoggerProps = {
        selectAction: (_: CoordinateRot) => { return; },
        updateName: (_: string) => { return; },
        machineConfigId: 0, // Irrelevant
        name: savedMachineConfiguration!.name,
        hideName: true,
        savedMachineConfig: savedMachineConfiguration!,
        Controller: jogController
    };

    const forceHomeProps: ForceHomeProps = {
        skip: () => { return; },
        hideDone: true,
        jogController
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
                    <div className="CloseButton">
                        <div className="Button" onClick={close}>
                            <XIcon height={iconSize} width={iconSize} />
                        </div>
                    </div>
                </div>
                <div className="SplitView">
                    <ForceHome {...forceHomeProps} />
                    <Jogger {...joggerProps} />
                </div>
            </div>
        </Modal>
    );
};
