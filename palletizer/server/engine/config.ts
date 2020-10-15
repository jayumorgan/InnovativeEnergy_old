//---------------Machine Configuration---------------
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
    Gearbox: boolean;
    Speed: number;
    FreightSpeed: number; // Speed under load.
    Acceleration: number;
    FreightAcceleration: number;
    HomingSpeed: number;
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

export interface IOOutputPin {
    MachineMotionIndex: number;
    NetworkId: number; // 0, 1, 2
    PinId: number; // 0, 1, 2, 3
    PinVal: boolean;
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
    good_pick: IOOutputPin[];
};


export interface SavedMachineConfiguration {
    name: string;
    config: MachineConfiguration;
};

//---------------Pallet Configuration---------------
export interface PlaneCoordinate {
    x: number;
    y: number;
};

export interface CartesianCoordinate extends PlaneCoordinate {
    z: number;
};

export interface Coordinate extends CartesianCoordinate {
    θ: number;
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
    boxDetection: IOOutputPin[];
    palletIndex: number;
    stackIndex: number;
    boxIndex: number; // Box index number in configuration.
    linearPathDistance: number;
};

export interface PalletGeometry {
    corner1: Coordinate;
    corner2: Coordinate;
    corner3: Coordinate;
};

export interface BoxObject {
    name: string;
    dimensions: BoxDimensions;
    pickLocation: Coordinate;
    boxDetection: IOState[];
};

export interface PalletConfiguration {
    name: string;
    pallets: PalletGeometry[];
    boxes: BoxObject[];
    machine_config_id: number;
};

export interface SavedPalletConfiguration {
    boxCoordinates: BoxCoordinate[];
    config: PalletConfiguration;
    complete: boolean; // Engine used configurations should always be complete.
};


