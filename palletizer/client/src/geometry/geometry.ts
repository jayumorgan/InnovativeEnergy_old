// Rename this file.

export interface PlaneDimensions {
    width: number;
    length: number;
};

export interface BoxDimensions extends PlaneDimensions {
    height: number;
};

export interface Coordinate2D {
    x: number;
    y: number;
};

export interface Coordinate extends Coordinate2D {
    z: number;
};

export interface CoordinateRot extends Coordinate {
    θ: number;
};

export function Subtract3D(c1: Coordinate, c2: Coordinate): Coordinate {
    return {
        x: c1.x - c2.x,
        y: c1.y - c2.y,
        z: c1.z - c2.z
    } as Coordinate;
}

export function MultiplyScalar(c1: Coordinate, alpha: number): Coordinate {
    return {
        x: c1.x * alpha,
        y: c1.y * alpha,
        z: c1.z * alpha
    } as Coordinate;
}

export function Norm(c: Coordinate): number {
    return Math.sqrt(c.x ** 2 + c.y ** 2 + c.z ** 2);
}

export function Add3D(c1: Coordinate, c2: Coordinate): Coordinate {
    return Subtract3D(c1, MultiplyScalar(c2, -1));
}

function Subtract2D(c1: Coordinate, c2: Coordinate): Coordinate2D {
    let x1 = c1.x;
    let y1 = c1.y;
    let x2 = c2.x;
    let y2 = c2.y;

    return {
        x: x1 - x2,
        y: y1 - y2
    } as Coordinate2D;
};

function Norm2D(v: Coordinate2D): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
}

export interface BoxObject {
    name: string;
    dimensions: BoxDimensions;
    pickLocation: CoordinateRot;
};

export interface PalletGeometry {
    name: string;
    corner1: Coordinate;
    corner2: Coordinate;
    corner3: Coordinate;
    Layouts: LayoutObject[];
    Stack: number[];
};

export function getPalletDimensions(pallet: PalletGeometry): PlaneDimensions {
    let { corner1, corner2, corner3 } = pallet;
    let length_vector = Subtract2D(corner1, corner2);
    let width_vector = Subtract2D(corner3, corner2);
    let width = Norm2D(width_vector);
    let length = Norm2D(length_vector);
    let planar_dimensions = {
        width,
        length
    } as PlaneDimensions;
    return planar_dimensions;
};


export function getCenterOfPallet(p: PalletGeometry): Coordinate {
    let { corner1, corner2, corner3 } = p;

    let v1 = Subtract3D(corner1, corner2);
    let v2 = Subtract3D(corner3, corner2);

    return Add3D(MultiplyScalar(v1, 0.5), MultiplyScalar(v2, 0.5));
};


export interface BoxPosition2D {
    position: Coordinate2D;
    box: BoxObject
};

export interface SVGPosition {
    x: number;
    y: number;
}

export interface BoxPositionObject {
    position: SVGPosition;
    box: BoxObject;
    size: number;
    rotated: boolean;
};

export interface LayoutObject {
    name: string;
    boxPositions: BoxPositionObject[];
    height: number
};

export interface BoxCoordinates {
    pickLocation: CoordinateRot;
    dropLocation: CoordinateRot;
    dimensions: BoxDimensions;
    palletIndex: number;
    stackIndex: number;
    linearPathDistance: number;
};

export interface Rect {
    x: number;
    y: number;
    width: string | number;
    height: string | number;
    fill: string;
    stroke: string;
    strokeWidth: number | string;
    offset?: any;
    transform?: string;
};
