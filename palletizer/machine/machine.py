#!/usr/bin/env python3

from time import sleep
import json
import pathlib
from config import configuration as cf
from mqtt import PalletizerControl as pc

FILE_PATH = str(pathlib.Path(__file__).parent.absolute()) + "/"
def read_env():
    with open(FILE_PATH + "environment.json") as environment:
        data = json.load(environment)
        deploy = data["DEPLOY"]
        return True

# fake machine motion for development.
from fake_mm import fake_mm as fmm
import MachineMotion as mm


class MICROSTEPS: # from machine motion.
    ustep_8 = 8


QUARTER_TURN = 1480
NO_TURN = 0
    


def qtip_coordinates(box_size, pallet_origin, layers):
    x_size = box_size["x"]
    y_size = box_size["y"]
    z_size = box_size["z"]

    x_0 = pallet_origin["x"]
    y_0 = pallet_origin["y"]
    z_0 = pallet_origin["z"]

    x_off = x_0
    y_off = y_0
    z_off = z_0

    vectors = []
    
    for i in range(layers):
        z_off += z_size
        for j in range(2):
            vector = {}
            vector["z"] = z_off
            if i % 2 == 0:
                vector["y"] = y_0 + j * y_size
                vector["x"] = x_0
                vector["i"] = NO_TURN
            else:
                vector["x"] = x_0 + (-1/2 + j) * y_size
                vector["y"] = y_0 + 1/2 * y_size
                vector["i"] = QUARTER_TURN

            vectors.append(vector)


    return vectors
    

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
                vector["i"] = QUARTER_TURN
                coordinates.append(vector)
    
    return coordinates 


def compute_pick_locations(pick_origin, length, box_height):

    picks = []

    x = pick_origin["x"]
    y = pick_origin["y"]
    z = pick_origin["z"]

    for i in range(length):

        z += box_height
        
        coordinate = {
            "x" : x,
            "y" : y,
            "z" : z,
            "i" : NO_TURN
        }

        picks.append(coordinate)


    picks.reverse()
    return picks

    
class Machine:

    def __init__(self):

        config = cf.load_selected_config()
        self.pallet_config = config["pallet"]
        self.machine_config = config["machine"]
        cf.output(config)

        axes = self.machine_config["AXES"]

        self.x = axes["x"]
        self.x_0 = 0
        
        self.y = axes["y"]
        self.y_0 = 0
        
        self.z = axes["z"]
        # home to top part.
        self.z_0 = 298

        self.i_0 = 0
        
        gain = self.machine_config["GAIN"]
        speed = self.machine_config["SPEED"]
        acceleration = self.machine_config["ACCELERATION"]
        network = self.machine_config["NETWORK"]
        rotation_network = self.machine_config["ROTATION_NETWORK"]

        self.pressure_ouput = self.machine_config["PRESSURE_OUTPUT"]
        self.box_detector = self.machine_config["BOX_DETECTION"]
        self.pressure_input = self.machine_config["PRESSURE_INPUT"]

        box_size = self.pallet_config["BOX_SIZE"]
        pallet_columns = self.pallet_config["PALLET_COLUMNS"]
        pallet_rows = self.pallet_config["PALLET_ROWS"]
        pallet_layers = self.pallet_config["PALLET_LAYERS"]

        # lowest coordinate value of [x,y,z] (increment from here).
        pallet_origin = self.pallet_config["PALLET_ORIGIN"]

        # Pickup boxes:
        self.pick_origin = self.pallet_config["PICK_ORIGIN"]



        deploy = read_env()
        if deploy:
            self.mm = mm.MachineMotion(network["IP_ADDRESS"])
            self.rmm = mm.MachineMotion(rotation_network["IP_ADDRESS"])
        else:
            self.mm = fmm.FakeMachineMotion()


        self.coordinates = qtip_coordinates(box_size,
                                            pallet_origin,
                                            pallet_layers["COUNT"] * 2)
        # self.coordinates = compute_coordinates(box_size,pallet_origin, pallet_rows, pallet_columns, pallet_layers)
        
        self.mm.emitSpeed(speed)
        self.mm.emitAcceleration(acceleration)

        for axis, gain in gain.items():
            axis_number = axes[axis]
            self.mm.configAxis(axis_number,MICROSTEPS.ustep_8,gain)

        # specify in configuration file.
        self.mm.configAxisDirection(self.x, mm.DIRECTION.NORMAL)
        self.mm.configAxisDirection(self.y, mm.DIRECTION.REVERSE)
        self.mm.configAxisDirection(self.z, mm.DIRECTION.REVERSE)
            
            
        self.mm.releaseEstop()
        self.mm.resetSystem()
        self.rmm.releaseEstop()
        self.rmm.resetSystem()

        self.box_count = len(self.coordinates)
        
        temp = compute_pick_locations(self.pick_origin,
                                                     int(self.box_count / 2),
                                                     box_size["z"])

        temp2 = []

        self.pick_locations = []

        for k in temp:
            x = k.copy()
            x["x"] = 105

            self.pick_locations.append(k)
            self.pick_locations.append(x)

        for index, c in enumerate(self.coordinates):
            print("Pick Location: ", self.pick_locations[index], "Drop Location", c)

    def home(self):
        self.move_vertical({"z":self.z_0})
        self.mm.emitHome(self.x)
        self.mm.emitHome(self.y)
        self.mm.waitForMotionCompletion()
        self.mm.emitHome(self.z)
        self.mm.waitForMotionCompletion()
        self.move_vertical({"z":self.z_0})
        self.mm.waitForMotionCompletion()
        self.rmm.emitHomeAll()
        self.rmm.waitForMotionCompletion()
            
    def move_planar(self, point): # Point is 2D [x,y] coordinate.
        self.mm.emitAbsoluteMove(self.z, self.z_0)
        self.rmm.emitAbsoluteMove(1, point["i"])
        self.mm.waitForMotionCompletion()
        [x,y] = [point["x"], point["y"]] 
        self.mm.emitCombinedAxesAbsoluteMove([self.x, self.y], [x,y])
        self.rmm.waitForMotionCompletion()
        self.mm.waitForMotionCompletion()

    def move_vertical(self, point): # point is z_coordinate
        self.mm.emitAbsoluteMove(self.z, point["z"])
        self.mm.waitForMotionCompletion()

    def move_all(self, point):
        self.move_planar(point)
        self.move_vertical(point)
        
    def move_to_pick(self, count):
        coordinate = self.pick_locations[count]
        
        self.move_all(coordinate)
        
        
    def move_to_drop(self, index):
        coordinate = self.coordinates[index]
        self.move_planar(coordinate)
        self.move_vertical(coordinate)

    def __read_io(self, network_id, pin):
        return self.mm.digitalRead(network_id, pin)
        
    def detect_box(self):
        pin = self.box_detector["PIN"]
        network_id = self.box_detector["NETWORK_ID"]
        pin_value = self.__read_io(network_id, pin)
        return pin_value == 1

    def check_for_pick(self):
        pin = self.pressure_input["PIN"]
        network_id = self.pressure_input["NETWORK_ID"]
        pin_value = self.__read_io(network_id, pin)
        return pin_value == 1
    
        

    def __write_pressure(self, on):
        pin = self.pressure_ouput["PIN"]
        network_id = self.pressure_ouput["NETWORK_ID"]
        self.mm.digitalWrite(network_id, pin, 1 if on else 0)
        
    
    def start_pressure(self):
        self.__write_pressure(True)

    def stop_pressure(self):
        self.__write_pressure(False)


# this should be a function.
class Palletizer(pc.PalletizerControl):
    # Do run link protocols.

    def __init__(self):
        # Intialize state+controls (PalletizerControl)
        super().__init__()

        self.start(0)

    def start(self,count):
        # Setup the machine. (load configuration)
        self.machine = Machine()
        
        self.total_box_count = self.machine.box_count
        self.update({
            "status": "Waiting",
            "total_box": self.total_box_count,
            "coordinates" : self.machine.coordinates
        })

        self.control_checks(interrupted=True)
        self.increment_cycle()
        self.update({"status": "Running"})
        self.machine.home()
        self.control_checks()
        self.move_to_pick(count)

    def move_to_pick(self,count):
        self.control_checks()
        self.update({"current_box": count})
        
        # self.update_information("Warning", "Box not detected at pick location. Check for box presence")
        if (count < self.machine.box_count):
            self.machine.move_to_pick(count)
            warn_string = "No box detected at pick location. Trying again."
            fail_string = "No box available at pick location. Operator assistance required."
            # self.warning_loop(self.machine.detect_box, warn_string, fail_string)

            self.machine.start_pressure()

            warn_string = "Box pick failed. Trying again."
            fail_string = "Unable to pick box. Operator assistance required."

            # self.warning_loop(self.machine.check_for_pick, warn_string, fail_string, operation=self.machine.start_pressure)

            self.move_to_drop(count)
        else:
            print("Motion completed, wait on restart..")
            self.machine.home()
            self.update({"status": "Complete"})
            self.update_information("Status", "Cycle has completed. Awaiting pallet change.")
            self.start(0)

    def move_to_drop(self, count):
        self.control_checks()
        self.machine.move_to_drop(count)

        self.machine.stop_pressure()
        sleep(0.4)

        fail_string = "Unable to drop box. Operator asssistance required"
        warn_string = "Unable to drop box. Retrying"

        # self.warning_loop(self.machine.check_for_pick, warn_string, fail_string,operation=self.machine.stop_pressure, limit=2)
        
        self.move_to_pick(count + 1)

    def warning_loop(self, check_fn, warn_string, fail_string,operation=(lambda *args : None),limit=5):
        count = 0
        while not check_fn():
            sleep(1)
            if count == 1:
                self.update_information("Warning", warn_string)
            if count == limit:
                self.update_information("Error", fail_string)
                self.machine_fail()
                self.control_checks()
                count = -1
            operation()
            count += 1

    def command_status_update(self, command):
        if command != None:
            status = {"status": None}
            if command == "START":
                status["status"] = "Running"
            elif command == "PAUSE":
                status["status"] = "Paused"
                self.update({"status": "Paused"})
            elif command == "STOP":
                status["status"] = "Stopped"
            else:
                status["status"] = "Unhandled Status"
                print("Unhandled status for command", command)
            self.update(status)
        
    # ie. handle play, pause, stop.
    def control_checks(self, interrupted = False):
        # Use walrus operator if python 3.8
        while True:
            command = self.get_command()
            self.command_status_update(command)
            if interrupted:
                if command == "START":
                    break
            else:
                if command == "PAUSE" or command == "STOP":
                    interrupted = True
                    sleep(0.3)
                else:
                    break
    

if __name__ == "__main__":

    Palletizer()
