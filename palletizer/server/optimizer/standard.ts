import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import filePath from "path";
import {
    SavedPalletConfiguration,
    BoxCoordinate,
    Coordinate,
    PlaneCoordinate,
    PalletGeometry,
    CartesianCoordinate,
    IOOutputPin
} from "../engine/config";


//-------IO Actions-------
export enum ActionTypes {
    NONE,
    PICK,
    DROP,
    DETECT_BOX
};

export enum SpeedTypes {
    FAST,
    SLOW // corresponding to FreightSpeed (Drive)
};

export interface ActionCoordinate extends Coordinate {
    action?: ActionTypes;
    speed?: SpeedTypes;
    waitForCompletion: boolean;
    boxDetection: IOOutputPin[];
    boxIndex?: number;
    palletIndex?: number;
    dropLocation?: Coordinate;
};

export type BoxPath = ActionCoordinate[];

export function raiseOverCoordinate(coord: Coordinate, z_top: number = 0): Coordinate {
    return { ...coord, z: z_top };
};

export function addActionToCoordinate(coord: Coordinate, action: ActionTypes, speed: SpeedTypes = SpeedTypes.SLOW, waitForCompletion: boolean = true, boxDetection: IOOutputPin[] = []): ActionCoordinate {
    // Force Wait, Force Slow For Right Now.
    return { ...coord, action, speed: SpeedTypes.SLOW, waitForCompletion: true, boxDetection };
};

function addCartesianCoordinate(a: CartesianCoordinate, b: CartesianCoordinate): CartesianCoordinate {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
};

function multiplyScalar(a: CartesianCoordinate, s: number): CartesianCoordinate {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
};

function subtractCartesianCoordinate(a: CartesianCoordinate, b: CartesianCoordinate): CartesianCoordinate {
    return addCartesianCoordinate(a, multiplyScalar(b, -1));
};

function getNorm(a: CartesianCoordinate): number {
    return Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
};

function getDistance(a: CartesianCoordinate, b: CartesianCoordinate): number {
    return getNorm(subtractCartesianCoordinate(a, b));
};

function PlaneDistance(a: PlaneCoordinate, b: PlaneCoordinate): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

function getPalletCenter(p: PalletGeometry): CartesianCoordinate {
    const { corner1, corner2, corner3 } = p;
    const v1: CartesianCoordinate = subtractCartesianCoordinate(corner1, corner2);
    const v2: CartesianCoordinate = subtractCartesianCoordinate(corner3, corner2);
    const relativeCenter: CartesianCoordinate = multiplyScalar(addCartesianCoordinate(v1, v2), 1 / 2);
    const center: CartesianCoordinate = addCartesianCoordinate(corner2, relativeCenter);
    return center;
};

function generatePathForBox(box: BoxCoordinate, z_top: number, lateralDirection?: PlaneCoordinate): BoxPath {

    let path: BoxPath = [];
    const lateralScale: number = 80; // 16 cm
    const lateralZshift: number = 50;

    //-------Pick-------
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation, z_top), ActionTypes.DETECT_BOX, SpeedTypes.FAST, true, box.boxDetection));
    path.push(addActionToCoordinate(box.pickLocation, ActionTypes.PICK, SpeedTypes.SLOW));

    //-------Lift + Rotate-------
    let preRotated: Coordinate = { ...box.pickLocation };
    preRotated.z = Math.max(z_top, box.pickLocation.z - box.dimensions.height - 20);
    path.push(addActionToCoordinate(preRotated, ActionTypes.NONE, SpeedTypes.SLOW));
    preRotated = raiseOverCoordinate(box.pickLocation, z_top);
    preRotated.θ = box.dropLocation.θ;
    path.push(addActionToCoordinate(preRotated, ActionTypes.NONE, SpeedTypes.SLOW));

    //-------Move + Drop-------
    if (lateralDirection) {
        let lateralApproach: Coordinate = { ...box.dropLocation };
        lateralApproach.x += lateralDirection.x * lateralScale;
        lateralApproach.y += lateralDirection.y * lateralScale;
        lateralApproach.z -= lateralZshift;
        path.push(addActionToCoordinate(raiseOverCoordinate(lateralApproach, z_top), ActionTypes.NONE, SpeedTypes.FAST, false));
        path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE, SpeedTypes.SLOW));
    }
    path.push(addActionToCoordinate(box.dropLocation, ActionTypes.DROP, SpeedTypes.SLOW));

    //-------Raise-------
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation, z_top), ActionTypes.NONE, SpeedTypes.SLOW));
    return path;
};

function calculateTotalHeight(boxes: BoxCoordinate[]): number {
    let height: number = 0, iStack: number = 0;
    boxes.forEach((box) => {
        if (iStack != box.palletIndex) { return; }
        height += box.dimensions.height;
        iStack++;
    });
    return height;
}

function calculateHighestPickLocationZ(boxes: BoxCoordinate[]): number {
    let highestZ: number = 10000;
    boxes.forEach((box) => {
        if (box.pickLocation.z < highestZ) { highestZ = box.pickLocation.z; }
    });
    return highestZ;
};

interface PalletGeometryCenter extends PalletGeometry {
    center: Coordinate;
};

function getFurthestPalletCorners(pick_location: Coordinate, pallet: PalletGeometryCenter): [CartesianCoordinate, CartesianCoordinate] {
    const { corner1, corner2, corner3 } = pallet;
    const v1 = subtractCartesianCoordinate(corner1, corner2);
    const corner4 = addCartesianCoordinate(corner3, v1);

    const corners = [corner1, corner2, corner3, corner4];

    corners.sort((a: CartesianCoordinate, b: CartesianCoordinate) => {
        return getDistance(b, pick_location) - getDistance(a, pick_location);
    });

    return [corners[0], corners[1]];
};


interface BoxCoordinateLateral extends BoxCoordinate {
    lateral: PlaneCoordinate;
};

function sortLayerIntoGrid(pallet_group: BoxCoordinate[], pallets: PalletGeometryCenter[]): BoxCoordinateLateral[] {
    // generate a grid using min direction.

    if (pallet_group.length === 0) {
        return [];
    }

    const pallet = pallets[pallet_group[0].palletIndex];
    // Get the two furthest corners.
    const [a, b] = getFurthestPalletCorners(pallet_group[0].pickLocation, pallet);
    let direction = subtractCartesianCoordinate(b, a);
    direction.z = 0;
    direction = multiplyScalar(direction, 1 / getNorm(direction));

    let grid_width: number = Infinity;

    const lineDistance = (bc: BoxCoordinate): number => {
        const { x, y } = bc.dropLocation;
        const denom = Math.sqrt((b.y - a.y) ** 2 + (b.x - a.x) ** 2);
        const num = Math.abs((b.y - a.y) * x - (b.x - a.x) * y + b.x * a.y - b.y * a.x);
        if (denom === 0) {
            return 0;
        }
        return num / denom;
    };

    pallet_group.forEach((b: BoxCoordinate) => {
        const { width, length } = b.dimensions;
        if (width < grid_width) {
            grid_width = width;
        }
        if (length < grid_width) {
            grid_width = length;
        }
    });

    let ladder_rung = 1;
    let grid_groups: BoxCoordinateLateral[][] = [];
    let current_group: BoxCoordinateLateral[] = [];

    const scalarProjection2D = (x: BoxCoordinate): number => {
        return x.dropLocation.x * direction.x + x.dropLocation.y * direction.y;
    };

    const sortAlongLine = (x: BoxCoordinateLateral, y: BoxCoordinateLateral): number => {
        return scalarProjection2D(x) - scalarProjection2D(y);
    };

    const getLateralVector = (x: BoxCoordinate): PlaneCoordinate => {
        const lat = {
            x: x.dropLocation.x - a.x,
            y: x.dropLocation.y - a.y
        };

        const norm = Math.sqrt(lat.x ** 2 + lat.y ** 2);
        lat.x /= norm;
        lat.y /= norm;
        return lat;
    };


    pallet_group.sort((x: BoxCoordinate, y: BoxCoordinate) => {
        return lineDistance(x) - lineDistance(y);
    });

    let i = 0;
    while (i < pallet_group.length) {
        const b = pallet_group[i];
        const distance = lineDistance(b);
        if (distance < grid_width * ladder_rung) {
            current_group.push({ ...b, lateral: getLateralVector(b) });
            i++;
        } else {
            if (current_group.length > 0) {
                current_group.sort(sortAlongLine);
                grid_groups.push(current_group);
                current_group = [];
            }
            ladder_rung++;
        }
        // Push the last element
        if (i === pallet_group.length) {
            current_group.sort(sortAlongLine);
            grid_groups.push(current_group);
        }
    }

    let final_array: BoxCoordinateLateral[] = [];
    // Flatten
    grid_groups.forEach((group: BoxCoordinateLateral[]) => {
        group.forEach((bcl: BoxCoordinateLateral) => {
            final_array.push(bcl);
        });
    });

    return final_array;
};

//---------------Standard Path---------------
// Builds from the center -> out.
export function generateStandardPath(pallet_config: SavedPalletConfiguration): BoxPath[] {
    const { boxCoordinates } = pallet_config;
    const pallets: PalletGeometryCenter[] = pallet_config.config.pallets.map((p: PalletGeometry) => {
        return {
            ...p,
            center: getPalletCenter(p)
        } as PalletGeometryCenter;
    });

    let paths: BoxPath[] = [];
    let current_height: number = 0;
    const total_height: number = calculateTotalHeight(boxCoordinates);
    const highest_pick_location_z: number = calculateHighestPickLocationZ(boxCoordinates);
    console.log("generateStandardPath: total_height=" + total_height);

    let stackGroups: BoxCoordinate[][][] = [];
    let current_stack_group: BoxCoordinate[][] = [];
    let current_pallet_group: BoxCoordinate[] = [];
    let current_pallet_index: number = 0;
    let current_stack_index: number = 0;

    const sortPalletGroup = (a: BoxCoordinate, b: BoxCoordinate) => {
        const pallet_a: PalletGeometryCenter = pallets[a.palletIndex];
        const pallet_b: PalletGeometryCenter = pallets[b.palletIndex];
        return PlaneDistance(a.dropLocation, pallet_a.center) - PlaneDistance(b.dropLocation, pallet_b.center);
    };



    boxCoordinates.sort((a: BoxCoordinate, b: BoxCoordinate) => {
        if (a.stackIndex === b.stackIndex) {
            return a.palletIndex - b.palletIndex;
        }
        return a.stackIndex - b.stackIndex;
    }).forEach((bc: BoxCoordinate, i: number) => {
        const { stackIndex, palletIndex } = bc;
        if (i === 0) { // set proper parameters on first.
            current_stack_index = stackIndex;
            current_pallet_index = palletIndex;
        }

        if (stackIndex !== current_stack_index) { // Stack index has changed.
            current_pallet_group.sort(sortPalletGroup);
            current_stack_group.push(current_pallet_group);
            stackGroups.push(current_stack_group);
            current_pallet_group = [];
            current_stack_group = [];
            current_pallet_index = palletIndex;
            current_stack_index = stackIndex;
        }

        if (palletIndex !== current_pallet_index) { // Pallet index has changed.
            current_pallet_group.sort(sortPalletGroup);
            current_stack_group.push(current_pallet_group);
            current_pallet_group = [];
            current_pallet_index = palletIndex;
        }

        current_pallet_group.push(bc);

        if (i === boxCoordinates.length - 1) {
            current_pallet_group.sort(sortPalletGroup);
            current_stack_group.push(current_pallet_group);
            stackGroups.push(current_stack_group);
        }
    });


    stackGroups.forEach((stack_group: BoxCoordinate[][]) => {
        stack_group.forEach((pallet_group: BoxCoordinate[]) => {
            if (pallet_group.length === 0) {
                return;
            }
            const grid_group: BoxCoordinateLateral[] = sortLayerIntoGrid(pallet_group, pallets);
            const first = grid_group[0];
            grid_group.forEach((bcl: BoxCoordinateLateral, i: number) => {
                console.log(bcl.dropLocation, "drop: ", i);

                const pallet = pallets[bcl.palletIndex];
                const getZTop = (box: BoxCoordinate) => {
                    return Math.max(0, Math.min(
                        highest_pick_location_z - box.dimensions.height, // never travel lower than the pick location.
                        pallet.corner1.z - current_height - 1.5 * box.dimensions.height) // travel as low as the current height minus 1.5 box.
                        - 50 /* 5cm extra safety */);
                };
                if (i === 0) {
                    paths.push(generatePathForBox(bcl, getZTop(bcl)));
                    return;
                }
                paths.push(generatePathForBox(bcl, getZTop(bcl), bcl.lateral));
            });
            current_height += first.dimensions.height;
        });
    });

    //---------------Console.log---------------
    // stackGroups.forEach((group: BoxCoordinate[][], i: number) => {
    //     group.forEach((pallet_group: BoxCoordinate[], j: number) => {
    //         console.log(`Stack ${i} pallet ${j}`, pallet_group);
    //     });
    // });

    // Center out computation.
    // stackGroups.forEach((stack_group: BoxCoordinate[][]) => {
    //     stack_group.forEach((pallet_group: BoxCoordinate[]) => {
    //         if (pallet_group.length === 0) {
    //             return;
    //         }
    //         const first_box: BoxCoordinate = pallet_group.shift()!;
    //         const pallet: PalletGeometryCenter = pallets[first_box.palletIndex];


    //         const getZTop = (box: BoxCoordinate) => {
    //             return Math.max(0, Math.min(
    //                 highest_pick_location_z - box.dimensions.height, // never travel lower than the pick location.
    //                 pallet.corner1.z - current_height - 1.5 * box.dimensions.height) // travel as low as the current height minus 1.5 box.
    //                 - 50 /* 5cm extra safety */);
    //         };

    //         paths.push(generatePathForBox(first_box, getZTop(first_box)));

    //         pallet_group.forEach((b: BoxCoordinate) => {
    //             let direction: CartesianCoordinate = subtractCartesianCoordinate(b.dropLocation, pallet.center);
    //             direction.z = 0;
    //             direction = multiplyScalar(direction, 1 / getNorm(direction));
    //             paths.push(generateLateralPathForBox(b, getZTop(b), direction));
    //         });
    //         current_height += first_box.dimensions.height;
    //     });
    // });

    savePath(paths);
    return paths;
};

function savePath(data: BoxPath[]) {
    let fpath = filePath.join(__dirname, "..", "..", "path_data", `${uuidv4()}standard.json`);
    let flat: BoxPath = data.flat();
    fs.writeFileSync(fpath.toString(), JSON.stringify(flat, null, "\t"));
};
