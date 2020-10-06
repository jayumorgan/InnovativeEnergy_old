import React, { useEffect, useState } from "react";
import { ControlProps } from "../shared/shared"
import ContentItem, { ButtonProps, ContentItemProps } from "./ContentItem";
import { ForceHome, ForceHomeProps } from "./Jogger";
import JogController from "../../jogger/Jogger";
import { get_machine_config } from "../../requests/requests";
import { SavedMachineConfiguration } from "../MachineConfig";

//---------------Styles---------------
import "./css/HomingStep.scss";

export interface HomingStepProps extends ControlProps {
    machineConfigId: number;
};

export default function HomingStep({ machineConfigId, instructionNumber, handleBack, handleNext }: HomingStepProps) {

    const [jogController, setJogController] = useState<JogController | null>(null);

    const createJogger = (s: SavedMachineConfiguration) => {
        const { axes, machines } = s.config;
        const jc = new JogController(machines, axes, (_: any) => { return; }); // amen.
        jc.getPosition();
        setJogController(jc);
    };

    useEffect(() => {
        get_machine_config(machineConfigId).then((smc: SavedMachineConfiguration) => {
            createJogger(smc);
        }).catch((e: any) => {
            console.log("Error get_machine_config", machineConfigId);
        });
    }, [machineConfigId]);

    const LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            handleBack();
        }
    };

    const RightButton: ButtonProps = {
        name: "Done",
        action: () => {
            handleNext();
        },
        enabled: true
    };

    const instruction = "Home all axes before starting and click \"Done\" to continue";

    const contentItemProps: ContentItemProps = {
        LeftButton,
        RightButton,
        instructionNumber,
        instruction
    };

    const forceHomeProps: ForceHomeProps = {
        skip: () => { return; },
        jogController,
        hideDone: true
    };

    return (
        <ContentItem {...contentItemProps} >
            <div className="HomingStepContainer">
                <ForceHome {...forceHomeProps} />
            </div>
        </ContentItem>
    );
};
