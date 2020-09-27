//---------------Generate Standard Pallet Paths---------------


import { BoxPath, ActionCoordinate, ActionTypes, SpeedTypes } from "./optimized";
import { SavedPalletConfiguration, BoxCoordinate, Coordinate, PalletGeometry } from "../engine/config";


export function raiseOverCoordinate(coord: Coordinate, z_top: number = 0): Coordinate {
    return { ...coord, z: z_top };
};

export function addActionToCoordinate(coord: Coordinate, action: ActionTypes, speed: SpeedTypes = SpeedTypes.SLOW, waitForCompletion: boolean = true): ActionCoordinate {
    return { ...coord, action, speed, waitForCompletion };
};

function generatePathForBox(box: BoxCoordinate, z_top: number): BoxPath {
    let path: BoxPath = [];

    // Picking.
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation, z_top), ActionTypes.NONE, SpeedTypes.FAST));
    path.push(addActionToCoordinate(box.pickLocation, ActionTypes.PICK, SpeedTypes.SLOW));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation, z_top), ActionTypes.NONE, SpeedTypes.SLOW));

    // Dropping.
    // The lateral approach allows to pack boxes tighter.
    // Implies an ordering that preserves clearance in +x and +y.
    let lateralApproach: Coordinate = { ...box.dropLocation };
    lateralApproach.x += 50;
    lateralApproach.y += 50;
    lateralApproach.z -= 50;
    path.push(addActionToCoordinate(raiseOverCoordinate(lateralApproach, z_top), ActionTypes.NONE, SpeedTypes.FAST, false));
    path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE, SpeedTypes.SLOW));
    lateralApproach.x -= 50;
    lateralApproach.y -= 50;
    path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE, SpeedTypes.SLOW, false));
    path.push(addActionToCoordinate(box.dropLocation, ActionTypes.DROP, SpeedTypes.SLOW));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation, z_top), ActionTypes.NONE, SpeedTypes.SLOW));

    /*
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation), ActionTypes.NONE));
    path.push(addActionToCoordinate(box.dropLocation, ActionTypes.DROP));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation), ActionTypes.NONE));
    */

    return path;
};

function calculateTotalHeight(boxes: BoxCoordinate[]): number {
    let height: number = 0, iStack: number = 0;
    boxes.forEach((box) => {
        if  (iStack != box.palletIndex) { return; }
        height += box.dimensions.height;
        iStack++;
    });
    return height;
}

export function generateStandardPath(pallet_config: SavedPalletConfiguration): BoxPath[] {
    const { boxCoordinates } = pallet_config;
    const { pallets } = pallet_config.config;

    let stack_indices: number[] = pallets.map((_: PalletGeometry) => {
        return 0;
    });

    let paths: BoxPath[] = [];
    let current_height: number = 0;
    let total_height: number = calculateTotalHeight(boxCoordinates);
    console.log("generateStandardPath: total_height=" + total_height);

    while (true) {
        let has_coordinates: boolean = false;
        let bc_filtered;
        // this is by layer, but could separate by pallet.
        (bc_filtered = boxCoordinates.filter((coord: BoxCoordinate) => {
            return (coord.stackIndex === stack_indices[coord.palletIndex]);
        })).map((coord: BoxCoordinate) => {
            return coord;
        }).sort((a: BoxCoordinate, b: BoxCoordinate) => {
            return b.linearPathDistance - a.linearPathDistance;
        }).forEach((b: BoxCoordinate) => {
            has_coordinates = true;
            // Calculate a z_top that minimized travel time conservatively.
            // TODO: review for multiple pallets...
            let z_top: number = Math.max(0, Math.min(
                b.pickLocation.z - b.dimensions.height, // never travel lower than the pick location.
                pallet_config.config.pallets[0].corner1.z - current_height - 2 * b.dimensions.height) // travel as low as the current height minus 2 boxes.
                - 50 /* 5cm extra safety */);
            paths.push(generatePathForBox(b, z_top));
        });

        if (!has_coordinates) {
            break;
        }

        current_height += bc_filtered[0].dimensions.height;
        stack_indices = stack_indices.map((v: number) => {
            return v + 1;
        });
    }

    return paths;
};
