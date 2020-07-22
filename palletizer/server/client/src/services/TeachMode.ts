interface BoxDimensions {
    x: number;
    y: number;
    z: number;
};

export interface Corner {
    x: number;
    y: number;
    z: number;
};

// Pallet Corner Setup:
// A----------
// -----------
// -----------
// -----------
// -----------
// -----------
// -----------
// ----------B

// Layer -- could have multple box sizes?

// How do the points work?
// Normalize Distances -- so that it is a fraction of total width and length (from A,B)

interface Point {
    x: number; // normalized fraction.
    y: number; // normalized fraction.
    theta: number;
};

class Layer {
    Box: BoxDimensions;
    Locations: Point[];
    constructor(boxDimensions: BoxDimensions) {
        this.Box = boxDimensions;
        this.Locations = [];
    }
}

interface PickPoint {
    x: number;
    y: number;
    z: number;
    theta: number; // Rotation of the box (Relative to box size x,y,z)
};

// Class -- to allow flexibility
class PickLocation {
    Data: any;
    GetPickPoint: (index: number) => PickPoint;

    constructor(data: any, get_pick_point: (index: number) => PickPoint) {
        this.Data = data;
        this.GetPickPoint = get_pick_point;
    };
};

class Pallet {

    CornerA: Corner;
    CornerB: Corner;
    Height: number;
    Layers: Layer[];
    Pick: PickLocation;

    constructor(cornerA: Corner, cornerB: Corner, pick: PickLocation) {
        this.CornerA = cornerA;
        this.CornerB = cornerB;
        this.Pick = pick;
        // Default: compute height as average height of corners.
        this.Height = (this.CornerA.z + this.CornerB.z) / 2;
        this.Layers = [];
    };

    set addLayer(layer: Layer) {
        // base height of layer can be generated from box height.
        this.Layers.push(layer);
    };
};


class PalletConfiguration {
    Pallets: Pallet[];

    constructor() {
        this.Pallets = [] as Pallet[];
    }

    set addPallet(P: Pallet) {
        this.Pallets.push(P);
    };
};

export {
    PalletConfiguration,
    Pallet,
    PickLocation,
    Layer
};
