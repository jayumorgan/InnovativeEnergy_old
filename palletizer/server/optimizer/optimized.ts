import fs from "fs";
import filePath from "path";
// Reduce the number of loops in this.

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
import { addActionToCoordinate, raiseOverCoordinate } from "./standard";



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

function attachAngle(x: CartesianCoordinate, θ: number): Coordinate {
    return {
        ...x,
        θ
    };
}

function cartesianCoordinate(x: number, y: number, z: number): CartesianCoordinate {
    return {
        x,
        y,
        z
    };
}


function quadratic(a: number, b: number, c: number, positive_root: boolean): number {
    let first: number = - b;
    let second: number = (b ** 2 - 4 * a * c) ** (1 / 2);
    let result = first;
    result += (positive_root ? second : -1 * second);
    return result / (2 * a);
};

function vectorRound(x: CartesianCoordinate): CartesianCoordinate {
    return {
        x: Math.round(x.x),
        y: Math.round(x.y),
        z: Math.round(x.z)
    };
}

function vectorEquals(x: CartesianCoordinate, y: CartesianCoordinate, tolerance: number): boolean {
    let dx = Math.abs(x.x - y.x);
    if (dx >= tolerance) {
        return false;
    }
    let dy = Math.abs(x.y - y.y);
    if (dy >= tolerance) {
        return false;
    }

    let dz = Math.abs(x.z - y.z);
    if (dz >= tolerance) {
        return false;
    }

    return true;
};

function moveZ(c: CartesianCoordinate, h: number): CartesianCoordinate {
    return {
        ...c,
        z: c.z + h
    };
};

function Subtract3D(c1: CartesianCoordinate, c2: CartesianCoordinate): CartesianCoordinate {
    return {
        x: c1.x - c2.x,
        y: c1.y - c2.y,
        z: c1.z - c2.z
    } as CartesianCoordinate;
};

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

function Norm2D(c1: PlaneCoordinate): number { // norm of x-y components.
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

// Use for all segments.
class Line {
    a: CartesianCoordinate;
    b: CartesianCoordinate;


    constructor(a: CartesianCoordinate, b: CartesianCoordinate) {
        this.a = a;
        this.b = b;
    }

    Delta(): CartesianCoordinate { // b - a
        return Subtract3D(this.b, this.a);
    }

    valueAtTime(t: number): CartesianCoordinate {
        return Add3D(MultiplyScalar(this.Delta(), t), this.a);
    }

    zIntersectionTime(z_val: number): number | null { // point at which the line crosses the z axis.
        let delta: CartesianCoordinate = this.Delta();

        if (delta.z === 0) {
            return null;
        }
        // solve time.
        return (z_val - this.a.z) / delta.z;
    }

    zIntersectionPoint(z_val: number): CartesianCoordinate | null {
        let t_int: number | null = this.zIntersectionTime(z_val);
        if (t_int === null) {
            return null;
        }
        return this.valueAtTime(t_int);
    };

    computeConstraintIntersectionTimes(constraint: XYCircle, box_radius: number): [number, number] | null {
        let x: CartesianCoordinate = this.a;
        let y: CartesianCoordinate = this.b;
        let delta: CartesianCoordinate = this.Delta();

        let a: number = DotProduct2D(delta, delta);
        let b: number = 2 * DotProduct2D(delta, Subtract3D(x, constraint));
        let c: number = DotProduct2D(Subtract3D(x, constraint), Subtract3D(x, constraint)) - (box_radius + constraint.radius) ** 2;

        if (a === 0) {
            return null;
        }

        let second: number = (b ** 2 - 4 * a * c);

        if (second <= 0) { // Only complex or single solution.
            return null;
        }

        let t_0: number = quadratic(a, b, c, a < 0); // last argument is positive -- a is always positive anyways.
        let t_1: number = quadratic(a, b, c, a > 0);

        return [t_0, t_1];
    }
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
};

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



function computeEffectiveConstraint(x: CartesianCoordinate, y: CartesianCoordinate, constraint: XYCircle, box_radius: number): XYCircle | null {
    // deal with same height as constraint.
    let delta_z: number = y.z - x.z;
    let is_rising: boolean = delta_z * -1 >= 0; // line is upwards.

    let min_z: number = Math.max(x.z, y.z);

    if (min_z <= constraint.z) { // it is irrelevant.
        return null;
    }

    let x_dist: number = Norm2D(Subtract3D(x, constraint));
    let y_dist: number = Norm2D(Subtract3D(y, constraint));

    if (x_dist < constraint.radius + box_radius && y_dist < constraint.radius + box_radius) { // all paths cross constraint.
        return null;
    }

    let line = new Line(x, y);

    let intersection_time: [number, number] | null = line.computeConstraintIntersectionTimes(constraint, box_radius);

    if (intersection_time === null) {
        return null;
    }

    let [t_0, t_1]: [number, number] = intersection_time;

    const compute_distance_2d = (time_1: number, time_2: number) => {
        let v1: CartesianCoordinate = line.valueAtTime(time_1);
        let v2: CartesianCoordinate = line.valueAtTime(time_2);
        let diff: CartesianCoordinate = Subtract3D(v2, v1);
        return Norm2D(diff);
    };

    let lower_point: CartesianCoordinate = line.valueAtTime(is_rising ? t_0 : t_1);

    if (lower_point.z < constraint.z) {
        return null;
    }

    if (Math.min(t_0, t_1) > 1) { // constraint is further away than range.
        return null;
    }

    let t_y: number = 1;
    let t_int: number = delta_z === 0 ? t_y : (constraint.z - x.z) / delta_z;

    let c_eff: CartesianCoordinate = line.valueAtTime(t_int);
    let r_eff: number = compute_distance_2d(t_int, is_rising ? t_0 : t_1);

    if (r_eff < (0.1 * (box_radius + constraint.radius))) { // within error, ignore.
        return null;
    }

    return {
        ...c_eff,
        radius: r_eff
    } as XYCircle;
};


//---------------Path Optimizations---------------

interface Internals {
    shift: CartesianCoordinate;
    absolute: CartesianCoordinate;
    base: CartesianCoordinate;
    other: CartesianCoordinate;
};


function computeInternals(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number): Internals | null {
    let effective_constraint: XYCircle | null = computeEffectiveConstraint(a, b, c, box_radius); // get constraint along the path (2-D)

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
        return null;
    }

    let Δ: CartesianCoordinate = Subtract3D(nearest, base);
    let Δ_c: CartesianCoordinate = Subtract3D(effective_constraint, base);
    let Δ_diff: CartesianCoordinate = Subtract3D(other, base);

    let α: number;
    let α_diff: number; // they should be in the same direction

    if (Δ.x === 0) {
        if (Δ.y === 0) {
            return null;
        }
        α = Δ_c.y / Δ.y;
        α_diff = Δ_diff.y / Δ.y;
    } else {
        α = Δ_c.x / Δ.x;
        α_diff = Δ_diff.y / Δ.y;
    }

    α = (α / α_diff > 0 ? α_diff : α);

    let shift: CartesianCoordinate = MultiplyScalar(Δ, α);
    let absolute: CartesianCoordinate = Add3D(base, shift);

    return {
        shift,
        absolute,
        base,
        other
    } as Internals;
};

function computeRaiseCoordinate(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number, box_height: number): CartesianCoordinate | null {
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

    // if (up.z < 0) {
    //     return null;
    // }
    return up;
};


function computeTriangleCoordinate(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number, box_height: number): CartesianCoordinate | null {
    let internals: Internals | null = computeInternals(a, b, c, box_radius);

    if (internals === null) {
        return null;
    }

    return internals.absolute;
};


function computeSquarePath(a: CartesianCoordinate, b: CartesianCoordinate, box_height: number, allow_up: boolean): CartesianCoordinate[] {
    let path: CartesianCoordinate[] = [];

    if (!allow_up) {
        path.push(a);
    }

    path.push({ ...a, z: box_height });
    path.push({ ...b, z: box_height });


    //path.push(b);

    return path;
};


function computePureUpshift(a: CartesianCoordinate, b: CartesianCoordinate): CartesianCoordinate | null {
    let delta: CartesianCoordinate = Subtract3D(a, b);

    let plane_distance = Norm2D(delta);

    if (plane_distance > 1 / 1000) { // approximately zero.
        return null;
    }

    return ((b.z - a.z) * -1) > 0 ? b : a;
};


// Return the points that should replace a.
function computePathArray(a: CartesianCoordinate, b: CartesianCoordinate, c: XYCircle, box_radius: number, box_height: number, allow_up: boolean): CartesianCoordinate[] { // allow up for first coordinate;
    if (allow_up) {
        let up: CartesianCoordinate | null = computeRaiseCoordinate(a, b, c, box_radius, box_height);

        if (up !== null) {
            return [up];
        }
    }

    let pureShift: CartesianCoordinate | null = computePureUpshift(a, b);

    if (pureShift !== null) {
        return [];
    }

    let triangle: CartesianCoordinate | null = computeTriangleCoordinate(a, b, c, box_radius, box_height);

    if (triangle !== null) {
        return [a, triangle];
    }

    // Brute force, should be untouched.
    let square: CartesianCoordinate[] = computeSquarePath(a, b, box_height, allow_up);
    return square;
};

function computeLeveledPath(points: CartesianCoordinate[]): CartesianCoordinate[] {

    let cross_point: CartesianCoordinate | null = null;
    let cross_index: number | null = null;
    let uncross_point: CartesianCoordinate | null = null;
    let uncross_index: number | null = null;
    // Remove duplicates from path. if there are any.

    let i: number = 0;

    while (i < points.length - 1) {
        let a: CartesianCoordinate = points[i];
        let b: CartesianCoordinate = points[i + 1];

        let tolerance: number = 1 / 1000; // in mmiliimeters.

        if (vectorEquals(a, b, tolerance)) {
            points.splice(i, 1);
            continue;
        }
        if (i < points.length - 2) { // This handles cases where three points are on the same z line. // could be generatlized to all along the same line in general.
            let c: CartesianCoordinate = points[i + 2];
            let d1: CartesianCoordinate = Subtract3D(a, b);
            let d2: CartesianCoordinate = Subtract3D(b, c);
            d1.z = 0;
            d2.z = 0;
            let diff: CartesianCoordinate = Subtract3D(d1, d2);
            let dx: number = Math.abs(diff.x);
            let dy: number = Math.abs(diff.y);

            if (Math.max(dx, dy) < tolerance) { // If only change is in the z direction.
                points.splice(i + 1, 1); // remove b. --
                continue;
            }
        }
        i++;
    }

    // Second loop.

    i = 0;
    while (i < points.length - 1) {
        let a: CartesianCoordinate = points[i];
        let b: CartesianCoordinate = points[i + 1];

        let line: Line = new Line(a, b);
        let z_time: number | null = line.zIntersectionTime(0); // find the point it crosses 0.

        if (z_time !== null && z_time >= 0 && z_time <= 1) { // crosses z along path.
            if (cross_point === null) { // no cross point yet. 
                cross_point = line.zIntersectionPoint(0);
                cross_index = i + 1;
            } else { // last uncross point.
                uncross_point = line.zIntersectionPoint(0);
                uncross_index = i + 1;
            }
        }
        i++;
    }

    if (cross_point !== null && cross_index !== null) {
        if (uncross_point !== null && uncross_index !== null) {
            points.splice(cross_index, uncross_index - cross_index, ...[cross_point, uncross_point]);
        } else {
            console.log("Cross but does not uncross", points);
        }
    }
    return points;
};


function computePathForBox(box: BoxCoordinate, input_constraints: XYCircle[]): CartesianCoordinate[] {
    let constraints: XYCircle[] = [...input_constraints];
    // Self constraint starting at box bottom.
    const self_constraint: XYCircle = getBoxBottomXYCircle(box);

    // Alternate point start at each interation.
    // Will need to include the top as a constraint.

    let points: CartesianCoordinate[] = [];

    // initialize points.
    points.push(box.pickLocation);
    points.push(moveZ(box.dropLocation, box.dimensions.height * (-1.1))); // Over drop location + 10% error
    points.push(box.dropLocation);

    // points.push(moveZ(box.pickLocation, box.dimensions.height));
    // points.push(moveZ(box.dropLocation, box.dimensions.height + (-1.1) * box.dimensions.height));
    // points.push(moveZ(box.dropLocation, box.dimensions.height));
    // constraints.unshift(self_constraint);

    let box_radius: number = self_constraint.radius;
    box_radius = 0;

    for (let i = 0; i < constraints.length; i++) {

        let c: XYCircle = constraints[i];
        let j: number = 0;
        while (j < points.length - 1) { // don't adjust last coordinate;
            // The (potentially alternating z_shift allows for choosing the constraint using the top or bottom of the box.)

            let [a, b]: [CartesianCoordinate, CartesianCoordinate] = [points[j], points[j + 1]];
            // compute shift;
            let z_shift: number = (b.z - a.z) * -1 >= 0 ? box.dimensions.height : 0; // if moving upwards, use bottoms, else use top.

            a = moveZ(a, z_shift);
            b = moveZ(b, z_shift);

            let effective_constraint = computeEffectiveConstraint(a, b, c, box_radius); // get constraint along the path (2-D)

            if (effective_constraint !== null) {
                //   box_radius = 0;
                let arr: CartesianCoordinate[] = computePathArray(a, b, c, box_radius, box.dimensions.height, j !== 0).map((point_coord: CartesianCoordinate) => {
                    return moveZ(point_coord, -1 * z_shift); // Unshift the Z axis for append.
                });

                points.splice(j === 0 ? j + 1 : j, j === 0 && arr.length === 1 ? 0 : 1, ...arr);

                if (j !== 0 && arr.length == 1) {
                    j += 0;
                } else {
                    j += 1;
                }
                // j += arr.length - 1;
                continue;
            }
            j += 1;
        }
    }

    // points = points.map((c: CartesianCoordinate) => {
    //     // move Z, add actions.
    //     return moveZ(c, -box.dimensions.height);
    // });

    return computeLeveledPath(points);
}


function computeInitialPath(first_point: CartesianCoordinate): CartesianCoordinate[] {
    let points: CartesianCoordinate[] = [];
    points.push(cartesianCoordinate(0, 0, 0));
    let cp: CartesianCoordinate = { ...first_point };
    cp.z = 0;
    points.push(cp);
    points.push(first_point);
    return points;
};

function addInitialPath(paths: CartesianCoordinate[][]): CartesianCoordinate[][] {
    paths.unshift(computeInitialPath(paths[0][0])); // create a path to the first
    return paths;
};

function optimizePaths(pallet_config: SavedPalletConfiguration): [CartesianCoordinate[][], XYCircle[]] {
    const { boxCoordinates, config } = pallet_config;
    const { pallets } = config;

    let stack_indices: number[] = [];

    // Initialize contrain circles for pallets;
    let constraints: XYCircle[] = pallets.map((p: PalletGeometry) => {
        stack_indices.push(0); // init stack index to zero.
        return getPalletXYCircle(p);
    });

    let initial_constraints = [...constraints];

    let paths: CartesianCoordinate[][] = [];

    let return_paths: CartesianCoordinate[][] = [];

    let previousBox: BoxCoordinate | null = null;

    let new_constraints: XYCircle[] = [];

    const constraintSort = () => {
        constraints.sort((a: XYCircle, b: XYCircle) => {
            return (b.z - a.z) * -1; // * -1 because 0 is top.
        });
    };

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

        for (let i = 0; i < Math.min(consideration_boxes.length, 20); i++) {

            if (i === 0) {
                constraintSort();
            }

            let box: BoxCoordinate = consideration_boxes[i];

            if (previousBox !== null) {
                let return_box: BoxCoordinate = previousBox;
                return_box.pickLocation = { ...return_box.dropLocation };
                return_box.dropLocation = { ...box.pickLocation };
                return_box.dimensions.height *= 0;
                console.log("Return path");
                let return_path: CartesianCoordinate[] = computePathForBox(return_box, constraints);
                return_paths.push(return_path);
                if (i === 0) {
                    constraints = [...constraints, ...new_constraints];
                    constraintSort();
                    new_constraints = [];
                }
            }

            previousBox = { ...box };
            console.log("Other path");
            let path: CartesianCoordinate[] = computePathForBox(box, constraints);
            paths.push(path);
            let new_constraint = getBoxTopXYCircle(box);
            new_constraints.push(new_constraint);
        }

        stack_indices = stack_indices.map((val: number) => {
            return (val + 1);
        });
    }

    let last_return = (() => {
        let p = [] as CartesianCoordinate[];
        if (paths.length > 0) {
            let last_path = paths[paths.length - 1];
            let final_pt = last_path[last_path.length - 1];
            p.push(final_pt);
            p.push(moveZ(final_pt, -final_pt.z));
            p.push(cartesianCoordinate(0, 0, 0));
        }
        return p;
    })();

    if (last_return.length > 0) {
        return_paths.push(last_return);
    }

    let final_paths: CartesianCoordinate[][] = (() => {
        let p = [] as CartesianCoordinate[][];
        for (let i = 0; i < paths.length; i++) {
            p.push(paths[i]);
            p.push(return_paths[i]);
        }
        return p;
    })();

    final_paths = addInitialPath(final_paths);

    return [final_paths, initial_constraints];
};


// Publicly exposed path optimization function.
export function generateOptimizedPath(spc: SavedPalletConfiguration, id?: number): BoxPath[] {

    const { boxCoordinates } = spc;

    let [paths, constraints]: [CartesianCoordinate[][], XYCircle[]] = optimizePaths(spc);

    generatePlottableCoordinates(paths, constraints, id ? `id` : `0`);

    let boxPath: BoxPath[] = [];

    // Make coordinates for plot.
    let prev_angle: number = 0;

    for (let i = 0; i < boxCoordinates.length; i++) {
        let path: BoxPath = [];

        let box_coord: BoxCoordinate = boxCoordinates[i];
        let pick_path: CartesianCoordinate[] = paths[2 * i];
        let drop_path: CartesianCoordinate[] = paths[2 * i + 1];
        let pick_angle_index: number = pick_path.length === 2 ? 1 : 2; // assuming no path is 0 length;
        let drop_angle_index: number = drop_path.length === 2 ? 1 : 2;

        let pick_path_action: BoxPath = pick_path.map((p: CartesianCoordinate, index: number) => {
            return attachAngle(vectorRound(p), index >= pick_angle_index ? box_coord.pickLocation.θ : prev_angle);
        }).map((p: Coordinate, index: number) => {
            return addActionToCoordinate(p, index == pick_path.length - 1 ? ActionTypes.PICK : ActionTypes.NONE);
        });

        prev_angle = box_coord.pickLocation.θ;

        let drop_path_action: BoxPath = drop_path.map((p: CartesianCoordinate, index: number) => {
            return attachAngle(vectorRound(p), index >= drop_angle_index ? box_coord.dropLocation.θ : prev_angle);
        }).map((p: Coordinate, index: number) => {
            return addActionToCoordinate(p, index === drop_path.length - 1 ? ActionTypes.DROP : ActionTypes.NONE);
        });

        prev_angle = box_coord.dropLocation.θ;

        drop_path_action.shift(); // Remove duplicate first element.

        path = path.concat(pick_path_action);
        path = path.concat(drop_path_action);

        boxPath.push(path);
    }

    // Now, handle the final coordinate;

    let last = paths[paths.length - 1];

    let last_path: BoxPath = last.map((p: CartesianCoordinate, index: number) => {
        return attachAngle(p, index > 0 ? 0 : prev_angle);
    }).map((p: Coordinate) => {
        return addActionToCoordinate(p, ActionTypes.NONE);
    });

    boxPath.push(last_path);

    generatePlottableCoordinates(boxPath, constraints, id ? `${id}action` : `0action`);

    return boxPath;
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


//---------------Test Functions---------------
function generatePlottableCoordinates(paths: CartesianCoordinate[][], constraints: XYCircle[], i: number | string) {
    let data: any = {
        paths,
        constraints
    };
    let path = filePath.join(__dirname, "..", "..", "path_data", `${i}data3d.json`);
    fs.writeFileSync(path.toString(), JSON.stringify(data, null, "\t"));
};

function test() {
    initDatabaseHandler().then((handler: DatabaseHandler) => {

        let generator = (i: number) => {
            handler.getPalletConfig(i).then((config: any) => {
                let spc: SavedPalletConfiguration = JSON.parse(config.raw_json);
                let p = generateOptimizedPath(spc, i);
                //                console.log(p)
                // console.log("Box coordinate length", spc.boxCoordinates.length);

                // let [p, c] = optimizePaths(spc);
                // console.log("optimized path length", p.length);
                // generatePlottableCoordinates(p, c, i);
            });
        }

        [1, 2, 3].forEach((i: number) => {
            generator(i);
        });
    });
};


function run_test() {
    //    testArc();
    //testConstraint();
    test();
}


// For Testing.
export function main() {
    console.log("Running file");
    run_test();
}


