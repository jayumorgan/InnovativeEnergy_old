//---------------Path Optimizer---------------

// In: (pallet_config) -> Out: (list of coordinates, raise location, etc.

//---------------Algo-rythm (iteration 1)---------------
// 0. Make pallets into target circles. Do not 
// 1. Find largest travelled distance at stack level.
// 2. Find line between pick+lift -> point (line generated by the bottom closest corner (the problematic corner)).
// 3. Loop though x-y circles to find any intersections.
// 4. Raise until intersection is dealt with (not iterative)
// 5. Maximum height is 0. incorporate this.
// 6. Continue with rest of loop.


// This is something like O(n^2). -- speed is not really relevant for a finite number of boxes.

// Generate errors if safe path not available -- might be better in the browser.

import { BoxCoordinate } from "../engine/config";


export function generateCoordinateSequence(boxCoordinates: BoxCoordinate[]) {

    // group the coordinates by stack level. 





};

