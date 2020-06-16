#!/usr/bin/env python3

from time import sleep


# import ./config/configuration.py
from config import configuration as cf

from mqtt import PalletizerControl as pc


# fake machine motion for development.
from fake_mm import fake_mm as fmm


class MICROSTEPS: # from machine motion.
    ustep_8 = 8


def compute_coordinates(box_size, pallet_origin, pallet_rows, pallet_cols, pallet_layers):

    # ie. x,y and z
    x = pallet_rows["DIRECTION"]
    y = pallet_cols["DIRECTION"]
    z = pallet_layers["DIRECTION"]

    x_n = pallet_rows["COUNT"]
    y_n = pallet_cols["COUNT"]
    z_n = pallet_layers["COUNT"]

    x_box = box_size[x]
    y_box = box_size[y]
    z_box = box_size[z]

    
    zero = pallet_origin

    coordinates = []

    for z_count in range(z_n):
        # (z_count + 1) because we want the top of the box.
        z_c = zero[z] + (z_count + 1) * z_box
        for y_count in range(y_n):
            y_c = zero[y] + (y_count + 1/2) * y_box
            for x_count in range(x_n):
                x_c = zero[x] + (x_count + 1/2) * x_box
                vector = {}
                vector[x] = x_c
                vector[y] = y_c
                vector[z] = z_c
                coordinates.append(vector)
    
    return coordinates 

    
class Machine:

    def __init__(self):
        self.config = cf.load_config("config.json")
        cf.output(self.config)

        axes = self.config["AXES"]
        self.x = axes["x"]
        self.x_0 = 0
        
        self.y = axes["y"]
        self.y_0 = 0
        
        self.z = axes["z"]
        self.z_0 = 0
        
        gain = self.config["GAIN"]
        speed = self.config["SPEED"]
        acceleration = self.config["ACCELERATION"]
        box_size = self.config["BOX_SIZE"]

        network = self.config["NETWORK"]
        
        
        pallet_columns = self.config["PALLET_COLUMNS"]
        pallet_rows = self.config["PALLET_ROWS"]
        pallet_layers = self.config["PALLET_LAYERS"]

        # Bottom left of pallet.
        pallet_origin = self.config["PALLET_ORIGIN"]

        # Pickup boxes:
        self.pick_origin = self.config["PICK_ORIGIN"]

        self.mm = fmm.FakeMachineMotion()

        self.coordinates = compute_coordinates(box_size,pallet_origin, pallet_rows, pallet_columns, pallet_layers)
        
        self.mm.emitSpeed(speed)
        self.mm.emitAcceleration(acceleration)


        for axis, gain in gain.items():
            axis_number = axes[axis]
            self.mm.configAxis(axis_number,MICROSTEPS.ustep_8,gain)



        self.mm.releaseEstop()
        self.mm.resetSystem()


        self.box_count = len(self.coordinates)
        
        for c in self.coordinates:
            print(c)



    def home(self):
        self.move_vertical({"z":self.z_0})
        self.move_planar({"x": self.x_0, "y":self.y_0})
            
    def move_planar(self, point): # Point is 2D [x,y] coordinate.
        self.mm.emitAbsoluteMove(self.z, self.z_0)
        self.mm.waitForMotionCompletion()
        [x,y] = [point["x"], point["y"]] 
        self.mm.emitCombinedAxesAbsoluteMove([self.x, self.y], [x,y])
        self.mm.waitForMotionCompletion()


    def move_vertical(self, point): # point is z_coordinate
        self.mm.emitAbsoluteMove(self.z, point["z"])
        self.mm.waitForMotionCompletion()

    def move_all(self, point):
        self.move_planar(point)
        self.move_vertical(point)

        
    def move_to_pick(self):
        self.move_all(self.pick_origin)

    def move_to_drop(self, index):
        coordinate = self.coordinates[index]
        self.move_planar(coordinate)
        self.move_vertical(coordinate)

# Also implement the checks in here.

        


class Palletizer(pc.PalletizerControl):
    # Do run link protocols.

    def __init__(self):
        self.machine = Machine()
        # Intialize state+controls (PalletizerControl)
        super().__init__()

        self.total_box_count = self.machine.box_count
        self.update({"status": "Waiting", "total_box": self.total_box_count})

        self.start(0)

    def start(self,count):
        # Do: nothing
        print(f"Waiting for start signal.")
        while self.get_command() != "START":
            sleep(0.3)

        total_box_count = self.machine.box_count
        self.update({"status": "Running"})
        self.machine.home()
        self.move_to_pick(count)

    def move_to_pick(self,count):
        self.update({"current_box": count})
        if (count < self.machine.box_count):
            self.machine.move_to_pick()
            self.move_to_drop(count)
        else:
            print(f"Motion completed, wait on restart..")
            self.update({"status": "Complete"})
            self.start(0)


    def move_to_drop(self, count):
        print(f"Moving to drop: {count}")
        self.machine.move_to_drop(count)

        print(f"Releasing pressure")

        self.move_to_pick(count + 1)

    

if __name__ == "__main__":

    Palletizer()
