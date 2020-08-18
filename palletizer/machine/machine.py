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
        return deploy


# fake machine motion for development.
from fake_mm import fake_mm as fmm
import MachineMotion as mm


class MICROSTEPS:  # from machine motion.
    ustep_8 = 8


QUARTER_TURN = 1480
NO_TURN = 0

MIN_HEIGHT_OFFSET = 100

NINETY_DEG = 90
# IN MM


class Machine:
    def __init__(self):
        config = cf.load_selected_config()
        self.pallet_config = config["pallet"]
        print(self.pallet_config)

        self.machine_config = config["machine"]
        cf.output(config)

        axes = self.machine_config["AXES"]

        self.highAccel = 700
        self.lowAccel = 500

        self.x = axes["x"]
        self.x_0 = 0

        self.y = axes["y"]
        self.y_0 = 0

        self.z = axes["z"]

        # We wi
        # home to top part.
        self.z_0 = self.machine_config["TOP_Z"]

        # Rotation Axis.
        self.i = axes["i"]
        self.i_0 = 0

        gain = self.machine_config["GAIN"]
        speed = self.machine_config["SPEED"]
        acceleration = self.machine_config["ACCELERATION"]

        machines = self.machine_config["MACHINES"]
        machine1 = machines[0]
        machine2 = machines[1]

        #network = self.machine_config["NETWORK"]
        #rotation_network = self.machine_config["ROTATION_NETWORK"]
        self.pressure_ouput = self.machine_config["PRESSURE_OUTPUT"]
        self.box_detector = self.machine_config["BOX_DETECTION"]
        self.pressure_input = self.machine_config["PRESSURE_INPUT"]

        deploy = read_env()
        # deploy = True
        print(f"Running Production Environment: {deploy}")
        #deploy = True
        self.Machines = []

        if deploy:
            print(machine1["IP_ADDRESS"], machine2["IP_ADDRESS"])
            mm1 = mm.MachineMotion(machine1["IP_ADDRESS"])
            mm2 = mm.MachineMotion(machine2["IP_ADDRESS"])
            mm1.emitSpeed(speed)
            mm1.emitAcceleration(acceleration)
            mm2.emitSpeed(speed)
            mm2.emitAcceleration(acceleration)
            homingSpeed = 250
            mm1.configHomingSpeed([1, 2, 3], [250, 250, 250])
            mm2.configHomingSpeed([1, 2, 3], [250, 250, 250])
            print("Detect IO Modules 1 ", mm1.detectIOModules())
            print("Detect IO Modules 2 ", mm2.detectIOModules())

            self.Machines.append(mm1)
            self.Machines.append(mm2)

        else:
            mm1 = fmm.FakeMachineMotion()
            mm2 = fmm.FakeMachineMotion()
            self.Machines.append(mm1)
            self.Machines.append(mm2)

        boxCoordinates = self.pallet_config["boxCoordinates"]
        self.dropCoordinates = []
        self.pickCoordinates = []

        # Somewhat confusingly for now: Max height is really the lowest coordinate value (b/c home is at the top -> positive is down)
        maxHeight = None

        for boxData in boxCoordinates:
            dropLocation = boxData["dropLocation"]
            pickLocation = boxData["pickLocation"]

            h1 = dropLocation["z"]
            h2 = pickLocation["z"]

            if maxHeight == None:
                maxHeight = h1

            maxHeight = h1 if maxHeight == None else maxHeight

            maxHeight = h1 if h1 < maxHeight else maxHeight

            maxHeight = h2 if h2 < maxHeight else maxHeight

            self.dropCoordinates.append(dropLocation)
            self.pickCoordinates.append(pickLocation)

        maxHeight -= MIN_HEIGHT_OFFSET
        if maxHeight >= 0:
            self.z_0 = maxHeight

        print(f"Max Height: {maxHeight}, Z_0 = {self.z_0}")

        for a, gain in gain.items():
            print(a, gain)
            axis = axes[a]
            machine_index = axis["MACHINE"]
            drive_index = axis["DRIVE"]
            self.Machines[machine_index].configAxis(drive_index,
                                                    MICROSTEPS.ustep_8, gain)

        # specify in configuration file.
        for axis, params in axes.items():
            machine_index = params["MACHINE"]
            reverse_bool = params["REVERSE"]
            drive_index = params["DRIVE"]
            machine_direction = mm.DIRECTION.REVERSE if reverse_bool else mm.DIRECTION.NORMAL
            self.Machines[machine_index].configAxisDirection(
                drive_index, machine_direction)

        for i in range(len(self.Machines)):
            #self.Machines[i].emitSpeed(speed)
            #self.Machines[i].emitAcceleration(acceleration)

            self.Machines[i].releaseEstop()
            self.Machines[i].resetSystem()

        self.box_count = len(boxCoordinates)

    def home(self):

        self.home_axis(self.z)
        #      z_machine_index = self.z["MACHINE"]
        vertical_point = {"z": self.z_0}
        print("Moving to vertical point...")
        #self.move_vertical(vertical_point)

        print("Done to vertical")
        #name = input("Pause For Input")

        #sleep(20000)
        #self.move_planar({"x": 0, "y": 0})
        self.home_axis(self.x)
        self.home_axis(self.y)
        #self.home_axis(self.i)
        #self.move_rotation(NINETY_DEG)

        self.move_vertical(vertical_point)
        # self.home_axis(self.i)

    def home_axis(self, axis):
        print("Homing axis ", axis)
        machine_index = axis["MACHINE"]
        self.Machines[machine_index].emitHome(axis["DRIVE"])
        self.Machines[machine_index].waitForMotionCompletion()

    def move_rotation(self, value):
        # Value is boolean
        machine_index = self.i["MACHINE"]
        drive_index = self.i["DRIVE"]
        if value:
            self.Machines[machine_index].emitAbsoluteMove(drive_index, 0)
        else:
            self.Machines[machine_index].emitAbsoluteMove(
                drive_index, NINETY_DEG)

        self.Machines[machine_index].waitForMotionCompletion()

    def move_planar(self, point, isPicking):  # Point is 2D [x,y] coordinate.
        self.move_vertical({"z": self.z_0})

        [x, y] = [point["x"], point["y"]]
        x_machine_index = self.x["MACHINE"]
        x_drive_index = self.x["DRIVE"]
        y_machine_index = self.y["MACHINE"]
        y_drive_index = self.y["DRIVE"]
        i_machine_index = self.i["MACHINE"]
        i_drive_index = self.i["DRIVE"]

        self.Machines[x_machine_index].emitAcceleration(self.highAccel)
        self.Machines[y_machine_index].emitAcceleration(self.highAccel)

        # if isPicking:
        #     if "i" in point:
        #         self.move_rotation(point["i"])
        #     else:
        #         self.move_rotation(False)

        hasAngle = "i" in point
        i_coordinate = NINETY_DEG if (not hasAngle or not point["i"]) else 0

        if x_machine_index == y_machine_index:
            self.Machines[x_machine_index].emitCombinedAxesAbsoluteMove(
                [x_drive_index, y_drive_index], [x, y])
            self.Machines[i_machine_index].emitAbsoluteMove(
                i_drive_index, i_coordinate)
        else:
            if x_machine_index == i_machine_index:
                self.Machines[x_machine_index].emitCombinedAxesAbsoluteMove(
                    [x_drive_index, i_drive_index], [x, i_coordinate])
            else:
                self.Machines[i_machine_index].emitAbsoluteMove(
                    i_drive_index, i_coordinate)

            self.Machines[x_machine_index].emitAbsoluteMove(x_drive_index, x)
            self.Machines[y_machine_index].emitAbsoluteMove(y_drive_index, y)
        # if not isPicking:
        #     if "i" in point:
        #         self.move_rotation(point["i"])
        #     else:
        #         self.move_rotation(False)

        self.Machines[x_machine_index].waitForMotionCompletion()
        self.Machines[y_machine_index].waitForMotionCompletion()
        self.Machines[i_machine_index].waitForMotionCompletion()

    def move_vertical(self, point):  # point is z_coordinate
        z_machine_index = self.z["MACHINE"]
        self.Machines[z_machine_index].emitAcceleration(self.lowAccel)

        self.Machines[z_machine_index].emitAbsoluteMove(
            self.z["DRIVE"], point["z"])
        self.Machines[z_machine_index].waitForMotionCompletion()

    def move_all(self, point, isPicking):
        self.move_planar(point, isPicking)

        self.move_vertical(point)

    def move_to_pick(self, count):
        coordinate = self.pickCoordinates[count]
        print("Moving to Pick Location: ", self.pickCoordinates[count])

        self.move_all(coordinate, True)

    def move_to_drop(self, index):
        coordinate = self.dropCoordinates[index]
        print("Moving to Drop Coordinate", coordinate)
        self.move_planar(coordinate, False)
        self.move_vertical(coordinate)

    def __read_io(self, machine_index, network_id, pin):
        return self.Machines[machine_index].digitalRead(network_id, pin)

    def detect_box(self):
        pin = self.box_detector["PIN"]
        network_id = self.box_detector["NETWORK_ID"]
        machine_index = self.box_detector["MACHINE"]
        pin_value = self.__read_io(machine_index, network_id, pin)
        return pin_value == 1

    def check_for_pick(self):
        pin = self.pressure_input["PIN"]
        network_id = self.pressure_input["NETWORK_ID"]
        machine_index = self.pressure_input["MACHINE"]
        pin_value = self.__read_io(machine_index, network_id, pin)
        return pin_value == 1

    def __write_pressure(self, on):
        print("Writign pressureee")
        pin = self.pressure_ouput["PIN"]
        network_id = self.pressure_ouput["NETWORK_ID"]
        machine_index = self.pressure_ouput["MACHINE"]
        self.Machines[machine_index].digitalWrite(network_id, pin,
                                                  1 if on else 0)

    def start_pressure(self):
        print("STarting pressure")
        self.__write_pressure(True)

    def stop_pressure(self):
        self.__write_pressure(False)


# this should be a function.
class Palletizer(pc.PalletizerControl):
    # Do run link protocols.

    def __init__(self):
        # Intialize state+controls (PalletizerControl)
        print("PRe Init")
        super().__init__()

        print("Starting Palletizer")

        self.start(0)

    def start(self, count):

        self.machine = Machine()

        self.total_box_count = self.machine.box_count
        self.update({
            "status": "Waiting" if self.state["cycle"] == 0 else "Complete",
            "total_box": self.total_box_count,
            "palletConfig": self.machine.pallet_config,
            "time": 0
        })

        self.control_checks(interrupted=True)
        self.increment_cycle()
        self.update({"status": "Running"})

        self.update_information("Status", "Machine starting")
        self.update_information("Status", "Air pressure detected.")
        self.update_information("Status", "System is homing.")

        self.machine.home()
        self.control_checks()
        self.move_to_pick(count)

    def move_to_pick(self, count):
        self.control_checks()
        self.update({
            "current_box": count,
            "time": round((self.total_box_count - count) * 1 / 3)
        })
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
            self.update({"status": "Complete", "time": 0})
            self.update_information(
                "Status", "Cycle has completed. Awaiting pallet change.")
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

    def warning_loop(self,
                     check_fn,
                     warn_string,
                     fail_string,
                     operation=(lambda *args: None),
                     limit=5):
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
    def control_checks(self, interrupted=False):
        # Use walrus operator if python 3.8
        while True:
            sleep(0.3)
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
