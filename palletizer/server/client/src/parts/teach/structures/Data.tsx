


export interface Coordinate {
    x: number;
    y: number;
    z: number
};


export interface PlaneDimensions {
    width: number;
    length: number;
};


export class PalletGeometry {
    corner1: Coordinate;
    corner2: Coordinate;
    corner3: Coordinate;

    constructor(c1: Coordinate, c2: Coordinate, c3: Coordinate) {
        this.corner1 = c1;
        this.corner2 = c2;
        this.corner3 = c3;
    }

    get getDimensions() { // return width and length;
        let planar_dimensions = {
            width: 10,
            length: 10
        } as PlaneDimensions;
        return planar_dimensions;
    }
}



