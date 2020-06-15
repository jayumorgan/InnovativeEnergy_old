#!/usr/bin/env python3



from config import configuration as cf
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
        gain = self.config["GAIN"]
        speed = self.config["SPEED"]
        acceleration = self.config["ACCELERATION"]

        network = self.config["NETWORK"]
        
        box_size = self.config["BOX_SIZE"]
        
        pallet_columns = self.config["PALLET_COLUMNS"]
        pallet_rows = self.config["PALLET_ROWS"]
        pallet_layers = self.config["PALLET_LAYERS"]

        # Bottom left of pallet.
        pallet_origin = self.config["PALLET_ORIGIN"]

        # Pickup boxes:
        pick_origin = self.config["PICK_ORIGIN"]

        
        self.mm = fmm.FakeMachineMotion()

        self.coordinates = compute_coordinates(box_size,pallet_origin, pallet_rows, pallet_columns, pallet_layers)
        
        self.mm.emitSpeed(speed)
        self.mm.emitAcceleration(acceleration)
        
        for c in self.coordinates:
            print(c)

        self.__move("point")


    def __move(self, point): # Point is 2D [x,y] coordinate.

        print("Moving safely")


Machine()
