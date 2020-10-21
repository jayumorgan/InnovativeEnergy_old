import React, { useRef, useState, DragEvent, ChangeEvent, Fragment } from 'react';
import ContentItem, { ButtonProps } from "./ContentItem";
import {
    ControlProps,
    COLORS,
    wrapChangeEventNumber,
    wrapChangeEventString
} from "../shared/shared";
import Box from "./3D/BoxRender";
import {
    PalletGeometry,
    getPalletDimensions,
    PlaneDimensions,
    BoxObject,
    LayoutObject,
    BoxPositionObject,
    Rect,
    BoxDimensions
} from "../../geometry/geometry";
import { RotateIcon } from "./PlusIcon";

//---------------Styles---------------
import "./css/Layouts.scss";

const DISABLE_LOCKING = false;

const round = (n: number): number => {
    return Math.round(n * 10) / 10;
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
    return { w, l, norm, scale, cx, topX, topY, size } as ModelData
};

function getFractionalCoordinates(modelData: ModelData, outerWidth: number, outerHeight: number, x: number, y: number): [number, number] {
    const { topX, topY, size, w, l } = modelData;
    const palletX = (outerWidth - size) / 2 + topX;
    const palletY = topY;
    const fractionX = (x - palletX) / w;
    const fractionY = (y - palletY) / l;
    return [fractionX, fractionY];
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
};

export function DecreaseCorner(c: PALLETCORNERS) {
    if (c === PALLETCORNERS.BOTTOM_LEFT) {
        return PALLETCORNERS.TOP_LEFT;
    } else if (c === PALLETCORNERS.BOTTOM_RIGHT) {
        return PALLETCORNERS.TOP_LEFT;
    } else {
        return PALLETCORNERS.TOP_LEFT;
    }
};

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


//-------Lock to pallet-------
// Pick your offset -- don't handle it here.
const lockCoordinateEdges = (currentPosition: number, dimensionSize: number, fullDistance: number): number => {
    const distanceUnit = fullDistance / (2 * 6);
    const thresholdDistance = distanceUnit / 3;
    const leftEdge = currentPosition - dimensionSize / 2;
    const rightEdge = currentPosition + dimensionSize / 2;

    if (leftEdge <= thresholdDistance) {
        return 0;
    }
    if (fullDistance - rightEdge <= thresholdDistance) {
        return fullDistance - dimensionSize;
    }
    return leftEdge;
};


const lockToNeighbor = (x: number, y: number, width: number, height: number, nb: Rect): [number, number] => {
    let rv: [number, number] = [x, y];

    const denom = 5;
    const x_tol = width / denom;
    const y_tol = height / denom;

    const nx_l = nb.x;
    const nx_r = nb.x + (+nb.width);
    const ny_l = nb.y;
    const ny_r = nb.y + (+nb.height);

    const x_l = x;
    const x_r = x + width;
    const y_l = y;
    const y_r = y + height;

    let xflag = false;
    let yflag = false;

    if (Math.abs(x_l - nx_l) < x_tol) { // left to left
        xflag = true;
        rv[0] = nx_l
    }

    if (!xflag && Math.abs(x_l - nx_r) < x_tol) { // left to right
        xflag = true;
        rv[0] = nx_r;
    }

    if (!xflag && Math.abs(x_r - nx_l) < x_tol) { // right to left
        xflag = true;
        rv[0] = nx_l - width;
    }

    const bug_y = 3.5

    if (Math.abs(y_l - ny_l) < y_tol) { // bottom to bottom
        yflag = true;
        rv[1] = ny_l - bug_y;
    }

    if (!yflag && Math.abs(y_l - ny_r) < y_tol) { // bottom to top
        yflag = true;
        rv[1] = ny_r - bug_y;
    }

    if (!yflag && Math.abs(y_r - ny_l) < y_tol) { // top to bottom
        yflag = true;
        rv[1] = ny_l - height - bug_y;
    }

    return rv;
};


interface DraggableRectProps {
    otherRects: Rect[];
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

function DraggableRect({ rect, updatePosition, index, enabled, name, showName, xl, xh, yl, yh, otherRects }: DraggableRectProps) {
    const [rectangle, setRectangle] = useState<Rect>(rect);
    const [active, setActive] = useState<boolean>(false);

    const setRectPosition = (r: Rect) => {
        updatePosition(index, r.x, r.y);
    };

    const handleDown = (e: React.PointerEvent) => {
        if (enabled) {
            const bb = (e.target as any).getBoundingClientRect();
            const x = e.clientX - bb.left;
            const y = e.clientY - bb.top;
            const offset = { x, y };
            setRectangle({
                ...rectangle,
                offset
            });
            setActive(true);
        }
    };

    const handleMove = (e: React.PointerEvent) => {
        let bb = (e.target as any).getBoundingClientRect();
        let x = e.clientX - bb.left;
        let y = e.clientY - bb.top;
        // check distances -- with tolerance
        if (active) {
            const { offset } = rectangle;
            const newR = {
                ...rectangle,
                x: rectangle.x - (offset.x - x),
                y: rectangle.y - (offset.y - y)
            };
            const xWidth = +(newR.width) as number;
            const yWidth = +(newR.height) as number;
            if (!DISABLE_LOCKING) {

                otherRects.forEach((nb: Rect) => {
                    const [xn, yn] = lockToNeighbor(newR.x, newR.y, xWidth, yWidth, nb);
                    newR.x = xn;
                    newR.y = yn;
                });

                newR.x = lockCoordinateEdges(newR.x + xWidth / 2 - xl, xWidth, xh - xl) + xl;
                newR.y = lockCoordinateEdges(newR.y + yWidth / 2 - yl, yWidth, yh - yl) + yl;
            }

            setRectangle(newR);
        }
    };

    const handleUp = (e: React.PointerEvent) => {
        if (enabled) {
            setRectPosition(rectangle);
            setActive(false);
        }
    };

    const actions = {
        onPointerDown: handleDown,
        onPointerMove: handleMove,
        onPointerUp: handleUp
    } as any;

    const fill = active ? String(COLORS.MOVE_BOX) : String(COLORS.CLEAR_BOX);
    const stroke = active ? String("white") : String(COLORS.CARDBOARD);

    const textProps = {
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

export function LayoutModel({ enableDrag, pallet, size, outerHeight, outerWidth, boxes, updateModelBox, fullWidth, fullHeight, corner, showName }: LayoutModelProps) {

    let isDragEnabled = enableDrag ? enableDrag : false;

    let modelData = getModelData(pallet, size);

    let { w, l, norm, scale, cx, topX, topY } = modelData;

    let logColor: string = String(COLORS.LOG);

    const bottomLog: Rect = {
        x: topX,
        y: size - (size - l) / 2 - size / 10,
        width: w,
        height: size / 10,
        fill: logColor,
        stroke: logColor,
        strokeWidth: 0
    };

    const topLog: Rect = {
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

    const updateRectPosition = (index: number, nx: number, ny: number) => {
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

    let BoxSVGs: Rect[] = [];
    if (boxes) {
        BoxSVGs = boxes.map((b: BoxPositionObject) => {
            let { position, box, rotated } = b;
            let x = w * position.x + topX + svg_props.x;
            let y = l * position.y + topY + svg_props.y;
            let { width, length } = box.dimensions;

            width *= size * scale / norm;
            length *= size * scale / norm;

            const boxColor = String(COLORS.CLEAR_BOX);
            const strokeColor = String(COLORS.CARDBOARD);

            const boxprops: Rect = {
                x,
                y,
                width: rotated ? length : width,
                height: rotated ? width : length,
                fill: boxColor,
                stroke: strokeColor,
                strokeWidth: 1
            };

            return boxprops;
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
        cornerCircleProps.r = 30;
        cornerCircleProps.fill = green;
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

    const snapParams = {
        xl: topX + svg_props.x,
        xh: topX + w + svg_props.x,
        yl: topY + svg_props.y,
        yh: topY + l + svg_props.y
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
                    let otherRects = [...BoxSVGs];
                    otherRects.splice(index, 1);

                    const dp: DraggableRectProps = {
                        index,
                        rect: r,
                        otherRects,
                        updatePosition: updateRectPosition,
                        enabled: isDragEnabled,
                        name: boxes![index].box.name,
                        showName,
                        ...snapParams
                    };
                    return (
                        <DraggableRect key={index} {...dp} />
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
    deleteLayout: () => void;
};

function LayoutCell({ layout, pallet, startEdit, editName, deleteLayout }: LayoutCellProps) {
    let { name, boxPositions } = layout;
    let { width, length } = getPalletDimensions(pallet)

    let size = 100;

    const model_props = {
        pallet,
        size,
        outerWidth: size,
        outerHeight: size,
        boxes: boxPositions
    } as LayoutModelProps;


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
            <div className="Trash" onClick={deleteLayout}>
                <span className="icon-delete">
                </span>
            </div>
        </div>
    );
};

interface BoxCellProps {
    box: BoxObject;
    index: number
}

function BoxCell({ box, index }: BoxCellProps) {
    const [isRotated, setIsRotated] = useState<boolean>(false);

    const toggleRotate = () => {
        setIsRotated(!isRotated);
    };

    const dragStart = (ev: DragEvent) => {

        let transferData = {
            index,
            isRotated
        } as any;
        ev.dataTransfer.setData("BoxData", JSON.stringify(transferData));
        // setIsDragging(true);
    };

    const dragEnd = () => {
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



function calulateEfficientRotation(width: number, length: number, boxWidth: number, boxLength: number): boolean {
    const not_rotated_columns: number = Math.floor(width / boxWidth);
    const not_rotated_rows: number = Math.floor(length / boxLength);
    const rotated_columns: number = Math.floor(length / boxWidth);
    const rotated_rows: number = Math.floor(width / boxLength);

    const not_rotated_total: number = not_rotated_columns * not_rotated_rows;
    const rotated_total: number = rotated_columns * rotated_rows;

    return rotated_total > not_rotated_total;
};

function generateAutoLayout(box: BoxObject, pallet: PalletGeometry, size: number, boxIndex: number): BoxPositionObject[] {
    const palletDims = getPalletDimensions(pallet);
    let boxWidth = box.dimensions.width;
    let boxLength = box.dimensions.length;

    const rotated: boolean = calulateEfficientRotation(palletDims.width, palletDims.length, box.dimensions.width, box.dimensions.length);

    if (rotated) {
        const temp = boxWidth;
        boxWidth = boxLength;
        boxLength = temp;
    }

    const normWidth: number = palletDims.width;
    const normLength: number = palletDims.length;

    const width: number = palletDims.width / normWidth;
    const length: number = palletDims.length / normLength;

    boxWidth /= normWidth;
    boxLength /= normLength;

    const total_columns: number = Math.floor(width / boxWidth);
    const total_rows: number = Math.floor(length / boxLength);

    let i: number = 0;

    let positions: BoxPositionObject[] = [];

    while (i < total_columns) {
        let j: number = 0;
        while (j < total_rows) {
            const bpo: BoxPositionObject = {
                size,
                position: {
                    x: i * boxWidth,
                    y: j * boxLength
                },
                rotated,
                box,
                index: boxIndex
            };
            positions.push(bpo);
            j++;
        }
        i++;
    }
    return positions;
};

interface AutoLayoutProps {
    allBoxes: BoxObject[];
    allPallets: PalletGeometry[];
    modelSize: number;
    name: string;
    updateLayout: (l: LayoutObject, palletIndex: number) => void;
};

function AutoLayout({ allBoxes, allPallets, modelSize, name, updateLayout }: AutoLayoutProps) {

    const [palletIndex, setPalletIndex] = useState<number>(0);
    const [boxIndex, setBoxIndex] = useState<number>(0);

    const handlePallet = wrapChangeEventNumber((n: number) => {
        setPalletIndex(n);
    });

    const handleBox = wrapChangeEventNumber((n: number) => {
        setBoxIndex(n);
    });

    const handleGenerate = () => {
        const pallet = allPallets[palletIndex];
        const box = allBoxes[boxIndex];
        const boxPositions: BoxPositionObject[] = generateAutoLayout(box, pallet, modelSize, boxIndex);
        const layout_name: string = name.replace(/^Custom Layer/gmi, "Auto Layer");
        const layout: LayoutObject = {
            name: layout_name,
            height: box.dimensions.height,
            boxPositions
        };
        updateLayout(layout, palletIndex);
    };

    return (
        <div className="AutoLayout">
            <div className="ParamSelect">
                <div className="ParamCell">
                    <div className="Title">
                        <span>
                            {"Pallet: "}
                        </span>
                    </div>
                    <div className="DropDown">
                        <select value={palletIndex} onChange={handlePallet}>
                            {allPallets.map((p: PalletGeometry, i: number) => {
                                return (
                                    <option key={i} value={i}>
                                        {p.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </div>
            <div className="ParamSelect">
                <div className="ParamCell">
                    <div className="Title">
                        <span>
                            {"Box: "}
                        </span>
                    </div>
                    <div className="DropDown">
                        <select value={boxIndex} onChange={handleBox} >
                            {allBoxes.map((b: BoxObject, i: number) => {
                                return (
                                    <option key={i} value={i}>
                                        {b.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </div>
            <div className="GenerateButton">
                <div className="Button" onClick={handleGenerate}>
                    <span>
                        {"Generate Layout"}
                    </span>
                </div>
            </div>
        </div>
    );
};



interface LayoutProps extends ControlProps {
    allBoxes: BoxObject[];
    allPallets: PalletGeometry[];
    setPallets: (pallets: PalletGeometry[]) => void;
};

function defaultLayout(index: number) {
    let l: LayoutObject = {
        name: "Custom Layer " + String(index),
        boxPositions: [],
        height: 0,
    };
    return l;
};

export default function Layout({ instructionNumber, allBoxes, allPallets, setPallets, handleNext, handleBack }: LayoutProps) {

    const modelSize = 620;

    const modelDims = {
        outerWidth: 835,
        outerHeight: 627
    };

    let haveLayout = false;
    let layoutCount = 0;

    allPallets.forEach((p: PalletGeometry, _: number) => {
        if (p.Layouts.length > 0) {
            layoutCount += 1;
            haveLayout = true;
        }
    });

    const [currentPalletIndex, setCurrentPalletIndex] = useState<number>(0);
    const [currentLayoutIndex, setCurrentLayoutIndex] = useState<number>(0);
    const [summaryScreen, setSummaryScreen] = useState<boolean>(haveLayout);
    const [autoLayout, setAutoLayout] = useState<boolean>(false);

    let DisplayElement = useRef<HTMLDivElement>(null);

    const [modelBoxes, setModelBoxes] = useState<BoxPositionObject[]>([]);
    const [editingLayout, setEditingLayout] = useState<LayoutObject>(defaultLayout(layoutCount + 1));

    const LeftButton: ButtonProps = {
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

    const updateModelBox = (bpo: BoxPositionObject, index: number) => {
        let newModels: BoxPositionObject[] = [...modelBoxes];
        newModels[index] = bpo;
        setModelBoxes(newModels);
    };

    const handleName = wrapChangeEventString((name: string) => {
        setEditingLayout({ ...editingLayout, name });
    });

    const editName = (palletIndex: number, layoutIndex: number) => (e: ChangeEvent) => {
        let newName: string = (e.target as any).value;
        let newPallets = [...allPallets];
        let newLayouts = [...allPallets[palletIndex].Layouts];
        newLayouts[layoutIndex].name = newName;
        newPallets[palletIndex].Layouts = newLayouts;
        setPallets(newPallets);
    };

    const RightButton: ButtonProps = {
        name: summaryScreen ? "Next" : "Done",
        action: () => {
            if (summaryScreen) {
                handleNext()
            } else {
                if (modelBoxes.length > 0) {
                    let h = 0;
                    let goodBoxes: BoxPositionObject[] = [];
                    modelBoxes.forEach((bpo: BoxPositionObject, _: number) => {
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
                    setAutoLayout(false);
                }
            }
        },
        enabled: modelBoxes.length > 0 || summaryScreen
    };

    const startEdit = (palletIndex: number, layoutIndex: number) => () => {
        // Handle Setting Up the Boxes here.
        setCurrentPalletIndex(palletIndex);
        setCurrentLayoutIndex(layoutIndex);
        setModelBoxes(allPallets[palletIndex].Layouts[layoutIndex].boxPositions);
        setEditingLayout(allPallets[palletIndex].Layouts[layoutIndex]);
        setSummaryScreen(false);
    };

    const getTotalLayouts = () => {
        let count = 0;
        allPallets.forEach((p: PalletGeometry) => {
            count += p.Layouts.length;
        })
        return count;
    };

    const newLayout = () => {
        let lc = getTotalLayouts();
        setCurrentLayoutIndex(lc + 1);
        setCurrentPalletIndex(0);
        setModelBoxes([]);
        setEditingLayout(defaultLayout(lc + 1));
        setSummaryScreen(false);
    };

    let instruction: string;

    const dragOver = (e: DragEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
    };

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        if (DisplayElement.current) {
            let modelData = getModelData(allPallets[currentPalletIndex], modelSize);
            let { clientX, clientY } = e;
            let { x, y } = DisplayElement.current.getBoundingClientRect();

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
                rotated: isRotated,
                index // The box index.
            };
            setModelBoxes([...modelBoxes, bpo]);
        }
    };

    const removeBox = () => {
        if (modelBoxes.length > 0) {
            let copy = [...modelBoxes];
            copy.pop();
            setModelBoxes([...copy]);
        }
    };

    const handlePalletSelect = (e: ChangeEvent) => {
        let val: number = +(e.target as any).value;
        setCurrentPalletIndex(val);
    };

    //---------------Display---------------
    if (summaryScreen) {
        instruction = "Create and edit layers";
        const AddButton: ButtonProps = {
            name: "Add new layer",
            action: newLayout
        };

        const contentItemProps = {
            instruction,
            instructionNumber,
            LeftButton,
            RightButton,
            AddButton
        };

        const removeLayer = (palletIndex: number, layoutIndex: number) => () => {
            let newPallets = [...allPallets];
            let newLayouts = [...allPallets[palletIndex].Layouts];
            newLayouts.splice(layoutIndex, 1);
            newPallets[palletIndex].Layouts = newLayouts;
            // Shift layout indices.
            newPallets[palletIndex].Stack = newPallets[palletIndex].Stack.filter((li: number) => {
                return li !== layoutIndex;
            }).map((li: number) => {
                if (li > layoutIndex) {
                    return --li;
                }
                return li;
            });
            setPallets(newPallets);
        };

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
                                                    const layoutProps: LayoutCellProps = {
                                                        pallet: p,
                                                        layout: l,
                                                        editName: editName(index, j),
                                                        startEdit: startEdit(index, j),
                                                        deleteLayout: removeLayer(index, j)
                                                    };
                                                    return (<LayoutCell key={String(index) + String(j)} {...layoutProps} />);
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

        const contentItemProps = {
            instructionNumber,
            instruction,
            LeftButton,
            RightButton
        } as any;

        const layoutModelProps = {
            outerWidth: modelDims.outerWidth,
            outerHeight: modelDims.outerHeight,
            boxes: modelBoxes,
            updateModelBox: updateModelBox,
            pallet: allPallets[currentPalletIndex],
            size: modelSize,
            enableDrag: true,
            showName: true
        } as any;

        const handleAutoLayout = () => {
            setAutoLayout(!autoLayout);
        };

        const updateLayout = (l: LayoutObject, pi: number) => {
            setCurrentPalletIndex(pi);
            setEditingLayout(l);
            setModelBoxes(l.boxPositions);
            setAutoLayout(false);
        };

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
                                <div className="LayoutButtons">
                                    <div className="AutoLayoutButton">
                                        <div className="AutoButton" onClick={handleAutoLayout}>
                                            <span>
                                                {autoLayout ? "Custom Layer" : "Auto Layer"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="DeleteBox">
                                        {(modelBoxes.length > 0) &&
                                            <div className="DeleteBoxButton" onClick={removeBox}>
                                                <span>
                                                    {"Remove box"}
                                                </span>
                                            </div>
                                        }
                                    </div>
                                </div>
                                <div className="PalletDropDown">
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
                            </div>
                            {autoLayout ?
                                <AutoLayout allBoxes={allBoxes} allPallets={allPallets} modelSize={modelSize} updateLayout={updateLayout} name={editingLayout.name} />
                                :
                                <div className="Pallet" ref={DisplayElement} onDragOver={dragOver} onDrop={onDrop}>
                                    <LayoutModel {...layoutModelProps} />
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};


