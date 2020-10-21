import React, { useState, ChangeEvent, useEffect } from 'react';
import ContentItem, { ButtonProps, ContentItemProps } from "./ContentItem";
import Jogger, { JoggerProps } from "./Jogger";
import Box from "./3D/BoxRender";
import {
    BoxObject,
    BoxDimensions,
    CoordinateRot,
    compareDimensions
} from "../../geometry/geometry";
import { ControlProps, wrapChangeEventNumber } from "../shared/shared";
import { get_machine_config } from '../../requests/requests';
import { SavedMachineConfiguration } from '../MachineConfig';
import { MachineMotion } from '../machine_config/MachineMotions';
import Detection, { DetectionProps, IOOutputPin } from '../machine_config/Detection';

//---------------Styles---------------
import "./css/BoxSize.scss";

interface BoxProps {
    box: BoxObject;
    startEdit: () => void;
    editName: (newName: string) => void;
    handleDelete: () => void;
};

function BoxCell({ box, startEdit, editName, handleDelete }: BoxProps) {

    const { width, length, height } = box.dimensions;

    const handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        editName(newName);
    };

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender">
                    <Box {...box.dimensions} />
                </div>
                <div className="Name">
                    <input type="text" value={box.name} onChange={handleName} />
                </div>
                <div className="Dimensions">
                    <div className="DimensionsGrid">
                        <div className="Dimension">
                            <span>
                                {`W: ${width}`}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {`L: ${length}`}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {`H: ${height}`}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="Edit">
                    <div className="EditButton" onClick={startEdit} >
                        <span>
                            {"Edit"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="Trash" onClick={handleDelete} >
                <span className="icon-delete">
                </span>
            </div>
        </div>
    );
};

//---------------Box Setup Screen---------------
interface CoordinateItemProps {
    name: string;
    value: number;
    setter: (val: number) => void;
};

function CoordinateItem({ name, value, setter }: CoordinateItemProps) {

    const onChange = (e: ChangeEvent) => {
        let val = (e.target as any).value as number;
        setter(+val);
    }

    return (
        <div className="CoordinateItem">
            <div className="CoordinateName">
                <span>
                    {name}
                </span>
                <span className="Unit">
                    {"(mm)"}
                </span>
            </div>
            <div className="CoordinateInput">
                <input type="number" value={value} onChange={onChange} />
            </div>
        </div>
    );
};

interface CreateNewBoxProps {
    box: BoxObject;
    machineConfigId: number;
    LeftButton: ButtonProps;
    RightButton: ButtonProps;
    updateBox: (b: BoxObject) => void;
    instructionNumber: number;
};


function CreateNewBox({ machineConfigId, instructionNumber, box, LeftButton, RightButton, updateBox }: CreateNewBoxProps) {
    // All machines.
    const [showBoxDetection, setShowBoxDetection] = useState<boolean>(false);
    const [allMachines, setAllMachines] = useState<MachineMotion[]>([]);

    useEffect(() => {
        get_machine_config(machineConfigId).then((s: SavedMachineConfiguration) => {
            const machines = s.config.machines;
            setAllMachines(machines);
        }).catch((e: any) => {
            console.log("Error get machine configuration", e);
        });
    }, [machineConfigId]);

    const updateName = (name: string) => {
        updateBox({ ...box, name });
    };

    const updateCoordinate = (dim: string) => (val: number) => {
        const { dimensions } = box;
        const dims = {
            width: dimensions.width,
            length: dimensions.length,
            height: dimensions.height
        } as any;
        dims[dim] = val;
        updateBox({ ...box, dimensions: dims as BoxDimensions });
    };

    const selectAction = (c: CoordinateRot) => {
        console.log("Selected Pick Location: ", c);
        updateBox({ ...box, pickLocation: c });
    };

    const startShowingBoxDetection = () => {
        setShowBoxDetection(true);
    };

    const stopShowingBoxDetection = () => {
        setShowBoxDetection(false);
    };

    const setDetection = (ios: IOOutputPin[]) => {
        updateBox({ ...box, boxDetection: ios });
    };

    const handlePickFromBox = wrapChangeEventNumber(() => {
        updateBox({ ...box, pickFromStack: !box.pickFromStack });
    });

    let instruction = "Move and select box pick location";

    const joggerProps: JoggerProps = {
        machineConfigId,
        selectAction,
        name: box.name,
        updateName,
        allowManualEntry: true, // Allow manual input.
        savedCoordinate: box.pickLocation // start at pick locaiton.
    };

    if (showBoxDetection) {

        const controlProps: ControlProps = {
            instructionNumber,
            handleNext: () => {
                stopShowingBoxDetection();
            },
            handleBack: () => {
                stopShowingBoxDetection();
            }
        };

        const props: DetectionProps = {
            ...controlProps,
            setDetection,
            box_detection: box.boxDetection,
            allMachines,
            isDetection: true
        };

        return (<Detection {...props} />);

    } else {

        const contentItemProps: ContentItemProps = {
            instruction,
            RightButton,
            LeftButton,
            instructionNumber
        };

        return (
            <ContentItem {...contentItemProps} >
                <div className="NewBoxGrid">
                    <div className="BoxSetup">
                        <Jogger {...joggerProps} />
                        <div className="BoxConfigurator">
                            <div className="CreateNewBoxParameterContainer">
                                <div className="PickFromStackToggle">
                                    <input type="checkbox" checked={box.pickFromStack} onChange={handlePickFromBox} />
                                    <span>
                                        {"Pick From Stack"}
                                    </span>
                                </div>
                                <div className="InputButton" onClick={startShowingBoxDetection} >
                                    <span>
                                        {box.boxDetection.length > 0 ? "Edit Box Detection" : "Add Box Detection"}
                                    </span>
                                </div>
                            </div>
                            <Box {...box.dimensions} />
                            <div className="CoordinateDisplay">
                                <CoordinateItem name={"Width"} value={box.dimensions.width} setter={updateCoordinate("width")} />
                                <CoordinateItem name={"Length"} value={box.dimensions.length} setter={updateCoordinate("length")} />
                                <CoordinateItem name={"Height"} value={box.dimensions.height} setter={updateCoordinate("height")} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};

interface BoxSizeProps extends ControlProps {
    allBoxes: BoxObject[];
    setBoxes: (boxes: BoxObject[]) => void;
    machineConfigId: number;
};

export default function BoxSize({ allBoxes, instructionNumber, setBoxes, handleBack, handleNext, machineConfigId }: BoxSizeProps) {

    const [summaryScreen, setSummaryScreen] = useState<boolean>(allBoxes.length > 0);

    const box: BoxObject = {
        name: "Box " + String(allBoxes.length + 1),
        dimensions: { length: 500, height: 100, width: 500 },
        pickLocation: { x: 0, y: 0, z: 1500, θ: 0 },
        boxDetection: [] as IOOutputPin[],
        pickFromStack: false
    };

    const [editingBox, setEditingBox] = useState<BoxObject>(box);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const startEdit = (index: number) => () => {
        if (index >= 0) {
            setEditingBox(allBoxes[index]);
            setEditingIndex(index);
        } else {
            setEditingIndex(null);
            setEditingBox(box);
        }
        setSummaryScreen(false);
    };

    const editName = (boxIndex: number) => (newName: string) => {
        let newBoxes = [...allBoxes];
        newBoxes[boxIndex].name = newName;
        setBoxes(newBoxes);
    };

    let instruction: string;

    const LeftButton: ButtonProps = {
        name: "Back",
        action: () => {
            if (summaryScreen) {
                handleBack(); // Go to the next screen
            } else {
                if (allBoxes.length > 0) {
                    setSummaryScreen(true);
                } else {
                    handleBack();
                }
            }
        }
    };

    const RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
        action: () => {
            if (summaryScreen) {
                if (allBoxes.length > 0) {
                    handleNext();
                }
            } else {
                if (editingIndex !== null) {
                    let b = [...allBoxes];
                    // Check that only
                    const oldBox = b[editingIndex];
                    b[editingIndex] = { ...editingBox, changed: !compareDimensions(oldBox.dimensions, editingBox.dimensions) };
                    setBoxes(b);
                } else {
                    setBoxes([...allBoxes, editingBox]);
                }
                setSummaryScreen(true);
            }
        },
        enabled: summaryScreen ? allBoxes.length > 0 : true
    };

    if (summaryScreen) {
        instruction = "Create and edit boxes";

        const AddButton: ButtonProps = {
            name: "Add new box",
            action: startEdit(-1)
        };

        const contentItemProps: ContentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
            AddButton
        };

        const removeBox = (index: number) => () => {
            let cp = [...allBoxes];
            cp[index].deleted = true;
            setBoxes(cp);
        };

        return (
            <ContentItem {...contentItemProps} >
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allBoxes.map((val: BoxObject, index: number) => {
                                const boxCellProps: BoxProps = {
                                    box: val,
                                    startEdit: startEdit(index),
                                    editName: editName(index),
                                    handleDelete: removeBox(index)
                                };
                                return (
                                    <BoxCell {...boxCellProps} key={index} />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    } else {

        const createBoxProps: CreateNewBoxProps = {
            box: editingBox,
            LeftButton,
            RightButton,
            updateBox: setEditingBox,
            instructionNumber,
            machineConfigId
        };

        return (
            <CreateNewBox {...createBoxProps} />
        );
    }
};




