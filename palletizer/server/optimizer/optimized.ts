import fs from "fs";

import { initDatabaseHandler, DatabaseHandler } from "../database/db";

// In: (pallet_config) -> Out: (list of coordinates, raise location, etc.

import {
    BoxCoordinate,
    Coordinate,
    PalletConfiguration,
    PlaneCoordinate,
    CartesianCoordinate,
    PalletGeometry,
    SavedMachineConfiguration,
    SavedPalletConfiguration
} from "../engine/config";
import { addActionForCoordinate } from "./standard";

export function main() {
    console.log("Running file");
}


//---------------Types---------------
export enum ActionTypes {
    NONE,
    PICK,
    DROP
};

export interface ActionCoordinate extends Coordinate {
    action?: ActionTypes;
};

export type BoxPath = ActionCoordinate[];

export type Segment = [Coordinate, Coordinate];

interface XYCircle extends CartesianCoordinate {
    radius: number;
};

//---------------Functions---------------

//-------Algebra-------
function Subtract3D(c1: CartesianCoordinate, c2: CartesianCoordinate): CartesianCoordinate {
    return {
        x: c1.x - c2.x,
        y: c1.y - c2.y,
        z: c1.z - c2.z
    } as CartesianCoordinate;
}

function MultiplyScalar(c1: CartesianCoordinate, alpha: number): CartesianCoordinate {
    return {
        x: c1.x * alpha,
        y: c1.y * alpha,
        z: c1.z * alpha
    } as CartesianCoordinate;
};

function Add3D(c1: CartesianCoordinate, c2: CartesianCoordinate): CartesianCoordinate {
    return Subtract3D(c1, MultiplyScalar(c2, -1));
};

function Norm(c: CartesianCoordinate): number {
    const { x, y, z } = c;
    return variableNorm(x, y, z);
};

function Norm2D(c1: PlaneCoordinate): number {
    return variableNorm(c1.x, c1.y);
};

function DotProduct(x: CartesianCoordinate, y: CartesianCoordinate): number {
    return x.x * y.x + x.y * y.y + x.z * y.z;
};

function variableNorm(...args: number[]): number {
    let squares: number = 0;
    args.forEach((a: number) => {
        squares += a ** 2;
    });
    return Math.sqrt(squares);
};

// line is l = (b-a)t + a, point is x. -- assuming 2d.

function pointLineDistance2D(a: CartesianCoordinate, b: CartesianCoordinate, x: CartesianCoordinate): number {
    const a_minus_x = Subtract3D(a, x);
    const b_minus_a = Subtract3D(b, a);
    const squared_norm = DotProduct(b_minus_a, b_minus_a);
    const dot_ax_ba = DotProduct(a_minus_x, b_minus_a);
    const t_min: number = -1 * dot_ax_ba / squared_norm;
    // Now compute the distance.
    let point = Add3D(MultiplyScalar(Subtract3D(b, a), t_min), a);
    let diff = Subtract3D(point, x);
    let norm: number = Norm2D(diff);
    return norm;
};

//-------Constraints-------
function getPalletXYCircle(pallet: PalletGeometry): XYCircle {
    const { corner1, corner2, corner3 } = pallet;

    let Xdirection: CartesianCoordinate = Subtract3D(corner3, corner2);
    let Ydirection: CartesianCoordinate = Subtract3D(corner1, corner2);

    // Note: home = 0 is the very top, so max_z is minimum value of the coordinates.
    let max_z: number = Math.min(corner1.z, corner2.z, corner3.z);

    let x_width: number = Norm(Xdirection);
    let y_width: number = Norm(Ydirection);

    let center: CartesianCoordinate = Add3D(corner2, Add3D(MultiplyScalar(Xdirection, 1 / 2), MultiplyScalar(Ydirection, 1 / 2)));
    center.z = max_z;

    // diagonal / 2;
    let radius: number = variableNorm(x_width, y_width) / 2;

    return {
        ...center,
        radius
    } as XYCircle;
};

function getBoxBottomXYCircle(box: BoxCoordinate, positionCoordinate?: Coordinate): XYCircle { // at start of path.
    const { dimensions, pickLocation } = box;
    const { width, length, height } = dimensions;

    const basePosition: Coordinate = positionCoordinate ? positionCoordinate : pickLocation;

    let radius: number = variableNorm(width, length) / 2;
    let center = Add3D(basePosition, { x: 0, y: 0, z: height }); // add because 0 = z_home;

    return {
        ...center,
        radius
    } as XYCircle;
};

function getBoxTopXYCircle(box: BoxCoordinate): XYCircle {
    let { x, y, z, radius } = getBoxBottomXYCircle(box, box.dropLocation);

    z -= box.dimensions.height;  // minus because 0=z_home.
    return {
        radius,
        x,
        y,
        z
    } as XYCircle;
};

function getErrorRadius(r1: number, r2: number): number {
    // 10% error.
    return (r1 + r2) * 1.10;
}


function computeNearestEdge(point: CartesianCoordinate, constraint: XYCircle, box_radius: number): CartesianCoordinate | null {
    const r: number = box_radius + constraint.radius;

    let direction_2d: any = { x: constraint.x - point.x, y: constraint.y - point.y };
    let direction_2d_norm: number = variableNorm(direction_2d.x, direction_2d.y);

    if (direction_2d_norm <= r) {
        return null;
    }

    let shrink_factor: number = (1 - r / direction_2d_norm);
    direction_2d.x *= shrink_factor;
    direction_2d.y *= shrink_factor;
    let nearest_edge: CartesianCoordinate = { ...direction_2d, z: constraint.z - point.z };
    nearest_edge = Add3D(nearest_edge, point);
    return nearest_edge;
}


// find the effective radius -- along the direction path
function DotProduct2D(a: CartesianCoordinate, b: CartesianCoordinate): number {
    return a.x * b.x + a.y * b.y;
};

function quadratic(a: number, b: number, c: number, positive: boolean): number {
    let first: number = - b;
    let second: number = (b ** 2 - 4 * a * c) ** (1 / 2);
    let result = first;
    result += (positive ? second : -1 * second);
    return result / (2 * a);
};


function computeEffectiveConstraint(x: CartesianCoordinate, y: CartesianCoordinate, constraint: XYCircle, box_radius: number): XYCircle | null {

    let min_z: number = Math.max(x.z, y.z);

    if (min_z <= constraint.z) { // it is irrelevant.
        return null;
    }

    let a: number = DotProduct2D(Subtract3D(y, x), Subtract3D(y, x));
    let b: number = 2 * DotProduct2D(Subtract3D(y, x), Subtract3D(x, constraint));
    let c: number = DotProduct2D(Subtract3D(x, constraint), Subtract3D(x, constraint)) - (box_radius + constraint.radius) ** 2;

    if (a === 0) {
        return null; // no line.
    }

    let second: number = (b ** 2 - 4 * a * c);
    if (second <= 0) { // does no intersect, or intersects at a point.
        return null;
    }

    let t_0: number = quadratic(a, b, c, true);
    let t_1: number = quadratic(a, b, c, false);

    let compute_point = (t: number) => {
        return Add3D(MultiplyScalar(Subtract3D(y, x), t), x);
    }

    let l_0 = compute_point(t_0);
    let l_1 = compute_point(t_1);

    let distance = Subtract3D(l_1, l_0);
    let mid = Add3D(l_0, MultiplyScalar(distance, 1 / 2));
    let effective_radius: number = (1 / 2) * DotProduct2D(distance, distance) ** (1 / 2);
    let effective_center = {
        x: mid.x,
        y: mid.y,
        z: constraint.z,
        radius: effective_radius
    } as XYCircle;

    return effective_center;
};





//--------------- New Computations---------------

interface Internals {
    shift: CartesianCoordinate;
    absolute: CartesianCoordinate;
    base: CartesianCoordinate;
    other: CartesianCoordinate;
};


function computeInternals(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number): Internals | null {
    let effective_constraint: XYCircle | null = computeEffectiveConstraint(a, b, c, 0); // get constraint along the path (2-D)

    if (effective_constraint === null) {
        console.log("effective is null");
        return null;
    }

    let Δ_z: number = (b.z - a.z) * -1; // negative because coordinates start at top.
    let nearest: CartesianCoordinate | null;
    let base: CartesianCoordinate;
    let other: CartesianCoordinate;


    if (Δ_z === 0) {
        return null;
    } else if (Δ_z < 0) {
        nearest = computeNearestEdge(b, effective_constraint, box_radius);
        base = b;
        other = a;
    } else {
        nearest = computeNearestEdge(a, effective_constraint, box_radius);
        base = a;
        other = b;
    }

    if (nearest === null) { // Ignore, not really in path.
        console.log("nearest is null")
        return null;
    }

    let Δ: CartesianCoordinate = Subtract3D(nearest, base);
    let Δ_c: CartesianCoordinate = Subtract3D(effective_constraint, base);

    let α: number;

    if (Δ.x === 0) {
        if (Δ.y === 0) {
            return null;
        }
        α = Δ_c.y / Δ.y;
    } else {
        α = Δ_c.x / Δ.x;
    }

    let shift: CartesianCoordinate = MultiplyScalar(Δ, α);
    let absolute: CartesianCoordinate = Add3D(base, shift);

    return {
        shift,
        absolute,
        base,
        other
    } as Internals;
};





function computeRaiseCoordinate(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number): CartesianCoordinate | null {
    let internals: Internals | null = computeInternals(a, b, c, box_radius);

    if (internals === null) {
        return null;
    }

    let { absolute, base, other } = internals;

    let Δ: CartesianCoordinate = Subtract3D(absolute, base);
    let target: CartesianCoordinate = Subtract3D(other, base);
    let α: number;

    if (Δ.x === 0) {
        if (Δ.y === 0) {
            return null;
        }
        α = target.y / Δ.y;
    } else {
        α = target.x / Δ.x;
    }

    let shift: CartesianCoordinate = MultiplyScalar(Δ, α);
    let up: CartesianCoordinate = Add3D(base, shift);
    if (up.z < 0) {
        return null;
    }
    return up;
};


function computeTriangleCoordinate(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number): CartesianCoordinate | null {
    let internals: Internals | null = computeInternals(a, b, c, box_radius);

    if (internals === null) {
        return null;
    }

    return internals.absolute;
};



function computeSquarePath(a: CartesianCoordinate, b: CartesianCoordinate): CartesianCoordinate[] {
    let path: CartesianCoordinate[] = [];

    path.push(a);
    path.push({ ...a, z: 0 });
    path.push({ ...b, z: 0 });
    path.push(b);

    return path;
};


function computePathArray(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number, allow_up: boolean): CartesianCoordinate[] { // allow up for first coordinate;
    if (allow_up) {
        let up: CartesianCoordinate | null = computeRaiseCoordinate(a, b, c, box_radius);

        if (up !== null) {
            return [up, b];
        }
    }

    let triangle: CartesianCoordinate | null = computeTriangleCoordinate(a, b, c, box_radius);

    if (triangle !== null) { // check for less than zero.
        return [a, triangle, b];
    }
    console.log("computing square path");
    console.log("for", a, b);
    console.log("constraint", c);

    return computeSquarePath(a, b); // highly undesireable.
};


function moveZ(c: CartesianCoordinate, h: number): CartesianCoordinate {

    return {
        ...c,
        z: c.z + h
    };
}


function computePathForBox(box: BoxCoordinate, input_constraints: XYCircle[]): CartesianCoordinate[] {
    let constraints: XYCircle[] = [...input_constraints];

    const self_constraint: XYCircle = getBoxBottomXYCircle(box);
    let points: CartesianCoordinate[] = [];

    // initialize points.
    points.push(moveZ(box.pickLocation, box.dimensions.height));
    points.push(moveZ(box.dropLocation, box.dimensions.height + (-1.1) * box.dimensions.height));
    points.push(moveZ(box.dropLocation, box.dimensions.height));

    constraints.unshift(self_constraint);

    let box_radius: number = self_constraint.radius;

    for (let i = 0; i < constraints.length; i++) {

        let c: XYCircle = constraints[i];
        let j: number = 0;
        while (j < points.length - 1) { // don't adjust last coordinate;

            let [a, b]: [CartesianCoordinate, CartesianCoordinate] = [points[j], points[j + 1]];
            let effective_constraint = computeEffectiveConstraint(a, b, c, box_radius); // get constraint along the path (2-D)

            if (effective_constraint !== null) {
                let arr: CartesianCoordinate[] = computePathArray(a, b, effective_constraint, box_radius, j !== 0);
                points.splice(j, 2, ...arr);
                j += arr.length - 1;
                continue;
            }
            j += 1;
        }
    }

    points = points.map((c: CartesianCoordinate) => {
        // move Z, add actions.
        return moveZ(c, -box.dimensions.height);
    });

    return points;

}

function optimizePaths(pallet_config: SavedPalletConfiguration): CartesianCoordinate[][] {

    const { boxCoordinates, config } = pallet_config;
    const { pallets } = config;

    let stack_indices: number[] = [];

    // Initialize contrain circles for pallets;
    let constraints: XYCircle[] = pallets.map((p: PalletGeometry) => {
        stack_indices.push(0); // init stack index to zero.
        return getPalletXYCircle(p);
    });

    let paths: CartesianCoordinate[][] = [];

    let return_paths: CartesianCoordinate[][] = [];

    while (true) {
        let consideration_boxes: BoxCoordinate[] = boxCoordinates.filter((coord: BoxCoordinate) => {
            return (coord.stackIndex === stack_indices[coord.palletIndex]);
        }).map((coord: BoxCoordinate) => {
            return coord;
        }).sort((a: BoxCoordinate, b: BoxCoordinate) => {
            return b.linearPathDistance - a.linearPathDistance;
        });

        if (consideration_boxes.length === 0) {
            break;
        }

        constraints.sort((a: XYCircle, b: XYCircle) => {
            return (b.z - a.z) * -1; // * -1 because 0 is top.
        });

        for (let i = 0; i < Math.min(consideration_boxes.length, 20); i++) {
            let box: BoxCoordinate = consideration_boxes[i];

            if (i > 0 && false) {
                let return_box: BoxCoordinate = { ...consideration_boxes[i] };
                return_box.pickLocation = { ...box.dropLocation };
                return_box.dropLocation = { ...box.pickLocation };
                return_box.dimensions.height = 0;
                let return_path: CartesianCoordinate[] = computePathForBox(return_box, constraints);
                return_paths.push(return_path);
            }

            let path: CartesianCoordinate[] = computePathForBox(box, constraints);

            paths.push(path);
            let new_constraint = getBoxTopXYCircle(box);
            constraints.push(new_constraint);
        }
        stack_indices = stack_indices.map((val: number) => {
            return (val + 1);
        });
    }

    console.log(paths);

    //    console.log("return", return_paths);
    return paths;
};




//---------------TESTS---------------


function generateVector(x: number, y: number, z: number): Coordinate {
    return {
        x,
        y,
        z,
        θ: 0
    }
}


function generateConstraint(x: number, y: number, z: number, r: number): XYCircle {
    let c = generateVector(x, y, z);
    let cons: XYCircle = {
        ...c,
        radius: r
    };
    return cons;
};


function testArc() {
    let a = generateVector(0, 0, 0);
    let b = generateVector(5, 0, 0);
    let cons = generateConstraint(2, 0, 0, 1);

    let effect = computeEffectiveConstraint(a, b, cons, 0);
    console.log(effect);
};




function testConstraint() {
    let cons = generateConstraint(0, 0, 1600, 700);
    let a = generateVector(0, 0, 1600);
    let b = generateVector(2750, 2500, 890);

    let eff = computeEffectiveConstraint(a, b, cons, 0);
    console.log("effective", eff);

    let near = computeNearestEdge(b, cons, 0);
    console.log(near, "near");

    let safe = computeTriangleCoordinate(a, b, cons, 0);
    console.log(safe, "safe");
}



function generatePlottableCoordinates(paths: CartesianCoordinate[][], i: number) {
    let coords: PlaneCoordinate[][] = [];
    paths.forEach((path: CartesianCoordinate[]) => {
        let p: PlaneCoordinate[] = [];
        path.forEach((c: CartesianCoordinate) => {
            let x = variableNorm(c.x, c.y);
            let y = c.z * -1;
            p.push({ x, y } as PlaneCoordinate);
        });
        coords.push(p);
    });
    fs.writeFileSync(String(i) + "data3d.json", JSON.stringify(paths, null, "\t"));
};

function test() {
    initDatabaseHandler().then((handler: DatabaseHandler) => {

        let generator = (i: number) => {
            handler.getPalletConfig(i).then((config: any) => {
                let spc: SavedPalletConfiguration = JSON.parse(config.raw_json);
                let p = optimizePaths(spc);
                generatePlottableCoordinates(p, i);
            });
        }

        [2].forEach((i: number) => {
            generator(i);
        });
    });
};



function run_test() {
    //    testArc();
    //testConstraint();
    test();
}
run_test();
