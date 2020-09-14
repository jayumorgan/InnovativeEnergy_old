
export interface MachineMotionInfo {
    name: string;
    ipAddress: string;
    netMask: string;
    gateway: string;
    version: number;
};

export interface Drive {
    MachineMotionIndex: number;
    DriveNumber: number;
    MechGainKey: string;
    MechGainValue: number;
    MicroSteps: number;
    Direction: number;
};

export interface Axes {
    X: Drive[];
    Y: Drive[];
    Z: Drive[];
    θ: Drive[];
};

export interface IOState {
    MachineMotionIndex: number;
    NetworkId: number;
    Pins: [boolean, boolean, boolean, boolean];
};

export interface IO {
    On: IOState[];
    Off: IOState[];
};

export interface MachineConfiguration {
    name: string;
    machines: MachineMotionInfo[];
    axes: Axes;
    io: IO;
};


export interface SavedMachineConfiguration {
    name: string;
    config: MachineConfiguration;
    //    config: 
};



//---------------Pallet Configuration---------------

//NB: subset of elements.

export interface CartesianCoordinate {
    x: number;
    y: number;
    z: number;
}

export interface Coordinate extends CartesianCoordinate {
    θ: boolean; // rotated or not.
};

export interface BoxDimensions {
    width: number;
    length: number;
    height: number;
};

export interface BoxCoordinate {
    pickLocation: Coordinate;
    dropLocation: Coordinate;
    dimensions: BoxDimensions;
    palletIndex: number;
    stackIndex: number;
    linearPathDistance: number;
};

export interface PalletGeometry {
    corner1: Coordinate;
    corner2: Coordinate;
    corner3: Coordinate;
};

export interface PalletConfiguration {
    boxCoordinates: BoxCoordinate[];
    name: string;
    pallets: PalletGeometry[];
};

// {
//   config: {
//     name: 'Pallet Configuration 2',
//     boxes: [ [Object] ],
//     pallets: [ [Object] ]
//   },
//   boxCoordinates: [
//     {
//       pickLocation: [Object],
//       dropLocation: [Object],
//       dimensions: [Object],
//       palletIndex: 0
//     }
//   ]
// }

interface PalletConf {
    name: string;
    boxes: any[];
    pallets: any[];
}

export interface SavedPalletConfiguration {
    boxCoordinates: BoxCoordinate[];
    config: PalletConf;
};


