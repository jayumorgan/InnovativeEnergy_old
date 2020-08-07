export interface BoxDimensions {
    length: number;
    height: number;
    width: number;
};

export interface Coordinate {
    x: number;
    y: number;
    z: number
};

export interface PlaneDimensions {
    width: number;
    length: number;
};

function Area2D(c1: Coordinate, c2: Coordinate) {
    let x1 = c1.x;
    let y1 = c1.y;
    let x2 = c2.x;
    let y2 = c2.y;
    return Math.abs(x1 * y2 - x2 * y1);
}

export interface Coordinate2D {
    x: number;
    y: number;
};

export function Subtract3D(c1: Coordinate, c2: Coordinate) {
    return {
        x: c1.x - c2.x,
        y: c1.y - c2.y,
        z: c1.z - c2.z
    } as Coordinate;
}

export function MultiplyScalar(c1: Coordinate, alpha: number) {
    return {
        x: c1.x * alpha,
        y: c1.y * alpha,
        z: c1.z * alpha
    } as Coordinate;
}

export function Norm(c: Coordinate) {
    return Math.sqrt(c.x ** 2 + c.y ** 2 + c.z ** 2);
}

export function Add3D(c1: Coordinate, c2: Coordinate) {
    return Subtract3D(c1, MultiplyScalar(c2, -1));
}

function Subtract2D(c1: Coordinate, c2: Coordinate) {

    let x1 = c1.x;
    let y1 = c1.y;
    let x2 = c2.x;
    let y2 = c2.y;

    return {
        x: x1 - x2,
        y: y1 - y2
    } as Coordinate2D;
};

function Norm2D(v: Coordinate2D) {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
}

export interface BoxObject {
    name: string;
    dimensions: BoxDimensions;
    pickLocation: Coordinate;
};

export interface PalletGeometry {
    name: string;
    corner1: Coordinate;
    corner2: Coordinate;
    corner3: Coordinate;
    Layers: LayerObject[];
    Stack: number[];
};

export function getPalletDimensions(pallet: PalletGeometry) {
    let { name, corner1, corner2, corner3 } = pallet;
    let width_vector = Subtract2D(corner1, corner2);
    let length_vector = Subtract2D(corner3, corner2);
    let width = Norm2D(width_vector);
    let length = Norm2D(length_vector);
    let planar_dimensions = {
        width,
        length
    } as PlaneDimensions;
    return planar_dimensions;
};


export interface BoxPosition2D {
    position: Coordinate2D;
    box: BoxObject
};

export interface LayerObject {
    name: string;
    // pallet: PalletGeometry;
    boxPositions: BoxPosition2D[];
    height: number
};



export interface BoxCoordinates {
    pickLocation: Coordinate;
    dropLocation: Coordinate;
};

// And then finally, the stack will be a collection of layers incremented by box height. 
