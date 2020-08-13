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


class Machine:
    def __init__(self):
        config = cf.load_selected_config()
        self.pallet_config = config["pallet"]
        print(self.pallet_config)

        self.machine_config = config["machine"]
        cf.output(config)

        axes = self.machine_config["AXES"]

        self.x = axes["x"]
        self.x_0 = 0

        self.y = axes["y"]
        self.y_0 = 0

        self.z = axes["z"]
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
        print(f"Running Production Environment: {deploy}")
        #  deploy = True
        self.Machines = []

        if deploy:
            mm1 = mm.MachineMotion(machine1["IP_ADDRESS"])
            mm2 = mm.MachineMotion(machine2["IP_ADDRESS"])
            self.Machines.append(mm1)
            self.Machines.append(mm2)
        else:
            mm1 = fmm.FakeMachineMotion()
            mm2 = fmm.FakeMachineMotion()
            self.Machines.append(mm1)
            self.Machines.append(mm2)

        boxCoordinates = self.pallet_config["boxCoordinates"]
        self.dropCoodinates = []
        self.pickCoordinates = []

        for boxData in boxCoordinates:
            self.dropCoodinates.append(boxData["dropLocation"])
            self.pickCoordinates.append(boxData["pickLocation"])

        for m in self.Machines:
            m.emitSpeed(speed)
            m.emitAcceleration(acceleration)

        for a, gain in gain.items():
            axis = axes[a]
            machine_index = axis["MACHINE"]
            drive_index = axis["DRIVE"]
            self.Machines[machine_index].configAxis(drive_index,
                                                    MICROSTEPS.ustep_8, gain)

        # specify in configuration file.
        for axis, params in axes.items():
            machine_index = axis["MACHINE"]
            reverse_bool = axis["REVERSE"]
            machine_direction = mm.DIRECTION.REVERSE if reverse_bool else mm.DIRECTION.NORMAL
            self.Machines[machine_index].configAxisDirection(machine_direction)

        for m in self.Machines:
            m.releaseEstop()
            m.resetSystem()

        self.box_count = len(boxCoordinates)

    def home(self):
        z_machine_index = self.z["MACHINE"]
        vertical_point = {"z": self.z_0}
        self.move_vertical(vertical_point)
        self.home_axis(self.x)
        self.home_axis(self.y)

        self.home_axis(self.z)
        self.move_vertical(vertical_point)
        self.home_axis(self.i)

    def home_axis(self, axis):
        machine_index = axis["MACHINE"]
        machine = self.Machines[machine_index]
        machine.emitHome(axis["DRIVE"])
        machine.waitForMotionCompletion()

    def move_rotation(self, value):
        machine_index = self.i["MACHINE"]
        drive_index = self.i["DRIVE"]
        machine = self.Machines[machine_index]
        machine.emitAbsoluteMove(drive_index, value)
        machine.waitForMotionCompletion()

    def move_planar(self, point):  # Point is 2D [x,y] coordinate.
        self.move_vertical({"z": self.z_0})
        if "i" in point:
            self.move_rotation(point["i"])
        [x, y] = [point["x"], point["y"]]
        x_machine_index = self.x["MACHINE"]
        x_drive_index = self.x["DRIVE"]
        x_machine = self.Machines[x_machine_index]
        y_machine_index = self.y["MACHINE"]
        y_drive_index = self.y["DRIVE"]
        y_machine = self.Machines[y_machine_index]
        if x_machine_index == y_machine_index:
            x_machine.emitCombinedAxesAbsoluteMove(
                [x_drive_index, y_drive_index], [x, y])
        else:
            x_machine.emitAbsoluteMove(x_drive_index, x)
            y_machine_index.emitAbsoluteMove(y_drive_index, y)

        x_machine.waitForMotionCompletion()
        y_machine.waitForMotionCompletion()

    def move_vertical(self, point):  # point is z_coordinate
        z_machine_index = self.z["MACHINE"]
        machine = self.Machines[z_machine_index]
        machine.emitAbsoluteMove(self.z["DRIVE"], point["z"])
        machine.waitForMotionCompletion()

    def move_all(self, point):
        self.move_planar(point)
        self.move_vertical(point)

    def move_to_pick(self, count):
        coordinate = self.pickCoordinates[count]
        self.move_all(coordinate)

    def move_to_drop(self, index):
        coordinate = self.dropCoodinates[index]
        self.move_planar(coordinate)
        self.move_vertical(coordinate)

    def __read_io(self, machine_index, network_id, pin):
        machine = self.Machines[machine_index]
        return machine.digitalRead(network_id, pin)

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
        pin = self.pressure_ouput["PIN"]
        network_id = self.pressure_ouput["NETWORK_ID"]
        machine_index = self.pressure_ouput["MACHINE"]
        self.Machines[machine_index].digitalWrite(network_id, pin,
                                                  1 if on else 0)

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

    def start(self, count):
        # Setup the machine. (load configuration)

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
