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

interface Coordinate2D {
    x: number;
    y: number;
};

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
    /* 
     *     constructor(name: string, dimensions: BoxDimensions, pick: Coordinate) {
     *         this.name = name;
     *         this.dimensions = dimensions;
     *         this.pickLocation = pick;
     *     }; */
}



export class PalletGeometry {
    name: string;
    corner1: Coordinate;
    corner2: Coordinate; // B
    corner3: Coordinate;

    constructor(name: string, c1: Coordinate, c2: Coordinate, c3: Coordinate) {
        this.name = name;
        this.corner1 = c1;
        this.corner2 = c2;
        this.corner3 = c3;
    }

    getDimensions(): PlaneDimensions { // return width and length;
        let width_vector = Subtract2D(this.corner1, this.corner2);
        let length_vector = Subtract2D(this.corner3, this.corner2);
        let width = Norm2D(width_vector);
        let length = Norm2D(length_vector);

        let planar_dimensions = {
            width,
            length
        } as PlaneDimensions;
        return planar_dimensions;
    }
}



