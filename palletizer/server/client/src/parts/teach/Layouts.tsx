import React, { useRef, useState, DragEvent, ReactElement, ChangeEvent, Fragment } from 'react';

import ContentItem, { ButtonProps } from "./ContentItem";

import PlusIcon, { IconProps } from "./PlusIcon";

import { COLORS } from "./shared/Colors";

import Box from "./3D/BoxRender";

import { PalletGeometry, getPalletDimensions, PlaneDimensions, BoxObject, LayoutObject, BoxPosition2D, Coordinate2D, BoxPositionObject, SVGPosition, Rect } from "./structures/Data";

import "./css/Layouts.scss";


interface DropDownProps {
    allPallets: PalletGeometry[];
    selectPallet: (index: number) => void;
    value: number;
};

function LayoutDropDown({ allPallets, value, selectPallet }: DropDownProps) {

    let handleChange = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        selectPallet(val);
    }

    return (
        <div className="LayoutDropDown">
            <select value={value} onChange={handleChange}>
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
    enabled: boolean;
}

function DraggableRect({ rect, updatePosition, index, enabled }: DraggableRectProps) {

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

        if (enabled) {
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
        }
        //        document.addEventListener("keydown", rotate90, true);
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
        if (enabled) {
            let { offset } = rectangle;

            console.log(offset, "OFFSET");
            setRectPosition(rectangle);
            setActive(false);
        }
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

export enum PALLETCORNERS {
    TOP_LEFT = "TOP_LEFT",
    BOTTOM_LEFT = "BOTTOM_LEFT",
    BOTTOM_RIGHT = "BOTTOM_RIGHT"
};


export function IncreaseCorner(c: PALLETCORNERS) {
    if (c == PALLETCORNERS.TOP_LEFT) {
        return PALLETCORNERS.BOTTOM_LEFT;
    } else if (c === PALLETCORNERS.BOTTOM_LEFT) {
        return PALLETCORNERS.BOTTOM_RIGHT;
    } else {
        return PALLETCORNERS.BOTTOM_RIGHT;
    }
}

export function DecreaseCorner(c: PALLETCORNERS) {
    if (c === PALLETCORNERS.BOTTOM_LEFT) {
        return PALLETCORNERS.TOP_LEFT;
    } else if (c === PALLETCORNERS.BOTTOM_RIGHT) {
        return PALLETCORNERS.TOP_LEFT;
    } else {
        return PALLETCORNERS.TOP_LEFT;
    }
}

export function CornerNumber(c: PALLETCORNERS) {
    switch (c) {
        case PALLETCORNERS.TOP_LEFT: {
            return 0;
        }
        case PALLETCORNERS.BOTTOM_LEFT: {
            return 1;
        }
        case PALLETCORNERS.BOTTOM_RIGHT: {
            return 2;
        }
        default: {
            return -1;
        }
    }
}

interface LayoutModelProps {
    pallet: PalletGeometry;
    size: number; // 650 for half content width;
    outerHeight: number;
    outerWidth: number;
    updateModelBox?: (bpo: BoxPositionObject, index: number) => void;
    boxes?: BoxPositionObject[];
    fullWidth?: number;
    fullHeight?: number;
    corner?: PALLETCORNERS;
    enableDrag?: boolean;
};

interface ModelData {
    w: number;
    l: number;
    scale: number;
    norm: number;
    cx: number;
    topX: number;
    topY: number;
    size: number;
};


function getModelData(pallet: PalletGeometry, size: number): ModelData {

    let dimensions: PlaneDimensions = getPalletDimensions(pallet);
    let norm = Math.sqrt(dimensions.width ** 2 + dimensions.length ** 2);
    let w = dimensions.width / norm * size;
    let l = dimensions.length / norm * size;
    // Scale up the coordinates to take maximum size.
    let scale = (w >= l) ? size / w : size / l;
    w *= scale;
    l *= scale;
    let cx = size / 2;
    let topX = cx - w / 2;
    let topY = (size - l) / 2;

    return {
        w,
        l,
        norm,
        scale,
        cx,
        topX,
        topY,
        size
    } as ModelData
};


function getFractionalCoordinates(modelData: ModelData, outerWidth: number, outerHeight: number, x: number, y: number): [number, number] {
    let { topX, topY, size, w, l } = modelData;

    let palletX = (outerWidth - size) / 2 + topX;
    let palletY = topY;
    let fractionX = (x - palletX) / w;
    let fractionY = (y - palletY) / l;

    return [fractionX, fractionY];
};


export function LayoutModel({ enableDrag, pallet, size, outerHeight, outerWidth, boxes, updateModelBox, fullWidth, fullHeight, corner }: LayoutModelProps) {

    let isDragEnabled = enableDrag ? enableDrag : false;

    let modelData = getModelData(pallet, size);

    let { w, l, norm, scale, cx, topX, topY } = modelData;

    let logColor: string = String(COLORS.LOG);

    let bottomLog: Rect = {
        x: topX,
        y: size - (size - l) / 2 - size / 10,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };

    let topLog: Rect = {
        x: topX,
        y: topY,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };

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

    let updateRectPosition = (index: number, nx: number, ny: number) => {
        if (boxes && updateModelBox) {
            let [fractionX, fractionY] = getFractionalCoordinates(modelData, outerWidth, outerHeight, nx, ny);
            let box = boxes[index];
            let newBox = {
                ...box,
                position: {
                    x: fractionX,
                    y: fractionY
                }
            } as BoxPositionObject;

            updateModelBox(newBox, index);
        }
    };

    //    let [goodBoxes, setGoodBoxes] = useState<BoxPosition2D[]>([]);
    let BoxSVGs: Rect[] = [];
    if (boxes) {
        boxes.forEach((b: BoxPositionObject) => {
            let { position, box } = b;
            console.log("Top X", topX);

            let x = w * position.x + topX + svg_props.x;
            console.log("x ", x);
            let y = l * position.y + topY;

            let scaleSize = b.size;
            let scaleRatio = size / scaleSize;

            let { width, length } = box.dimensions;

            width *= size * scale / norm;
            length *= size * scale / norm;

            let boxColor = String(COLORS.CLEAR_BOX);

            let boxprops: Rect = {
                x,
                y,
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
    } as any;

    if (fullWidth && fullHeight) {
        outerSVG.x = (fullWidth - outerWidth) / 2;
        outerSVG.y = (fullHeight - outerHeight) / 2;
    }
    let cornerCircleProps = {} as any;
    let cornerTextProps = {} as any;

    if (corner) {
        let green = "rgb(91,196,126)"
        let grey = "rgb(135,135,135)"
        cornerCircleProps.r = 30;
        cornerCircleProps.fill = green;
        //cornerCircleProps.stroke = grey;
        //cornerCircleProps.strokeWidth = 2;
        cornerTextProps.height = 60;
        cornerTextProps.width = 60;
        cornerTextProps.fontSize = 30;
        cornerTextProps.stroke = "white";
        cornerTextProps.fill = "white";

        switch (corner) {
            case PALLETCORNERS.TOP_LEFT: {
                cornerCircleProps.cx = topLog.x;
                cornerCircleProps.cy = topLog.y;
                break;
            };
            case PALLETCORNERS.BOTTOM_LEFT: {
                cornerCircleProps.cx = bottomLog.x;
                cornerCircleProps.cy = (bottomLog.y as number) + (bottomLog.height as number);
                break;
            };
            case PALLETCORNERS.BOTTOM_RIGHT: {
                cornerCircleProps.cx = (bottomLog.x as number) + (bottomLog.width as number);
                cornerCircleProps.cy = (bottomLog.y as number) + (bottomLog.height as number);
                break;
            }

        };
        cornerCircleProps.cx += outerSVG.x;
        cornerCircleProps.cy += outerSVG.y;

        cornerTextProps.x = cornerCircleProps.cx - 10;
        cornerTextProps.y = cornerCircleProps.cy + 10;
    };
    return (
        <>
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
                        <DraggableRect index={index} rect={r} updatePosition={updateRectPosition} key={index} enabled={isDragEnabled} />
                    );
                })}
            </svg>
            {corner && <circle {...cornerCircleProps} />}
            {corner && <text {...cornerTextProps}> {String(CornerNumber(corner) + 1)} </text>}
        </>
    );

};
//---------------Box Image Props---------------
interface BoxImageProps {
    width: number;
    length: number;
}


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
};

interface LayoutCellProps {
    pallet: PalletGeometry;
    layout: LayoutObject;
    startEdit: () => void;
};

function LayoutCell({ layout, pallet, startEdit }: LayoutCellProps) {
    let { name, boxPositions } = layout;
    let { width, length } = getPalletDimensions(pallet)

    let iconSize = 30;
    let size = 100;

    let model_props = {
        pallet,
        size,
        outerWidth: size,
        outerHeight: size,
        boxes: layout.boxPositions
    } as LayoutModelProps;


    let handleName = (e: ChangeEvent) => {
        let newName = (e.target as any).value;
    };

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender" >
                    <LayoutModel {...model_props} />
                </div>
                <div className="Name">
                    <input type="text" value={name} onChange={handleName} />
                </div>
                <div className="Dimensions">
                    <div className="DimensionsGrid2">
                        <div className="Dimension">
                            <span>
                                {"Width: " + String(width)}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {"Length: " + String(length)}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="Edit">
                    <div className="EditButton" onClick={startEdit}>
                        <span>
                            {"Edit"}
                        </span>
                    </div>
                </div>
            </div>
            <div className="Trash">
                <span className="icon-delete">
                </span>
            </div>
        </div>
    );

}

interface SummaryProps {
    startEdit: (palletIndex: number, layoutIndex: number) => () => void;
    allPallets: PalletGeometry[]
}

// <NewLayoutCell startEdit={startEdit} />
function LayoutSummary({ startEdit, allPallets }: SummaryProps) {

    let key = 0;
    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    {allPallets.map((p: PalletGeometry, index: number) => {
                        if (p.Layouts.length > 0) {
                            return (
                                <Fragment key={index}>
                                    {
                                        p.Layouts.map((l: LayoutObject, j: number) => {
                                            return (<LayoutCell pallet={p} layout={l} key={key++} startEdit={startEdit(index, j)} />);
                                        })
                                    }
                                </Fragment>
                            );
                        }
                    })}
                </div>
            </div>
        </div >
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

    let { width, height, length } = box.dimensions;

    return (
        <div className="BoxContainer">
            <div className="Box" draggable onDragStart={dragStart} onDragEnd={dragEnd}>
                <div className="MiniRender">
                    <Box {...box.dimensions} />
                </div>
                <div className="BoxInfo">
                    <div className="Name">
                        <span>
                            {box.name}
                        </span>
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
                </div>
            </div>
        </div>
    );



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
    setPallets: (pallets: PalletGeometry[]) => void;
    handleNext: () => void;
    handleBack: () => void;
    instructionNumber: number;
};

function defaultLayout(index: number) {
    let l: LayoutObject = {
        name: "Layout " + String(index),
        boxPositions: [],
        height: 0,
    };
    return l;
};

function Layout({ instructionNumber, allBoxes, allPallets, setPallets, handleNext, handleBack }: LayoutProps) {

    let modelSize = 620;

    let modelDims = {
        outerWidth: 835,
        outerHeight: 627
    };

    let index = 0;
    let haveLayout = false;
    let layoutCount = 0;

    allPallets.forEach((p: PalletGeometry, i: number) => {
        if (p.Layouts.length > 0) {
            layoutCount += 1;
            haveLayout = true;
        }
    });

    let [currentPalletIndex, setCurrentPalletIndex] = useState<number>(0);

    let [currentLayoutIndex, setCurrentLayoutIndex] = useState<number>(0);

    let [summaryScreen, setSummaryScreen] = useState<boolean>(haveLayout);

    let DisplayElement = useRef<HTMLDivElement>(null);

    let [modelBoxes, setModelBoxes] = useState<BoxPositionObject[]>([]);

    let [editingLayout, setEditingLayout] = useState<LayoutObject>(defaultLayout(layoutCount + 1));

    // let [tempBoxes, setTempBoxes] = useState<BoxPosition2D[]>([]);

    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
    };

    let updateModelBox = (bpo: BoxPositionObject, index: number) => {
        let newModels: BoxPositionObject[] = [];
        modelBoxes.forEach((b: BoxPositionObject, i: number) => {
            if (i === index) {
                newModels.push(bpo)
            } else {
                newModels.push(b);
            }
        });
        setModelBoxes(newModels);
    };

    let handleName = (e: ChangeEvent) => {
        let name = (e.target as any).value;
        setEditingLayout({ ...editingLayout, name });
    };

    let RightButton: ButtonProps = {
        name: "Next",
        action: () => {
            if (summaryScreen) {
                handleNext()
            } else {
                if (modelBoxes.length > 0) {

                    let h = 0;
                    let goodBoxes: BoxPositionObject[] = [];
                    modelBoxes.forEach((bpo: BoxPositionObject, i: number) => {
                        goodBoxes.push(bpo);
                        if (bpo.box.dimensions.height > h) {
                            h = bpo.box.dimensions.height;
                        }
                    });

                    let newLayout = {
                        ...editingLayout,
                        boxPositions: goodBoxes,
                        height: h
                    } as LayoutObject;

                    let newPallets: PalletGeometry[] = [];

                    allPallets.forEach((p: PalletGeometry, i: number) => {
                        let t = { ...p };
                        if (i === currentPalletIndex) {
                            let { Layouts } = p;

                            if (currentLayoutIndex < Layouts.length) {
                                let newLayouts = [] as LayoutObject[];
                                Layouts.forEach((l: LayoutObject, j: number) => {
                                    if (j === currentLayoutIndex) {
                                        newLayouts.push(newLayout);
                                    } else {
                                        newLayouts.push(l);
                                    }
                                    t = { ...p, Layouts: newLayouts };
                                });
                            } else {
                                t.Layouts.push(newLayout);
                            }
                        }
                        newPallets.push(t);
                    });

                    setEditingLayout(defaultLayout(layoutCount + 2));
                    setPallets(newPallets);
                    setSummaryScreen(true);
                }
            }
        }
    };

    let startEdit = (palletIndex: number, layoutIndex: number) => () => {
        // Handle Setting Up the Boxes here.
        setCurrentPalletIndex(palletIndex);
        setCurrentLayoutIndex(layoutIndex);
        setModelBoxes(allPallets[palletIndex].Layouts[layoutIndex].boxPositions);
        setSummaryScreen(false);
    };

    let instruction: string;
    let placeholder = "Pallet Layout " + String(1);

    let dragOver = (e: DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
    };

    let onDrop = (e: DragEvent<HTMLDivElement>) => {
        if (DisplayElement.current) {
            let modelData = getModelData(allPallets[currentPalletIndex], modelSize);
            let { clientX, clientY } = e;
            let { x, y } = DisplayElement.current.getBoundingClientRect();
            let prX = clientX - x;
            let prY = clientY - y;
            let index = parseInt(e.dataTransfer.getData("BoxIndex"));

            let px = clientX - x;
            let py = clientY - y;

            let [fracX, fracY] = getFractionalCoordinates(modelData, modelDims.outerWidth, modelDims.outerHeight, px, py);

            let bpo: BoxPositionObject = {
                position: {
                    x: fracX,
                    y: fracY
                },
                box: allBoxes[index],
                size: modelSize
            };
            setModelBoxes([...modelBoxes, bpo]);
        }
    };


    let handlePalletSelect = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        setCurrentPalletIndex(val);
    };

    //---------------Display---------------
    if (summaryScreen) {
        instruction = "Create and edit layouts";
        return (
            <ContentItem instructionNumber={instructionNumber} instruction={instruction} LeftButton={LeftButton} RightButton={RightButton}>
                <LayoutSummary startEdit={startEdit} allPallets={allPallets} />
            </ContentItem>
        );
    } else {
        instruction = "Drag and drop boxes to create a layout";

        let contentItemProps = {
            instructionNumber,
            instruction,
            LeftButton,
            RightButton
        } as any;

        let layoutModelProps = {
            outerWidth: modelDims.outerWidth,
            outerHeight: modelDims.outerHeight,
            boxes: modelBoxes,
            updateModelBox: updateModelBox,
            pallet: allPallets[currentPalletIndex],
            size: modelSize,
            enableDrag: true
        } as any;

        return (
            <ContentItem {...contentItemProps} >
                <div className="Layout">
                    <div className="Boxes">
                        <div className="Name">
                            <div className="Title">
                                <span>
                                    {"Name:"}
                                </span>
                            </div>
                            <div className="Input">
                                <input type="text" value={editingLayout.name} onChange={handleName} />
                            </div>
                        </div>
                        <div className="BoxContainer">
                            <div className="Scroll">
                                {allBoxes.map((b: BoxObject, i: number) => {
                                    return (
                                        <BoxCell box={b} index={i} key={i} />
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="LayoutView">
                        <div className="LayoutContainer">
                            <div className="PalletSelect">
                                <div className="Title">
                                    <span>
                                        {"On to pallet:"}
                                    </span>
                                </div>
                                <div className="Drop">
                                    <select value={currentPalletIndex} onChange={handlePalletSelect}>
                                        {allPallets.map((pallet: PalletGeometry, index: number) => {
                                            return (
                                                <option value={index} key={index}> {pallet.name} </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="Pallet" ref={DisplayElement} onDragOver={dragOver} onDrop={onDrop}>
                                <LayoutModel {...layoutModelProps} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};


export default Layout;
