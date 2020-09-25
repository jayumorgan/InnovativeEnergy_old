//---------------Generate Standard Pallet Paths---------------


import { BoxPath, ActionCoordinate, ActionTypes } from "./optimized";
import { SavedPalletConfiguration, BoxCoordinate, Coordinate, PalletGeometry } from "../engine/config";


export function raiseOverCoordinate(coord: Coordinate, z_top: number = 0): Coordinate {
    return { ...coord, z: z_top };
};

export function addActionToCoordinate(coord: Coordinate, action: ActionTypes): ActionCoordinate {
    return { ...coord, action };
};

function generatePathForBox(box: BoxCoordinate): BoxPath {
    let path: BoxPath = [];

    // Picking.
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation), ActionTypes.NONE));
    path.push(addActionToCoordinate(box.pickLocation, ActionTypes.PICK));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.pickLocation), ActionTypes.NONE));

    // Dropping.
    // The lateral approach allows to pack boxes tighter.
    // Implies an ordering that preserves clearance in +x and +y.
    let lateralApproach: Coordinate = { ...box.dropLocation };
    lateralApproach.x += 40;
    lateralApproach.y += 40;
    lateralApproach.z -= 50;
    path.push(addActionToCoordinate(raiseOverCoordinate(lateralApproach), ActionTypes.NONE));
    path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE));
    lateralApproach.x -= 40;
    lateralApproach.y -= 40;
    path.push(addActionToCoordinate(lateralApproach, ActionTypes.NONE));
    path.push(addActionToCoordinate(box.dropLocation, ActionTypes.DROP));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation), ActionTypes.NONE));

    /*
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation), ActionTypes.NONE));
    path.push(addActionToCoordinate(box.dropLocation, ActionTypes.DROP));
    path.push(addActionToCoordinate(raiseOverCoordinate(box.dropLocation), ActionTypes.NONE));
    */

    return path;
};

export function generateStandardPath(pallet_config: SavedPalletConfiguration): BoxPath[] {
    const { boxCoordinates } = pallet_config;
    const { pallets } = pallet_config.config;

    let stack_indices: number[] = pallets.map((_: PalletGeometry) => {
        return 0;
    });

    let paths: BoxPath[] = [];

    while (true) {
        let has_coordinates: boolean = false;
        // this is by layer, but could separate by pallet.
        boxCoordinates.filter((coord: BoxCoordinate) => {
            return (coord.stackIndex === stack_indices[coord.palletIndex]);
        }).map((coord: BoxCoordinate) => {
            return coord;
        }).sort((a: BoxCoordinate, b: BoxCoordinate) => {
            return b.linearPathDistance - a.linearPathDistance;
        }).forEach((b: BoxCoordinate) => {
            has_coordinates = true;
            paths.push(generatePathForBox(b));
        });

        if (!has_coordinates) {
            break;
        }

        stack_indices = stack_indices.map((v: number) => {
            return v + 1;
        });
    }

    return paths;
};
