import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import filePath from "path";
import {
    SavedPalletConfiguration,
    BoxCoordinate,
    Coordinate,
    PlaneCoordinate,
    IOState
} from "../engine/config";


//-------IO Actions-------
export enum ActionTypes {
    NONE,
    PICK,
    DROP
};

export enum SpeedTypes {
    FAST,
    SLOW // corresponding to FreightSpeed (Drive)
};

export interface ActionCoordinate extends Coordinate {
    action?: ActionTypes;
    speed?: SpeedTypes;
    waitForCompletion: boolean;
    boxDetection: IOState[];
};

export type BoxPath = ActionCoordinate[];

export function raiseOverCoordinate(coord: Coordinate, z_top: number = 0): Coordinate {
    return { ...coord, z: z_top };
};

export function addActionToCoordinate(coord: Coordinate, action: ActionTypes, speed: SpeedTypes = SpeedTypes.SLOW, waitForCompletion: boolean = true, boxDetection: IOState[] = []): ActionCoordinate {
    // Force Wait, Force Slow For Right Now.
    return { ...coord, action, speed: SpeedTypes.SLOW, waitForCompletion: true, boxDetection };
};

//-------Not Lateral Approach-------
function generatePathForBox(box: BoxCoordinate, z_top: number): BoxPath {
    let path: BoxPath = [];

    // Picking.
    // Note: we rotate immediately on the way up, because otherwise if we rotate towards the drop location, sometimes we hit neighbouring boxes due to the rotation.
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation, z_top), ActionTypes.NONE, SpeedTypes.FAST));
    // Add box detection to action.
    path.push(addActionToCoordinate(box.pickLocation, ActionTypes.PICK, SpeedTypes.SLOW, true, box.boxDetection));
    let preRotated: Coordinate = { ...box.pickLocation };
    preRotated.z = Math.max(z_top, box.pickLocation.z - box.dimensions.height - 20);
    path.push(addActionToCoordinate(preRotated, ActionTypes.NONE, SpeedTypes.SLOW));
    preRotated = raiseOverCoordinate(box.pickLocation, z_top);
    preRotated.θ = box.dropLocation.θ;
    path.push(addActionToCoordinate(preRotated, ActionTypes.NONE, SpeedTypes.SLOW));

    // Dropping.
    // The lateral approach allows to pack boxes tighter.
    // Implies an ordering that preserves clearance in +x and +y.
    let lateralApproach: Coordinate = { ...box.dropLocation };
    path.push(addActionToCoordinate(raiseOverCoordinate(lateralApproach, z_top), ActionTypes.NONE, SpeedTypes.FAST, false));

    // Make Drop Location Slightly Higher.

    const drop = box.dropLocation;
    //  drop.z -= 100;

    path.push(addActionToCoordinate(drop, ActionTypes.DROP, SpeedTypes.SLOW));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation, z_top), ActionTypes.NONE, SpeedTypes.SLOW));

    return path;
};


function generateLateralPathForBox(box: BoxCoordinate, z_top: number, lateralDirection: PlaneCoordinate): BoxPath {
    let path: BoxPath = [];
    const lateralScale: number = 80; // 16 cm
    const lateralZshift: number = 50;

    // Picking.
    // Note: we rotate immediately on the way up, because otherwise if we rotate towards the drop location, sometimes we hit neighbouring boxes due to the rotation.
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation, z_top), ActionTypes.NONE, SpeedTypes.FAST));
    path.push(addActionToCoordinate(box.pickLocation, ActionTypes.PICK, SpeedTypes.SLOW));
    let preRotated: Coordinate = { ...box.pickLocation };
    preRotated.z = Math.max(z_top, box.pickLocation.z - box.dimensions.height - 20);
    path.push(addActionToCoordinate(preRotated, ActionTypes.NONE, SpeedTypes.SLOW));
    preRotated = raiseOverCoordinate(box.pickLocation, z_top);
    preRotated.θ = box.dropLocation.θ;
    path.push(addActionToCoordinate(preRotated, ActionTypes.NONE, SpeedTypes.SLOW));

    // Dropping.
    // The lateral approach allows to pack boxes tighter.
    // Implies an ordering that preserves clearance in +x and +y.
    const drop = box.dropLocation;
    //  drop.z -= 100;



    let lateralApproach: Coordinate = { ...box.dropLocation };
    lateralApproach.x += lateralDirection.x * lateralScale;
    lateralApproach.y += lateralDirection.y * lateralScale;
    lateralApproach.z -= lateralZshift;
    path.push(addActionToCoordinate(raiseOverCoordinate(lateralApproach, z_top), ActionTypes.NONE, SpeedTypes.FAST, false));
    path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE, SpeedTypes.SLOW));

    // Smoothed out the path.
    // lateralApproach.x -= lateralDirection.x * lateralScale;
    // lateralApproach.y -= lateralDirection.y * lateralScale;
    // path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE, SpeedTypes.SLOW, false));

    path.push(addActionToCoordinate(box.dropLocation, ActionTypes.DROP, SpeedTypes.SLOW));
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
}

function PlaneDistance(a: PlaneCoordinate, b: PlaneCoordinate): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

//---------------Standard Path---------------
export function generateStandardPath(pallet_config: SavedPalletConfiguration): BoxPath[] {
    const { boxCoordinates } = pallet_config;
    const { pallets } = pallet_config.config;

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
        return b.linearPathDistance - a.linearPathDistance;
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

    //---------------Console.log---------------
    // stackGroups.forEach((group: BoxCoordinate[][], i: number) => {
    //     group.forEach((pallet_group: BoxCoordinate[], j: number) => {
    //         console.log(`Stack ${i} pallet ${j}`, pallet_group);
    //     });
    // })


    stackGroups.forEach((stack_group: BoxCoordinate[][]) => {
        stack_group.forEach((pallet_group: BoxCoordinate[]) => {
            // We continue.
            if (pallet_group.length > 0) {
                const bc0 = pallet_group.shift()!;
                const { palletIndex } = bc0; // Also the furthest away.

                const getZTop = (box: BoxCoordinate) => {
                    return Math.max(0, Math.min(
                        highest_pick_location_z - box.dimensions.height, // never travel lower than the pick location.
                        pallets[palletIndex].corner1.z - current_height - 1.5 * box.dimensions.height) // travel as low as the current height minus 1.5 box.
                        - 50 /* 5cm extra safety */);
                };

                // First box doesn't need lateral approach
                paths.push(generatePathForBox(bc0, getZTop(bc0)));

                pallet_group.sort((a: BoxCoordinate, b: BoxCoordinate) => {
                    return PlaneDistance(a.dropLocation, bc0.dropLocation) - PlaneDistance(b.dropLocation, bc0.dropLocation);
                }).forEach((b: BoxCoordinate) => {

                    let direction: PlaneCoordinate = {
                        x: b.dropLocation.x - bc0.dropLocation.x,
                        y: b.dropLocation.y - bc0.dropLocation.y
                    };
                    const norm: number = Math.sqrt(direction.x ** 2 + direction.y ** 2);
                    direction.x *= 1 / norm;
                    direction.y *= 1 / norm;
                    // Lateral approach
                    paths.push(generateLateralPathForBox(b, getZTop(b), direction));
                });

                current_height += bc0.dimensions.height;
            }
        });
    });

    savePath(paths);
    return paths;
};

function savePath(data: BoxPath[]) {
    let fpath = filePath.join(__dirname, "..", "..", "path_data", `${uuidv4()}standard.json`);
    let flat: BoxPath = data.flat();
    fs.writeFileSync(fpath.toString(), JSON.stringify(flat, null, "\t"));
};
