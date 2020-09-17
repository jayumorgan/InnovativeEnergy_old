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

function doesViolateConstraint(segment: Segment, constraint: XYCircle, box_radius: number): boolean {
    const [a, b] = segment;

    let min_path_z: number = Math.max(a.z, b.z);

    if (min_path_z <= constraint.z) {
        return false;
    };

    let radius: number = Math.max(box_radius, constraint.radius);
    let distance: number = pointLineDistance2D(a, b, constraint);


    if (distance > radius) { // crossing distance greater than radius
        return false;
    }

    let δ = Subtract3D(b, a);
    let pass_time = (constraint.z - a.z) / δ.z;

    if (Math.abs(pass_time) === Infinity) {
        return false;
    }

    let pass_pt: CartesianCoordinate = Add3D(MultiplyScalar(δ, pass_time), a);

    let plane_distance_from_constraint: number = Norm2D(Subtract3D(pass_pt, constraint));

    if (plane_distance_from_constraint > radius) {
        return false;
    }

    return true;
};

function getErrorRadius(r1: number, r2: number): number {
    // 10% error.
    return (r1 + r2) * 1.10;
}


function computeNearestEdgePoint(constraint: XYCircle, point: CartesianCoordinate, box_radius: number): [CartesianCoordinate | null, number] {
    const r_tilde: number = getErrorRadius(box_radius, constraint.radius);
    const r: number = box_radius + constraint.radius;

    // Double check algebra.
    let direction_2d: any = { x: constraint.x - point.x, y: constraint.y - point.y };
    let direction_2d_norm: number = variableNorm(direction_2d.x, direction_2d.y);

    if (direction_2d_norm === 0) {
        return [null, r];
    } else {
        let shrink_factor: number = (1 - r_tilde / direction_2d_norm);
        direction_2d.x *= shrink_factor;
        direction_2d.y *= shrink_factor;
        let nearest_edge: CartesianCoordinate = { ...direction_2d, z: constraint.z - point.z };
        nearest_edge = Add3D(nearest_edge, point);
        return [nearest_edge, r];
    }
};


function getSafePointForConstraint(point: Coordinate, constraint: XYCircle, box_radius: number): CartesianCoordinate | null {
    let [nearest_edge, radius] = computeNearestEdgePoint(constraint, point, box_radius);
    if (nearest_edge === null) {
        // constraint is at point, raise.
        return null;
    } else {
        nearest_edge = Subtract3D(nearest_edge!, point);

        let z_shift = (nearest_edge!.z / variableNorm(nearest_edge.x, nearest_edge.y)) * (nearest_edge.x + radius);
        return {
            ...constraint,
            z: constraint.z - z_shift
        };
    }
};



// Add a new point forming a triangle to raise over the constraint.
function resolveByTriangularAddition(i: number, points: BoxPath, constraint: XYCircle, box_radius: number): Coordinate {
    let a: Coordinate = { ...points[i] };
    let b: Coordinate = { ...points[i + 1] };

    let safe_a: CartesianCoordinate | null = getSafePointForConstraint(a, constraint, box_radius);
    let safe_b: CartesianCoordinate | null = getSafePointForConstraint(b, constraint, box_radius);

    if (safe_a === null || safe_b === null) {
        let safe = a;
        let other = b;
        if (safe_a === null) {
            safe = b;
            other = a;
        }
        let [nearest_edge, radius] = computeNearestEdgePoint(constraint, safe, box_radius);
        nearest_edge = Subtract3D(nearest_edge!, safe);
        let z_shift = (nearest_edge!.z / variableNorm(nearest_edge.x, nearest_edge.y)) * (nearest_edge.x + radius);
        other.z -= z_shift;
        return other;
    } else {
        let is_a: boolean = (safe_a.z < safe_b.z)
        let safe_coordinate: CartesianCoordinate = (is_a) ? safe_a : safe_b; // take the highest coordinate (ie, the min).
        let sc: Coordinate = { ...safe_coordinate, θ: (is_a) ? a.θ : b.θ };
        return sc;
    }
};

// shift first point up to clear constraint.
function resolveByUpshift(i: number, points: BoxPath, constraint: XYCircle, box_radius: number): Coordinate {
    let safe = resolveByTriangularAddition(i, points, constraint, box_radius);
    return safe;
};


function resolveConstraint(i: number, points: BoxPath, constraint: XYCircle, box_radius: number): BoxPath {
    let path: BoxPath = [...points];

    if (i === 0) {
        let triangle_pt: Coordinate = resolveByTriangularAddition(i, points, constraint, box_radius);

        if (triangle_pt.z >= 0) { // ie. it is not out of range.
            path.splice(i + 1, 0, triangle_pt);
            return path;
        } else {
            console.log("Error with first point, resolve this somehow.");
            return [] as BoxPath;
        }
    } else {
        let upshift_coord = resolveByUpshift(i, points, constraint, box_radius);
        if (upshift_coord.z >= 0) {
            path[i] = upshift_coord;
            return path;
        } else {
            let triangle_pt: Coordinate = resolveByTriangularAddition(i, points, constraint, box_radius);
            path.splice(i + 1, 0, triangle_pt);
            return path;
        }
    }
};


function shiftZ(p: any, h: number): any {
    let c = { ...p };
    c.z += h;
    return c;
};


function generatePath(box: BoxCoordinate, constraints: XYCircle[], isReturn: boolean = false): BoxPath {
    let points: BoxPath = [];
    const height: number = box.dimensions.height;
    const self_constraint: XYCircle = getBoxBottomXYCircle(box);

    points.push(addActionForCoordinate(shiftZ(box.pickLocation, height), isReturn ? ActionTypes.NONE : ActionTypes.PICK));

    let above_drop: CartesianCoordinate = Add3D(box.dropLocation, { x: 0, y: 0, z: -height * 1.1 });
    points.push(shiftZ({ ...above_drop, θ: box.dropLocation.θ }, height));

    points.push(addActionForCoordinate(shiftZ(box.dropLocation, height), isReturn ? ActionTypes.NONE : ActionTypes.DROP));

    constraints.unshift(self_constraint); // Pick location constraint. -- will need to modify.

    for (let j = 0; j < constraints.length; j++) {
        let constraint = constraints[j];
        let i: number = 0;
        while (i < points.length - 1) {
            let s: Segment = [points[i], points[i + 1]];
            if (doesViolateConstraint(s, constraint, self_constraint.radius)) {
                points = resolveConstraint(i, points, constraint, self_constraint.radius);
                // don't increment to double check. for now.
            }
            i++;
        };
    }

    points = points.map((p: ActionCoordinate) => {
        return shiftZ(p, -1 * height);
    });

    return points;
};


export function generateOptimizedPaths(pallet_config: SavedPalletConfiguration): BoxPath[] {
    const { boxCoordinates, config } = pallet_config;
    const { pallets } = config;

    let stack_indices: number[] = [];

    // Initialize contrain circles for pallets;
    let constraints: XYCircle[] = pallets.map((p: PalletGeometry) => {
        stack_indices.push(0); // init stack index to zero.
        return getPalletXYCircle(p);
    });


    let paths: BoxPath[] = [];
    let returnPaths: BoxPath[] = [];

    let previousPath: BoxPath | undefined = undefined;


    while (true) {

        // Note on flatMap: add flag in tsconfig: https://stackoverflow.com/questions/53556409/typescript-flatmap-flat-flatten-doesnt-exist-on-type-any -- avoid use for now.

        let consideration_boxes: BoxCoordinate[] = boxCoordinates.filter((coord: BoxCoordinate) => {
            return (coord.stackIndex === stack_indices[coord.palletIndex]);
        }).map((coord: BoxCoordinate) => {
            return coord;
        }).sort((a: BoxCoordinate, b: BoxCoordinate) => {
            return b.linearPathDistance - a.linearPathDistance;
        });


        if (consideration_boxes.length === 0) {
            break;
        } else {
            constraints.sort((a: XYCircle, b: XYCircle) => {
                return (b.z - a.z) * -1; // * -1 because 0 is top.
            });
            // let box = consideration_boxes[0];
            // paths.push(generatePath(box, constraints));
            for (let i = 0; i < Math.min(consideration_boxes.length, consideration_boxes.length); i++) {
                let box = consideration_boxes[i];
                let path: BoxPath = generatePath(box, constraints);
                paths.push(path);

                let new_constraint = getBoxTopXYCircle(box);
                constraints.push(new_constraint);

                if (previousPath !== undefined) {
                    let arm_box = { ...box };
                    arm_box.pickLocation = { ...previousPath[previousPath.length - 1] };
                    arm_box.dropLocation = { ...box.pickLocation };

                    let return_path: BoxPath = generatePath(arm_box, constraints, true); // path to get from last drop to next pick location.

                    returnPaths.push(return_path);
                }
                previousPath = [...path];


            }

            stack_indices = stack_indices.map((val: number) => {
                return (val + 1);
            });
            break;
        }
    }

    // join paths. -- also add homin path.
    if (previousPath != undefined) {
        let final_drop = { ...previousPath[previousPath.length - 1] };
        let rest_poition = shiftZ(final_drop, -final_drop.z);
        let end_path: BoxPath = [final_drop, rest_poition];
        returnPaths.push(end_path);
    }


    let finalPaths: BoxPath[] = [];

    for (let i = 0; i < paths.length; i++) {
        finalPaths.push(paths[i]);
        finalPaths.push(returnPaths[i]);
    }

    generatePlottableCoordinates(finalPaths);

    return finalPaths;
};

function generatePlottableCoordinates(paths: BoxPath[]) {
    let coords: PlaneCoordinate[][] = [];
    paths.forEach((path: BoxPath) => {
        let p: PlaneCoordinate[] = [];
        path.forEach((c: Coordinate) => {
            let x = variableNorm(c.x, c.y);
            let y = c.z * -1;
            p.push({ x, y } as PlaneCoordinate);
        });
        coords.push(p);
    });
    fs.writeFileSync("data.json", JSON.stringify(coords, null, "\t"));
    fs.writeFileSync("data3d.json", JSON.stringify(paths, null, "\t"));
};

export function test() {
    initDatabaseHandler().then((handler: DatabaseHandler) => {
        handler.getPalletConfig(1).then((config: any) => {
            let spc: SavedPalletConfiguration = JSON.parse(config.raw_json);
            generateOptimizedPaths(spc);
        });
    });
};

function run_test() {
    test();
}
run_test();
