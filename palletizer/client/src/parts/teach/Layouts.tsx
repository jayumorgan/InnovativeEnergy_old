import React, { useRef, useState, DragEvent, ChangeEvent, Fragment } from 'react';

import ContentItem, { ButtonProps } from "./ContentItem";

// import PlusIcon, { IconProps } from "./PlusIcon";

import { COLORS } from "./shared/Colors";

import Box from "./3D/BoxRender";

import { PalletGeometry, getPalletDimensions, PlaneDimensions, BoxObject, LayoutObject, BoxPositionObject, Rect, BoxDimensions } from "./structures/Data";

import "./css/Layouts.scss";


interface RotateIconProps {
    size: number;
    rotate: boolean;
}

function RotateIcon({ size, rotate }: RotateIconProps) {

    let dString: string = "M 35 15 L 35 15, 70 15 C 75 15, 75 15, 75 35 L 75 35 75 55";

    let scale = Math.round(size / 100 * 10) / 10;

    let scaleString = `scale(${scale}, ${scale})`;

    let rectProps: Rect = {
        x: 10,
        y: 30,
        width: 50,
        height: 50,
        fill: "none",
        stroke: "black",
        strokeWidth: 3
    };

    let pathProps = {
        d: dString,
        stroke: "black",
        strokeWidth: size / 15,
        fill: "transparent",
    } as any;

    if (!rotate) {
        pathProps.markerStart = "url(#arrowheadback)";
    } else {
        pathProps.markerEnd = "url(#arrowhead)";
    }

    return (
        <svg width={size} height={size}>
            <g transform={scaleString}>
                <marker id="arrowhead" markerWidth={5} markerHeight={4}
                    refX="0" refY="2" orient="auto">
                    <polygon points="0 0, 5 2, 0 4" />
                </marker>
                <marker id="arrowheadback" markerWidth={5} markerHeight={4}
                    refX="2.5" refY="2" orient="auto">
                    <polygon points="5 0, 0 2, 5 4" />
                </marker>
                <rect {...rectProps} />
                <path {...pathProps} />
            </g>
        </svg>
    );
};

interface DraggableRectProps {
    rect: Rect;
    updatePosition: (index: number, x: number, y: number) => void;
    index: number;
    enabled: boolean;
    name: string;
    showName?: boolean;
    xl: number;
    xh: number;
    yl: number;
    yh: number;
};

function lockCoordinateEdges(currentPosition: number, dimensionSize: number, fullDistance: number): number {
    let leftEdge = currentPosition - dimensionSize / 2;
    let rightEdge = currentPosition + dimensionSize / 2;
    let newPosition = leftEdge;

    let divisor = 2 * 6; // Even Number
    let distanceUnit = fullDistance / divisor;
    let thresholdDistance = distanceUnit / 3;

    let modDistances = (a: number) => {
        let lmd = Math.abs(a % distanceUnit);
        let hmd = Math.abs(distanceUnit - lmd);
        return [lmd, hmd];
    };

    let lowMultiple = (a: number) => Math.floor(a / distanceUnit);
    let highMultiple = (a: number) => Math.ceil(a / distanceUnit);

    let [lowModDistance, highModDistance] = modDistances(leftEdge);

    let leftEdgeLowMultiple = lowMultiple(leftEdge);
    let leftEdgeHighMultiple = highMultiple(leftEdge);

    let centerFromCenter = Math.abs(currentPosition - fullDistance / 2);

    if (centerFromCenter < thresholdDistance) {
        newPosition = (fullDistance - dimensionSize) / 2;
        return newPosition;
    } else if (leftEdgeLowMultiple < 0) { // It has gone over the edge
        newPosition = leftEdge;
        return newPosition;
    } else {
        let [lowModDistance, highModDistance] = modDistances(leftEdge);
        let rightEdgeFromCenter = Math.abs(rightEdge - fullDistance / 2);
        let rightEdgeFromEdge = Math.abs(rightEdge - fullDistance);
        if (lowModDistance < thresholdDistance) {
            newPosition = leftEdgeLowMultiple * distanceUnit;
        } else if (highModDistance < thresholdDistance) {
            newPosition = leftEdgeHighMultiple * distanceUnit;
        } else if (rightEdgeFromCenter < thresholdDistance) {
            newPosition = fullDistance / 2 - dimensionSize;
        } else if (rightEdgeFromEdge < thresholdDistance) {
            newPosition = fullDistance - dimensionSize;
        }
        return newPosition;
    }
};

function DraggableRect({ rect, updatePosition, index, enabled, name, showName, xl, xh, yl, yh }: DraggableRectProps) {

    let [rectangle, setRectangle] = useState<Rect>(rect);

    let [active, setActive] = useState<boolean>(false);

    let setRectPosition = (r: Rect) => {
        updatePosition(index, r.x, r.y);
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
    };

    let handleMove = (e: React.PointerEvent) => {

        let bb = (e.target as any).getBoundingClientRect();
        let x = e.clientX - bb.left;
        let y = e.clientY - bb.top;
        // check distances -- with tolerance
        if (active) {

            let { offset } = rectangle;

            let newR = {
                ...rectangle,
                x: rectangle.x - (offset.x - x),
                y: rectangle.y - (offset.y - y)
            };

            let xWidth = newR.width as number;
            let yWidth = newR.height as number;

            if (!(newR.x < 0 || newR.y < 0 || newR.x > xh || newR.y > yh - yWidth / 2)) {
                //---------------Locking/Snap Mechanism---------------
                let thresholdX = (newR.width as number) / 7;
                let thresholdY = (newR.height as number) / 7;

                // newR.x = lockCoordinateCenter(newR.x + xWidth / 2 - xl, xh - xl) + xl;
                newR.x = lockCoordinateEdges(newR.x + xWidth / 2 - xl, xWidth, xh - xl) + xl;
                // newR.y = lockCoordinateCenter(newR.y + xWidth / 2 - yl, yh - yl) + yl;
                newR.y = lockCoordinateEdges(newR.y + yWidth / 2 - yl, yWidth, yh - yl) + yl;

                setRectangle(newR);
            }
        }
    };

    let handleUp = (e: React.PointerEvent) => {
        if (enabled) {
            let { offset } = rectangle;
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
    let stroke = active ? String("white") : String(COLORS.CARDBOARD);

    let textProps = {
        x: (rectangle.x as number) + (rectangle.width as number) / 2,
        y: (rectangle.y as number) + (rectangle.height as number) / 2,
        textAnchor: "middle",
        fontSize: "1.5em",
        fill: "white",
        pointerEvents: "none",
        //    transform: "rotate(90)"
    };

    return (
        <Fragment>
            <rect
                {...rectangle} fill={fill} stroke={stroke} {...actions}
            />
            {showName &&
                <text {...textProps}> {name} </text>}
        </Fragment>
    );
};

export enum PALLETCORNERS {
    TOP_LEFT = "TOP_LEFT",
    BOTTOM_LEFT = "BOTTOM_LEFT",
    BOTTOM_RIGHT = "BOTTOM_RIGHT"
};

export function IncreaseCorner(c: PALLETCORNERS) {
    if (c === PALLETCORNERS.TOP_LEFT) {
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
};

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
    showName?: boolean;
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


export function LayoutModel({ enableDrag, pallet, size, outerHeight, outerWidth, boxes, updateModelBox, fullWidth, fullHeight, corner, showName }: LayoutModelProps) {

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
    };

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
            let { position, box, rotated } = b;

            let x = w * position.x + topX + svg_props.x;
            let y = l * position.y + topY + svg_props.y;

            let scaleSize = b.size;

            let { width, length } = box.dimensions;

            width *= size * scale / norm;
            length *= size * scale / norm;

            let boxColor = String(COLORS.CLEAR_BOX);
            let strokeColor = String(COLORS.CARDBOARD);

            let boxprops: Rect = {
                x,
                y,
                width: rotated ? length : width,
                height: rotated ? width : length,
                fill: boxColor,
                stroke: strokeColor,
                strokeWidth: 1
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
        //        let grey = "rgb(135,135,135)"
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



    let snapParams = {
        xl: topX + svg_props.x,
        xh: topX + w + svg_props.x,
        yl: topY + svg_props.y,
        yh: topY + l + svg_props.y
    }

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
                        <DraggableRect index={index} rect={r} updatePosition={updateRectPosition} key={index} enabled={isDragEnabled} name={boxes![index].box.name} showName={showName} {...snapParams} />
                    );
                })}
            </svg>
            {corner && <circle {...cornerCircleProps} />}
            {corner && <text {...cornerTextProps}> {String(CornerNumber(corner) + 1)} </text>}
        </>
    );

};

interface LayoutCellProps {
    pallet: PalletGeometry;
    layout: LayoutObject;
    startEdit: () => void;
    editName: (e: ChangeEvent) => void;
};

function LayoutCell({ layout, pallet, startEdit, editName }: LayoutCellProps) {
    let { name, boxPositions } = layout;
    let { width, length } = getPalletDimensions(pallet)

    let size = 100;

    let model_props = {
        pallet,
        size,
        outerWidth: size,
        outerHeight: size,
        boxes: boxPositions
    } as LayoutModelProps;

    let round = (n: number) => {
        return Math.round(n * 10) / 10;
    };

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender" >
                    <LayoutModel {...model_props} />
                </div>
                <div className="Name">
                    <input type="text" value={name} onChange={editName} />
                </div>
                <div className="Dimensions">
                    <div className="DimensionsGrid2">
                        <div className="Dimension">
                            <span>
                                {"Width: " + String(round(width))}
                            </span>
                        </div>
                        <div className="Dimension">
                            <span>
                                {"Length: " + String(round(length))}
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

interface BoxCellProps {
    box: BoxObject;
    index: number
}

function BoxCell({ box, index }: BoxCellProps) {

    let [isRotated, setIsRotated] = useState<boolean>(false);

    let toggleRotate = () => {
        setIsRotated(!isRotated);
    };

    let dragStart = (ev: DragEvent) => {

        let transferData = {
            index,
            isRotated
        } as any;
        ev.dataTransfer.setData("BoxData", JSON.stringify(transferData));
        // setIsDragging(true);
    };

    let dragEnd = () => {
        // setIsDragging(false);
    };

    let { width, height, length } = box.dimensions;

    let renderDimensions: BoxDimensions = {
        height,
        length: isRotated ? width : length,
        width: isRotated ? length : width
    };

    return (
        <div className="BoxContainer">
            <div className="Box" draggable onDragStart={dragStart} onDragEnd={dragEnd}>
                <div className="MiniRender">
                    <Box {...renderDimensions} />
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
                <div className="Rotate" onClick={toggleRotate}>
                    <RotateIcon size={50} rotate={!isRotated} />
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
        name: "Custom Layer " + String(index),
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

    //    let index = 0;
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
        action: () => {
            if (summaryScreen) {
                handleBack()
            } else if (haveLayout) {
                setSummaryScreen(true);
            } else {
                handleBack();
            }
        }
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


    let editName = (palletIndex: number, layoutIndex: number) => (e: ChangeEvent) => {
        let newName = (e.target as any).value;
        let newPallets = [...allPallets];
        let newLayouts = [...allPallets[palletIndex].Layouts];
        newLayouts[layoutIndex].name = newName;
        newPallets[palletIndex].Layouts = newLayouts;
        setPallets(newPallets);
    };


    let RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
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

                    let newPallets: PalletGeometry[] = [...allPallets];

                    if (allPallets[currentPalletIndex].Layouts.length > currentLayoutIndex) {
                        newPallets[currentPalletIndex].Layouts[currentLayoutIndex] = newLayout;
                    } else {
                        newPallets[currentPalletIndex].Layouts.push(newLayout);
                    }

                    if (newPallets[currentPalletIndex].Stack.length === 0) {
                        newPallets[currentPalletIndex].Stack.push(0);
                    }
                    setEditingLayout(defaultLayout(layoutCount + 2));
                    setPallets(newPallets);
                    setSummaryScreen(true);
                }
            }
        },
        enabled: modelBoxes.length > 0 || summaryScreen
    };

    let startEdit = (palletIndex: number, layoutIndex: number) => () => {
        // Handle Setting Up the Boxes here.
        setCurrentPalletIndex(palletIndex);
        setCurrentLayoutIndex(layoutIndex);
        setModelBoxes(allPallets[palletIndex].Layouts[layoutIndex].boxPositions);
        setEditingLayout(allPallets[palletIndex].Layouts[layoutIndex]);
        setSummaryScreen(false);
    };

    let getTotalLayouts = () => {
        let count = 0;
        allPallets.forEach((p: PalletGeometry) => {
            count += p.Layouts.length;
        })
        return count;
    };

    let newLayout = () => {

        let lc = getTotalLayouts();

        setCurrentLayoutIndex(lc + 1);
        setCurrentPalletIndex(0);
        setModelBoxes([]);
        setEditingLayout(defaultLayout(lc + 1));
        setSummaryScreen(false);

    };


    let instruction: string;
    //  let placeholder = "Custom Layer " + String(1);

    let dragOver = (e: DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
    };

    let onDrop = (e: DragEvent<HTMLDivElement>) => {
        if (DisplayElement.current) {
            let modelData = getModelData(allPallets[currentPalletIndex], modelSize);
            let { clientX, clientY } = e;
            let { x, y } = DisplayElement.current.getBoundingClientRect();
            //let prX = clientX - x;
            // let prY = clientY - y;

            let transferData = e.dataTransfer.getData("BoxData");

            let tD = JSON.parse(transferData);
            let { index, isRotated } = tD;

            let px = clientX - x;
            let py = clientY - y;

            let [fracX, fracY] = getFractionalCoordinates(modelData, modelDims.outerWidth, modelDims.outerHeight, px, py);

            let bpo: BoxPositionObject = {
                position: {
                    x: fracX,
                    y: fracY
                },
                box: allBoxes[index],
                size: modelSize,
                rotated: isRotated
            };
            setModelBoxes([...modelBoxes, bpo]);
        }
    };

    let removeBox = () => {
        if (modelBoxes.length > 0) {
            let copy = [...modelBoxes];
            copy.pop();
            setModelBoxes([...copy]);
        }
    };

    let handlePalletSelect = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        setCurrentPalletIndex(val);
    };

    //---------------Display---------------
    if (summaryScreen) {
        instruction = "Create and edit layers";
        let AddButton: ButtonProps = {
            name: "Add new layer",
            action: newLayout
        };

        let contentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
            AddButton
        };
        let uniqueKey = 0;

        return (
            <ContentItem {...contentItemProps}>
                <div className="BoxSummary">
                    <div className="BoxScrollContainer">
                        <div className="BoxScroll">
                            {allPallets.map((p: PalletGeometry, index: number) => {
                                if (p.Layouts.length > 0) {
                                    return (
                                        <Fragment key={index}>
                                            {
                                                p.Layouts.map((l: LayoutObject, j: number) => {
                                                    return (<LayoutCell pallet={p} layout={l} key={uniqueKey++} editName={editName(index, j)} startEdit={startEdit(index, j)} />);
                                                })
                                            }
                                        </Fragment>
                                    );
                                }
                            })}
                        </div>
                    </div>
                </div >
            </ContentItem>
        );
    } else {
        instruction = "Drag and drop boxes to create a layer";

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
            enableDrag: true,
            showName: true
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
                                <div className="DeleteBox">
                                    {(modelBoxes.length > 0) &&
                                        <div className="DeleteBoxButton" onClick={removeBox}>
                                            <span>
                                                {"Remove box"}
                                            </span>
                                        </div>
                                    }
                                </div>
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