//---------------Path Optimizer: Attempt 1---------------


// In: (pallet_config) -> Out: (list of coordinates, raise location, etc.

import {
    BoxCoordinate,
    Coordinate,
    PalletConfiguration,
    CartesianCoordinate,
    PalletGeometry,
    SavedMachineConfiguration,
    SavedPalletConfiguration
} from "../engine/config";


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
// NB: copied + modified from client/src/parts/teach/structures/Data.tsx
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

function variableNorm(...args: number[]): number {
    let squares: number = 0;
    args.forEach((a: number) => {
        squares += a ** 2;
    });
    return Math.sqrt(squares);
};

function Norm(c: CartesianCoordinate): number {
    const { x, y, z } = c;
    return variableNorm(x, y, z);
};

function UnitVector(v: CartesianCoordinate): CartesianCoordinate {
    return MultiplyScalar(v, 1 / Norm(v));
};

function DotProduct(x: CartesianCoordinate, y: CartesianCoordinate): number {
    return x.x * y.x + x.y * y.y + x.z * y.z;
};

function DotProduct2D(x: CartesianCoordinate, y: CartesianCoordinate): number {
    let x2 = { ...x };
    let y2 = { ...y };
    x2.z = 0;
    y2.z = 0;
    return DotProduct(x2, y2);
};

// line is l = (b-a)t + a, point is x. -- assuming 2d.
function pointLineDistance2D(a: CartesianCoordinate, b: CartesianCoordinate, x: CartesianCoordinate): number {
    const a_minus_x = Subtract3D(a, x);
    const b_minus_a = Subtract3D(b, a);
    const squared_norm = DotProduct2D(b_minus_a, b_minus_a);
    const dot_ax_ba = DotProduct2D(a_minus_x, b_minus_a);
    const t_min: number = -1 * dot_ax_ba / squared_norm;
    return t_min;
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
    let distance: number = pointLineDistance2D(a, b, constraint);
    let radius: number = Math.max(box_radius, constraint.radius);
    let min_path_z: number = Math.max(a.z, b.z);

    return (distance <= radius && constraint.z <= min_path_z); // if they cross over and constraint is above min_path.
};

function getErrorRadius(r1: number, r2: number): number {
    // 10% error.
    return (r1 + r2) * 1.10;
}


function computeNearestEdgePoint(constraint: XYCircle, point: Coordinate, box_radius: number): [CartesianCoordinate, number] {
    const r_tilde: number = getErrorRadius(box_radius, constraint.radius);
    // Double check algebra.
    let direction_2d: any = { x: constraint.x - point.x, y: constraint.y - point.y };
    let direction_2d_norm: number = variableNorm(direction_2d.x, direction_2d.y);
    // to compute the center.
    direction_2d.x *= (1 - r_tilde / direction_2d_norm);
    direction_2d.y *= (1 - r_tilde / direction_2d_norm);
    let nearest_edge: CartesianCoordinate = { ...direction_2d, z: constraint.z - point.z };
    return [nearest_edge, r_tilde];
};


function getSafePointForConstraint(point: Coordinate, constraint: XYCircle, box_radius: number): CartesianCoordinate {
    let [nearest_edge, r_tilde] = computeNearestEdgePoint(constraint, point, box_radius);

    let α: number = r_tilde * Norm(nearest_edge) / variableNorm(nearest_edge.x, nearest_edge.y);
    let h_plus: number = α * nearest_edge.z / Norm(nearest_edge);
    nearest_edge.z += h_plus;
    nearest_edge = Add3D(nearest_edge, point);

    return nearest_edge;
};


// Add a new point forming a triangle to raise over the constraint.
function resolveByTriangularAddition(i: number, points: BoxPath, constraint: XYCircle, box_radius: number): Coordinate {
    let a: Coordinate = points[i];
    let b: Coordinate = points[i + 1];

    let safe_a: CartesianCoordinate = getSafePointForConstraint(a, constraint, box_radius);
    let safe_b: CartesianCoordinate = getSafePointForConstraint(b, constraint, box_radius);

    // take the higher of the two.
    let safe_coordinate: CartesianCoordinate = (safe_a.z < safe_b.z) ? safe_a : safe_b; // take the highest coordinate (ie, the min).

    let sc: Coordinate = { ...safe_coordinate, θ: a.θ };
    return sc;
};

// shift first point up to clear constraint.
function resolveByUpshift(i: number, points: BoxPath, constraint: XYCircle, box_radius: number): Coordinate {
    // closest point;
    let a: Coordinate = points[i];
    let point: Coordinate = points[i + 1];
    let [nearest_edge, r_tilde] = computeNearestEdgePoint(constraint, point, box_radius);

    let tan: number = nearest_edge.z / variableNorm(nearest_edge.x, nearest_edge.y);
    let delta: number = variableNorm(a.x - point.x, a.y - point.y);

    let a_prime_z: number = tan * delta + point.z;

    a.z = a_prime_z + point.z;
    return a;
};

function resolveConstraint(i: number, points: BoxPath, constraint: XYCircle, box_radius: number): BoxPath {
    let path: BoxPath = [...points];

    if (i === 0) {
        let triangle_pt: Coordinate = resolveByTriangularAddition(i, points, constraint, box_radius);
        if (triangle_pt.z >= 0 || true) { // ie. it is not out of range.
            path.splice(i, 0, triangle_pt);
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
            path.splice(i, 0, triangle_pt);
            return path;
        }
    }
};

function generatePath(box: BoxCoordinate, constraints: XYCircle[]): BoxPath {
    let points: BoxPath = [];
    const self_constraint: XYCircle = getBoxBottomXYCircle(box);
    points.push(box.pickLocation);
    points.push(box.dropLocation);
    constraints.unshift(self_constraint); // Pick location constraint. -- will need to modify.

    constraints.forEach((constraint: XYCircle) => {
        let i: number = 0;
        while (i < points.length - 1) {
            let s: Segment = [points[i], points[i + 1]];
            if (doesViolateConstraint(s, constraint, self_constraint.radius)) {
                points = resolveConstraint(i, points, constraint, self_constraint.radius);
                i++;
                // don't increment to double check. for now.
            } else {
                i++;
            }
        };
    });
    return points;
};


export function generatePathSequence(pallet_config: SavedPalletConfiguration): BoxPath[] {
    const { boxCoordinates, config } = pallet_config;
    const { pallets } = config;

    let stack_indices: number[] = [];

    // Initialize contrain circles for pallets;
    let constraints: XYCircle[] = pallets.map((p: PalletGeometry) => {
        stack_indices.push(0); // init stack index to zero.
        return getPalletXYCircle(p);
    });


    let paths: BoxPath[] = [];

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

            consideration_boxes.forEach((box: BoxCoordinate) => {
                let path: BoxPath = generatePath(box, constraints);
                paths.push(path);
                constraints.push(getBoxTopXYCircle(box));
            });

            stack_indices = stack_indices.map((val: number) => {
                return (val + 1);
            });
        }
    }

    return paths;
};
