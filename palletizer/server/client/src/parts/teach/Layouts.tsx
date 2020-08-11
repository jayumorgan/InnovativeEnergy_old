import React, { useRef, useState, DragEvent, ReactElement, ChangeEvent } from 'react';

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
    updateLayoutBoxes?: (c: BoxPosition2D[]) => void;
    boxes?: BoxPositionObject[];
    fullWidth?: number;
    fullHeight?: number;
    corner?: PALLETCORNERS;
    existingBoxes?: BoxPosition2D[];
};

export function LayoutModel({ pallet, size, outerHeight, outerWidth, boxes, updateLayoutBoxes, fullWidth, fullHeight, corner, existingBoxes }: LayoutModelProps) {

    let dimensions: PlaneDimensions = getPalletDimensions(pallet);

    let norm = Math.sqrt(dimensions.width ** 2 + dimensions.length ** 2);

    let w = dimensions.width / norm * size;
    let l = dimensions.length / norm * size;
    // Scale up the coordinates to take maximum size.
    let scale = (w >= l) ? size / w : size / l;
    w *= scale;
    l *= scale;
    let cx = size / 2;
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
        let fractionX = (x - palletX) / w;
        let fractionY = (y - palletY) / l;

        return [fractionX, fractionY];
    };

    let ExistingBoxSVGs: Rect[] = [];

    if (existingBoxes) {
        console.log("Existing Boxes", existingBoxes);
        existingBoxes.forEach((b: BoxPosition2D) => {

            let palletX = svg_props.x + topLog.x;
            let palletY = topLog.y;
            let x = w * b.position.x + palletX;
            let y = l * b.position.y + palletY;
            console.log("Pallet X ", palletX);
            console.log("Pallet Y", palletY);
            console.log("b.poisition", b.position);
            console.log(`w = ${w} l = ${l}`);
            console.log(`x = ${x} y = ${y} `);

            let { width, length } = b.box.dimensions;

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

            ExistingBoxSVGs.push(boxprops);
        });
    };

    let [goodBoxes, setGoodBoxes] = useState<BoxPosition2D[]>([]);

    let updateRectPosition = (index: number, nx: number, ny: number) => {
        if (boxes && updateLayoutBoxes) {
            let temp: BoxPosition2D[] = [];

            boxes.forEach((b: BoxPositionObject, i: number) => {
                let { position, box } = b;
                //let scaleSize = b.size;
                //let scaleRatio = size / scaleSize;

                let { x, y } = position;
                if (index === i) {
                    x = nx;
                    y = ny;
                }
                let [fractionX, fractionY] = calculatePositionFraction(x, y);
                let bp2d = {
                    box,
                    position: {
                        x: fractionX,
                        y: fractionY
                    }
                } as BoxPosition2D;

                temp.push(bp2d);
            });
            updateLayoutBoxes(temp);
        }
    };



    if (boxes) {
        boxes.forEach((b: BoxPositionObject) => {
            let { position, box } = b;
            let scaleSize = b.size;
            let scaleRatio = size / scaleSize;

            let { x, y } = position;
            let { width, length } = box.dimensions;

            width *= size * scale / norm;
            length *= size * scale / norm;

            let boxColor = String(COLORS.CLEAR_BOX);

            let boxprops: Rect = {
                x: x * scaleRatio - width / 2,
                y: y * scaleRatio - length / 2,
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
                {ExistingBoxSVGs.map((r: Rect, index: number) => {
                    return (
                        <rect {...r} key={index} />
                    );
                })}
                {BoxSVGs.map((r: Rect, index: number) => {
                    return (
                        <DraggableRect index={index} rect={r} updatePosition={updateRectPosition} key={index} />
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
        existingBoxes: layout.boxPositions
    } as LayoutModelProps;
    let boxCount = ` (${boxPositions.length} boxes)`;

    return (
        <div className="BoxCellContainer">
            <div className="BoxCell">
                <div className="MiniRender" >
                    <LayoutModel {...model_props} />
                </div>
                <div className="Name">
                    <input type="text" value={name} />
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
    startEdit: (index: number) => () => void;
    allPallets: PalletGeometry[]
}

// <NewLayoutCell startEdit={startEdit} />
function LayoutSummary({ startEdit, allPallets }: SummaryProps) {




    return (
        <div className="BoxSummary">
            <div className="BoxScrollContainer">
                <div className="BoxScroll">
                    {allPallets.map((p: PalletGeometry, index: number) => {
                        if (p.Layouts.length > 0) {
                            return (
                                <>
                                    {
                                        p.Layouts.map((l: LayoutObject, j: number) => {
                                            return (<LayoutCell pallet={p} layout={l} key={`${j}${index}`} startEdit={startEdit(index)} />);
                                        })
                                    }

                                </>
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


    // Get Rid Of Model Boxes, just use layout -- pretty annoying of course.
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

    let [summaryScreen, setSummaryScreen] = useState<boolean>(haveLayout);

    let DisplayElement = useRef<HTMLDivElement>(null);

    let [modelBoxes, setModelBoxes] = useState<BoxPositionObject[]>([]);

    let [editingLayout, setEditingLayout] = useState<LayoutObject>(defaultLayout(layoutCount + 1));

    let [tempBoxes, setTempBoxes] = useState<BoxPosition2D[]>([]);


    let LeftButton: ButtonProps = {
        name: "Back",
        action: handleBack
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
                if (tempBoxes.length > 0) {

                    let h = 0;
                    let goodBoxes: BoxPosition2D[] = [];

                    tempBoxes.forEach((b: BoxPosition2D) => {
                        let { x, y } = b.position;
                        console.log("Check that this is valid relative to the pallet");

                        if (x >= 0 && y >= 0) {
                            goodBoxes.push(b);
                            if (b.box.dimensions.height > h) {
                                h = b.box.dimensions.height;
                            }
                        }
                    });

                    let newLayout = {
                        ...editingLayout,
                        boxPositions: goodBoxes,
                        height: h
                    } as LayoutObject;

                    console.log("Good Boxes", goodBoxes);

                    let newPallets: PalletGeometry[] = [];

                    allPallets.forEach((p: PalletGeometry, i: number) => {
                        let t = { ...p };
                        if (i === currentPalletIndex) {
                            t.Layouts.push(newLayout);
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

    let startEdit = (index: number) => () => {
        // Handle Setting Up the Boxes here.
        setCurrentPalletIndex(index);
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

        let modelDims = {
            outerWidth: 835,
            outerHeight: 627
        };

        let contentItemProps = {
            instructionNumber,
            instruction,
            LeftButton,
            RightButton
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
                                        <BoxCell box={b} index={i} />
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
                                <LayoutModel pallet={allPallets[currentPalletIndex]} size={modelSize} {...modelDims} boxes={modelBoxes} updateLayoutBoxes={setTempBoxes} />
                            </div>
                        </div>
                    </div>
                </div>
            </ContentItem>
        );
    }
};


export default Layout;
