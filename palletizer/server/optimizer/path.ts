//---------------Path Optimizer---------------

// In: (pallet_config) -> Out: (list of coordinates, raise location, etc.

import {
    BoxCoordinate,
    Coordinate,
    PalletConfiguration,
    CartesianCoordinate,
    PalletGeometry
} from "../engine/config";


//---------------Structs---------------
interface XYCircle extends CartesianCoordinate {
    radius: number;
};


//---------------Functions---------------

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

function getBoxBottomXYCircle(box: BoxCoordinate): XYCircle { // at start of path.
    const { dimensions, pickLocation } = box;
    const { width, length, height } = dimensions;

    let radius: number = variableNorm(width, length) / 2;
    let center = Add3D(pickLocation, { x: 0, y: 0, z: height }); // add because 0 = z_home;

    return {
        ...center,
        radius
    } as XYCircle;
};

function getBoxTopXYCircle(box: BoxCoordinate): XYCircle {
    let { x, y, z, radius } = getBoxBottomXYCircle(box);

    z -= box.dimensions.height;  // minus because 0=z_home.
    return {
        radius,
        x,
        y,
        z
    } as XYCircle;
};



export function generatePathSequence(pallet_config: PalletConfiguration) {
    const { boxCoordinates, pallets } = pallet_config;

    // Initialize the contraint array with the pallets. -- will add boxes into here as they are dropped.
    let xy_constraint_circles: XYCircle[] = pallets.map((p: PalletGeometry) => {
        return getPalletXYCircle(p);
    });


};
