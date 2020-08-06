import React, { useRef, useState, DragEvent, ReactElement } from 'react';

import ContentItem, { ButtonProps } from "./ContentItem";

import PlusIcon, { IconProps } from "./PlusIcon";

import { COLORS } from "./shared/Colors";

import Box from "./3D/BoxRender";

import { PalletGeometry, getPalletDimensions, PlaneDimensions, BoxObject, LayerObject, BoxPosition2D, Coordinate2D } from "./structures/Data";

import "./css/Layout.scss";

interface NewLayoutCellProps {
    startEdit: () => void;
};

interface DropDownProps {
    allPallets: PalletGeometry[];
};

function LayoutDropDown({ allPallets }: DropDownProps) {
    return (
        <div className="LayoutDropDown">
            <select>
                {allPallets.map((pallet: PalletGeometry, index: number) => {
                    return (
                        <option value={index} key={index}> {pallet.name} </option>
                    );
                })}
            </select>
        </div>
    );
};


interface DraggableRectProps {
    rect: Rect;
    updatePosition: (index: number, x: number, y: number) => void;
    index: number;
}

function DraggableRect({ rect, updatePosition, index }: DraggableRectProps) {

    let [rectangle, setRectangle] = useState<Rect>(rect);

    let [active, setActive] = useState<boolean>(false);

    let setRectPosition = (r: Rect) => {
        updatePosition(index, r.x, r.y);
    };

    let rotate90 = (k: any) => {
        if (k.key == "r") {
            let r = { ...rectangle };
            r.width = rectangle.height;
            r.height = rectangle.width;
            setRectangle(r);
        }
        console.log(k.key);
    };

    let handleDown = (e: React.PointerEvent) => {
        let el = e.target;
        let bb = (e.target as any).getBoundingClientRect();
        let x = e.clientX - bb.left;
        let y = e.clientY - bb.top;

        setRectangle({
            ...rectangle,
            offset: {
                x,
                y
            }
        });
        setActive(true);
        document.addEventListener("keydown", rotate90, true);
    };

    let handleMove = (e: React.PointerEvent) => {
        let bb = (e.target as any).getBoundingClientRect();
        let x = e.clientX - bb.left;
        let y = e.clientY - bb.top;
        if (active) {
            let { offset } = rectangle;
            setRectangle({
                ...rectangle,
                x: rectangle.x - (offset.x - x),
                y: rectangle.y - (offset.y - y)
            });
        }
    };

    let handleUp = (e: React.PointerEvent) => {
        setRectPosition(rectangle);
        setActive(false);
    };

    let actions = {
        onPointerDown: handleDown,
        onPointerMove: handleMove,
        onPointerUp: handleUp
    } as any;

    let fill = active ? String(COLORS.MOVE_BOX) : String(COLORS.CLEAR_BOX);

    return (
        <rect
            {...rectangle} fill={fill} {...actions}
        />
    );
};


interface LayoutModelProps {
    pallet: PalletGeometry;
    size: number; // 650 for half content width;
    outerHeight: number;
    outerWidth: number;
    updateLayoutBoxes?: (c: BoxPosition2D[]) => void;
    boxes?: BoxPositionObject[];
};

// We will pass the palletizer coordinates into the thing.
// We don't need anything else, as the boxes are there


export function LayoutModel({ pallet, size, outerHeight, outerWidth, boxes, updateLayoutBoxes }: LayoutModelProps) {

    let dimensions: PlaneDimensions = getPalletDimensions(pallet);

    let norm = Math.sqrt(dimensions.width ** 2 + dimensions.length ** 2);

    let w = dimensions.width / norm * size;
    let l = dimensions.length / norm * size;
    // Scale up the coordinates to take maximum size.
    let scale = (w >= l) ? size / w : size / l;
    w *= scale;
    l *= scale;
    let cx = size / 2;
    //  let cy = size / 2;
    let logColor: string = String(COLORS.LOG);

    let bottomLog: Rect = {
        x: cx - w / 2,
        y: size - (size - l) / 2 - size / 10,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };

    let topLog: Rect = {
        x: cx - w / 2,
        y: (size - l) / 2,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };
    // Horizontal planks....
    let plankColor: string = String(COLORS.PLANK);

    let planks = [] as Rect[];
    let plankNumber = 6;
    let spaceFraction = 2 / 3;
    let plankWidth = w * spaceFraction / plankNumber;
    let iX = (w - plankNumber * plankWidth) / (plankNumber - 1) + plankWidth;
    let startX = (size - w) / 2;
    let Y = (size - l) / 2;

    for (let i = 0; i < plankNumber; i++) {
        let plk: Rect = {
            x: startX + i * iX,
            y: Y,
            width: plankWidth,
            height: l,
            fill: plankColor,
            stroke: plankColor,
            strokeWidth: 0
        };
        planks.push(plk);
    }

    let svg_props = {
        width: size,
        height: size,
        x: (outerWidth - size) / 2,
        y: (outerHeight - size) / 2
    } as any;

    let BoxSVGs: Rect[] = [];

    let calculatePositionFraction = (x: number, y: number) => {
        let palletX = svg_props.x + topLog.x;
        let palletY = topLog.y;
        //Fractions are relative to pallet.
        let fractionX = (x - palletX) / w;
        let fractionY = (y - palletY) / l;

        return [fractionX, fractionY];
    };

    let [goodBoxes, setGoodBoxes] = useState<BoxPosition2D[]>([]);

    // How do we get the box positions after a drop? 
    let updateRectPosition = (index: number, nx: number, ny: number) => {
        let [fractionX, fractionY] = calculatePositionFraction(nx, ny);

        if (boxes && updateLayoutBoxes) {
            // Loop through boxes in boxes
            let temp: BoxPosition2D[] = [];

            boxes.forEach(({ position, box }: BoxPositionObject, i: number) => {
                let { x, y } = position;

                if (index === i) {
                    x = nx;
                    y = ny;
                }
                let bp2d = {
                    box,
                    position: {
                        x, y
                    }
                } as BoxPosition2D;

                temp.push(bp2d);
            });
            // Loop through the boxes -- local copy of box coordinates? 
            console.log(temp);
            updateLayoutBoxes(temp);
        }
    };


    if (boxes) {
        console.log("Looping Again...", boxes);

        boxes.forEach(({ position, box }: BoxPositionObject) => {
            //
            let { x, y } = position;
            let { width, length } = box.dimensions;

            width *= size * scale / norm;
            length *= size * scale / norm;

            let boxColor = String(COLORS.CLEAR_BOX);

            let boxprops: Rect = {
                x: x - width / 2,
                y: y - length / 2,
                width,
                height: length,
                fill: boxColor,
                stroke: boxColor,
                strokeWidth: 0
            };

            BoxSVGs.push(boxprops);
        });
    }

    let outerSVG = {
        x: 0,
        y: 0,
        width: outerWidth,
        height: outerHeight
    };

    // We are going to need box position updates.
    // Position is local -- we dont need to deal with that.
    // How are box positions updated ? -- They are not. 
    return (
        <svg {...outerSVG} >
            <svg {...svg_props} >
                <rect {...bottomLog} />
                <rect {...topLog} />
                {planks.map((r: Rect, index: number) => {
                    return (
                        <rect {...r} key={index} />
                    );
                })}
            </svg>
            {BoxSVGs.map((r: Rect, index: number) => {
                return (
                    <DraggableRect index={index} rect={r} updatePosition={updateRectPosition} key={index} />
                );
            })}
        </svg>
    );

};
//---------------Box Image Props---------------
interface BoxImageProps {
    width: number;
    length: number;
}


export interface Rect {
    x: number;
    y: number;
    width: string | number;
    height: string | number;
    fill: string;
    stroke: string;
    strokeWidth: number | string;
    offset?: any
};

/* <rect x="50" y="20" width="150" height="150"
 * style="fill:blue;stroke:pink;stroke-width:5;fill-opacity:0.1;stroke-opacity:0.9" /> */

function BoxImage({ width, length }: BoxImageProps) {
    let norm = Math.sqrt(width ** 2 + length ** 2);

    let w = width / norm * 100;
    let h = length / norm * 100;

    let x = 50 - w / 2;
    let y = 50 - h / 2;

    let cardboard = "rgb(89,69,50)";
    let box = "rgb(89,69,50)";

    let rect: Rect = {
        x,
        y,
        width: w,
        height: h,
        fill: box,
        stroke: cardboard,
        strokeWidth: "1"
    };


    return (
        <svg width="100" height="100">
            <g transform="scale(1,1)">
                <rect {...rect} />
            </g>
        </svg>
    )
}


function NewLayoutCell({ startEdit }: NewLayoutCellProps) {
    let iconSize = {
        height: 50,
        width: 50
    } as IconProps;

    return (
        <div className="BoxCellContainer">
            <div className="NewBoxCell" onClick={startEdit}>
                <div className="Icon">
                    <PlusIcon {...iconSize} />
                </div>
                <div className="BoxName">
                    <span>
                        {"Create A New Layer"}
                    </span>
                </div>
            </div>
        </div>
    );
};



interface DimensionCellProps {
    axis: string;
    value: number;
}

function DimensionCell({ axis, value }: DimensionCellProps) {

    return (
        <div className="DimensionCell">
            <span>
                {axis + ": " + String(value)}
            </span>
        </div>
    );
}




function LayoutCell({ name, pallet, boxPositions }: LayerObject) {
    let { width, length } = getPalletDimensions(pallet)

    let iconSize = 30;
    let size = 100;

    let model_props = {
        pallet,
        size,
        outerWidth: size,
        outerHeight: size,
    };
    let boxCount = ` (${boxPositions.length} boxes)`;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender" >
                    <LayoutModel {...model_props} />
                </div>
                <div className="BoxDetails">
                    <div className="BoxName">
                        <span>
                            {name + boxCount}
                        </span>
                    </div>
                </div>
                <div className="Buttons">
                </div>
            </div>
        </div >
    );

}

interface SummaryProps {
    startEdit: () => void;
    allLayers: LayerObject[]
}

function LayoutSummary({ startEdit, allLayers }: SummaryProps) {
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    <NewLayoutCell startEdit={startEdit} />
                    {allLayers.map((l: LayerObject, index: number) => {
                        return (
                            <LayoutCell {...l} />
                        );
                    })}

                </div>
            </div>
        </div>
    );
}

interface BoxCellProps {
    box: BoxObject;
    index: number
}

function BoxCell({ box, index }: BoxCellProps) {


    let [isDragging, setIsDragging] = useState<boolean>(false);

    let dragStart = (ev: DragEvent) => {
        ev.dataTransfer.setData("BoxIndex", String(index));
        setIsDragging(true);
    };

    let dragEnd = () => {
        setIsDragging(false);
    };

    return (
        <div className="BoxCell" onDragStart={dragStart} onDragEnd={dragEnd} draggable>
            <Box {...box.dimensions} />
            <div className="BoxDetails">
                <div className="BoxName">
                    <span>
                        {box.name}
                    </span>
                </div>
                <div className="BoxDimensions">
                    <DimensionCell axis={"Width"} value={box.dimensions.width} />
                    <DimensionCell axis={"Length"} value={box.dimensions.length} />
                    <DimensionCell axis={"Height"} value={box.dimensions.height} />
                </div>
            </div>
        </div>
    );

};

interface LayoutProps {
    allBoxes: BoxObject[];
    allPallets: PalletGeometry[];
    allLayers: LayerObject[];
    setLayers: (layers: LayerObject[]) => void;
    handleNext: () => void;
    handleBack: () => void;
};

interface SVGPosition {
    x: number;
    y: number;
}

interface BoxPositionObject {
    position: SVGPosition;
    box: BoxObject;
};

function defaultLayer(index: number) {
    let l: LayerObject = {
        name: "Layer " + String(index),
        pallet: allPallets[0],
        boxPositions: [],
        height: 0
    };

    return l;

};


function Layout({ allBoxes, allPallets, allLayers, setLayers, handleNext, handleBack }: LayoutProps) {

    // Get Rid Of Model Boxes, just use layout -- pretty annoying of course.

    let [summaryScreen, setSummaryScreen] = useState<boolean>(false);

    let DisplayElement = useRef<HTMLDivElement>(null);

    let [modelBoxes, setModelBoxes] = useState<BoxPositionObject[]>([]);

    let [editingLayer, setEditingLayer] = useState<LayerObject>(defaultLayer(allLayers.length + 1));

    let [tempBoxes, setTempBoxes] = useState<BoxPosition2D[]>([]);

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            if (summaryScreen) {
                handleNext()
            } else {
                if (tempBoxes.length > 0) {

                    let h = 0;
                    let goodBoxes: BoxPosition2D[] = [];

                    tempBoxes.forEach((b: BoxPosition2D) => {
                        let { x, y } = b.position;
                        console.log("Also check that it is less that the size of the pallet <1 (and box relative to pallet size)")
                        if (x >= 0 && y >= 0) {
                            goodBoxes.push(b);
                            if (b.box.dimensions.height > h) {
                                h = b.box.dimensions.height;
                            }
                        }
                    });

                    let newLayer = {
                        ...editingLayer,
                        boxPositions: goodBoxes,
                        height: h
                    } as LayerObject;

                    setEditingLayer(defaultLayer(allLayers.length + 2));
                    setLayers([...allLayers, newLayer]);
                    setSummaryScreen(true);
                }
            }
        }
    };

    let startEdit = () => {
        setSummaryScreen(false);
    };

    let instruction: string;
    let placeholder = "Pallet Layer " + String(1);

    let dragOver = (e: DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
    };

    let onDrop = (e: DragEvent<HTMLDivElement>) => {

        if (DisplayElement.current) {
            let { clientX, clientY } = e;
            let { x, y } = DisplayElement.current.getBoundingClientRect();
            let prX = clientX - x;
            let prY = clientY - y;
            let index = parseInt(e.dataTransfer.getData("BoxIndex"));
            let position: SVGPosition = {
                x: clientX - x,
                y: clientY - y
            };
            let bpo: BoxPositionObject = {
                position,
                box: allBoxes[index]
            };
            setModelBoxes([...modelBoxes, bpo]);
        }
    };

    //---------------Display---------------
    if (summaryScreen) {
        instruction = "Create and edit layers";
        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton}>
                <LayoutSummary startEdit={startEdit} allLayers={allLayers} />
            </ContentItem>
        );
    } else {
        instruction = "Drag and drop boxes to create a layer";

        let modelDims = {
            outerWidth: 1026,
            outerHeight: 664
        };

        return (
            <ContentItem instruction={instruction} LeftButton={LeftButton} RightButton={RightButton}>
                <div className="LayoutContainer">
                    <div className="LayoutName">
                        <div className="NameHolder">
                            <input type="text" placeholder={placeholder} />
                        </div>
                    </div>
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allBoxes.map((box: BoxObject, key: number) => {
                                return (
                                    <div className="BoxCellContainer" key={key}>
                                        <BoxCell box={box} key={key} index={key} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="LayoutModel">
                        <LayoutDropDown allPallets={allPallets} />
                        <div className="LayoutDisplay" ref={DisplayElement} onDragOver={dragOver} onDrop={onDrop}>
                            <LayoutModel pallet={allPallets[0]} size={650} {...modelDims} boxes={modelBoxes} updateLayoutBoxes={setTempBoxes} />
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};






export default Layout;
