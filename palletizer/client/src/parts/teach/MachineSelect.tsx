import React, {useState, useEffect, ChangeEvent} from "react";

import {get_config} from "../../requests/requests";

import {SavedMachineConfiguration} from "../MachineConfig";

import {DriveSummary, DriveSummaryProps, AxesConfiguration, AXES} from "../machine_config/Drives";

import ContentItem,{ButtonProps} from "./ContentItem";

import {ConfigItem} from "../../types/Types";

//---------------Styles---------------
import "./css/MachineSelect.scss";

export interface MachineSelectProps {
    machine_configs: ConfigItem[];
    instructionNumber: number;
    handleNext: () => void;
    handleBack: () => void;
};

export default function MachineSelect({instructionNumber, handleNext, handleBack, machine_configs} : MachineSelectProps) {

    let [selectedMachine, setSelectedMachine] = useState<ConfigItem>(machine_configs[0]);

    let [Axes, setAxes] = useState<AxesConfiguration | null>(null);
    
    let instruction: string = "Select a machine configuration to use for this pallet configuration";

    let LeftButton: ButtonProps = {
	name: "Back",
	action: () => {
	    handleBack();
	}
    };

    let RightButton : ButtonProps = {
	name: "Next",
	action: () => {
	    handleNext();
	},
	enabled: true
    };

    let contentItemProps = {
	LeftButton,
	RightButton,
	instructionNumber,
	instruction
    } as any;

    let handleChange = (e: ChangeEvent) => {
	let value: number = +(e.target as any).value;
	for (let i = 0; i< machine_configs.length; i++) {
	    let ci : ConfigItem = machine_configs[i];
	    if (ci.id == value) {
		setSelectedMachine(ci);
		break
	    }
	};
    };


    useEffect(()=>{
	let get_axes_configuration = async () => {
	    let res_data = await get_config(selectedMachine.id, true) as any;
            let saved = JSON.parse(res_data.raw_json) as SavedMachineConfiguration;
	    let {axes} = saved.config;
	    setAxes(axes);
	};
	get_axes_configuration();
    }, [selectedMachine]);

    let handleEditAxis =  (a:AXES) => () => {
	console.log("Handle Edit Axes");
    };
    
    return (
	<ContentItem {...contentItemProps} >
	    <div className="MachineSelect">
		<div className="MachineDropDown">
		    <div className="DropDown">
			<select value={selectedMachine.id} onChange={handleChange}>
			    {machine_configs.map((ci: ConfigItem, i: number) => {
				return (
				    <option value={ci.id} key={i}>
					{ci.name}
				    </option>
				);
			    })}

			</select>
		    </div>
		</div>
		<div className="MainContent">
		    {Axes !== null &&
		     <DriveSummary Axes={Axes} handleEditAxis={handleEditAxis} />
		    }
		</div>
	    </div>
	</ContentItem>
    );
};






