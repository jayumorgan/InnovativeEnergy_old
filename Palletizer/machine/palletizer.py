#!/usr/bin/env python3

import sys
import json
import random
from threading import Thread
import logging
from time import sleep

# MQTT relay.
# from mqtt_relay import MQTTRelay
from mqtt_relay import state_controller


# Demo data functions.
from demo_data import  get_demo_pickups, get_demo_centroids 


# Setup proper logging.
logging.basicConfig(level=logging.DEBUG,format='(%(threadName)-9s) %(message)s',)

MACHINE_CONFIG = None
PALLET_CONFIG = None

# Load configurations. -- path.
with open('./config/machine.json') as config:
    data = json.load(config)
    MACHINE_CONFIG = data

with open('./config/pallet.json') as config:
    data = json.load(config)
    PALLET_CONFIG = data

# Import Machine Motion.
print("Import MachineMotion in production...")
# sys.path.append("./mm-vention-control")
# from MachineMotion import *

## ----------------------------------

# mm = MachineMotion("192.168.7.2", None)
# mm.setContinuousMove(CONVEYOR_AXIS, 100, 50)
class FakeMachineMotion:
    def __init__(self, *args):
        self.args = args

    def configAxis(self, axis, uStep, mechGain):
        pass

    def releaseEstop(self):
        pass

    def resetSystem(self):
        pass

    def emitSpeed(self, speed):
        pass

    def emitAcceleration(self, accel):
        pass

    def waitForMotionCompletion(self):
        sleep(1)
        logging.debug("Wait for motion completion...")
        
    def emitStop(self):
        print("Please Stop...")

    def configMachineMotionIp(self, mode, ip, gateway, mask):
        print(mode, ip, gateway, mask)

    def emitAbsoluteMove(self, axis, position):
        print("Moving axis:{axis} to {position}")
        sleep(1)

    def emitCombinedAxesAbsoluteMove(self, axes, positions):
        print("Moving axes:{axes} to {positions}")
        sleep(1)
        
    def digitalWrite(self, deviceNetworkId, pin, value):
        print("Writing to (pin,networkID) ",pin, deviceNetworkId, " value ", value)
        sleep(1)

        
# Palletizer ----------------
def silence(data):
    pass

class Palletizer:
    def __init__(self, machine_json, pallet_json):
        print(machine_json)
        print(pallet_json)
        # Gcode callback.
        callback = None
        #logging.debug("Controller GCode response: {data}")

        # This is the state used to populate the General page on UI

        # new state_controller (setup with defauly machine motion state)
        self.state_controller = state_controller.StateController(True)
    
        
        self.mm = FakeMachineMotion("Some IP address")
        # self.mm = MachineMotion(DEFAULT_IP_ADDRESS.usb_windows, silence)
        # self.rotation_mm = MachineMotion(self.rotation_mm, silence)
        self.rotationMMIP = "192.168.1.6"
        self.rotation_mm = FakeMachineMotion(self.rotationMMIP, silence)

        # publish events for the client..
        # self.mqtt_pub = MQTTRelay.MQTTPublisher()
    
        # sleep(3) # Wait for the Machine Motions to boot up..
        print("Sleep in prod.")

        # MACHINE configuration ------------------------------
        
        axes_config = machine_json['AXES_CONFIG']
        pick_config = machine_json['PICK_CONFIG']
        detector_config = machine_json['DETECTOR_CONFIG']
        network_config = machine_json['NETWORK_CONFIG']

        # Provides a map between coordinates and axes.
        self.axes = axes_config['AXES_DIRECTIONS']

        self.x = self.axes['x']
        self.y = self.axes['y']
        self.z = self.axes['z']
        # assume the top of z is zero.
        self.home_x = 0
        self.home_y = 0
        self.home_z = 0
        
        self.axes_travel = axes_config["AXES_TRAVEL"]
        axes_gains = axes_config['AXES_GAINS']

        # uStep
        # uStep = MICRO_STEPS.ustep_8
        print("Set micro steps on machine..")
        uStep = 8

        # Configure the axes within Machine Motion
        for axis, gain in axes_gains.items():
            axis_number = self.axes[axis]
            self.mm.configAxis(axis_number,uStep,gain)
        
        # Setup the IO modules (mm.detectIOmodules())
        self.box_module_address = detector_config['BOX_MODULE_ADDRESS']
        self.box_input_channel = detector_config['BOX_INPUT_CHANNEL']
        self.pallet_module_address = detector_config['PALLET_MODULE_ADDRESS']
        self.pallet_input_channel = detector_config['PALLET_INPUT_CHANNEL']
        self.pressure_module_address = detector_config['PRESSURE_MODULE_ADDRESS']
        self.pressure_input_channel = detector_config['PRESSURE_INPUT_CHANNEL']

        #Network Configuration
        self.controller_ip = network_config["CONTROLLER_IP_ADDRESS"]
        self.controller_gateway = network_config["CONTROLLER_GATEWAY"]
        self.controller_netmask = network_config["CONTROLLER_NETMASK"]

        if False: # ignore for now.
            mode = NETWORK_MODE.static
            self.mm.configMachineMotionIp(mode,
                                        self.controller_ip,
                                        self.controller_gateway,
                                        self.controller_netmask)
        
        self.pick_origin = pick_config["PICK_ORIGIN"]
        # Read axes from here, or assume "z"?
        self.lift_clearance = pick_config["LIFT_CLEARANCE"]
        self.pallet_origin = pick_config["PALLET_ORIGIN"]
        
        # PALLET configuration ---------------------------

        pallet_config = pallet_json['PALLET_CONFIG']
        operating_params = pallet_json['OPERATING_PARAMETERS']
        
        # Speed + Acceleration Setup
        travel_config = operating_params['TRAVEL']
        approach_config = operating_params["APPROACH"]
        
        self.mm.emitSpeed(travel_config['SPEED'])
        self.mm.emitAcceleration(travel_config['ACCELERATION'])
        
        self.layer_centroids = pallet_config['LAYER_CENTROIDS']
        self.box_orientation = pallet_config['BOX_ORIENTATION']
        self.pallet_size = pallet_config['PALLET_SIZE']
        self.box_dimensions = pallet_config['BOX_DIMENSIONS']

        # -----------Demonstration Data ----------------
        self.layer_centroids = get_demo_centroids()
        self.layer_pickups = get_demo_pickups()
            
        print(self.layer_centroids)
        # Set the total box number to the number of centroids
        self.state_controller.update("total_box", len(self.layer_centroids))
            
        self.box_height = self.box_dimensions["z"]

        # The current layer index. 
        self.layer_index = 0
        # Prepare.
        self.mm.releaseEstop()
        self.mm.resetSystem()

        # Status Checks.
        self.health_check()
        self.hardware_check()

        # Init thread variables.
        self.monitor_thread = None

        # State Variables
        self.interrupt = False
        self.motion_index = 0 # Location in motion_queue
        self.box_index = 0 # box number for centroids + height computation.
        # self.motion_completed = False # Motion is complete

        self.motion_queue = [
            self.move_to_pick_point, #move above pick point (z_pp_clear)
            self.check_for_box, #check/wait for box presence
            self.move_down_to_pick, # move down to pick
            self.pick, # pick
            self.check_pick_pressure, #check pick quality
            self.lift_pick, #move up (ensure clearance)
            self.move_to_drop,
            self.move_down_to_drop,
            self.check_encoder_position, #check oritentation + position
            self.drop,
            self.move_up_from_box_stack, # clear the box stack.
        ]


        # Await start signal.
        self.await_start()

    # Motion sequences:
    def move_to_pick_point(self):
        logging.debug("Moving to pick point...")
        # self.pick_origin = pick_config["PICK_ORIGIN"]
        pick_point = self.layer_pickups[self.layer_index]
        xy_coords = [pick_point["x"], pick_point["y"]]
        # xy_coords = [self.pick_origin["x"], self.pick_origin["y"]]
        xy_axes = [self.x, self.y]
        self.mm.emitCombinedAxesAbsoluteMove(xy_axes, xy_coords)

    def move_down_to_pick(self):
        logging.debug("Move down to pick...")
        z_coord = self.pick_origin["z"]
        self.mm.emitAbsoluteMove(self.z, z_coord)

    def pick(self):
        # Turn on suction.
        logging.debug("Picking...")
        # Turn on the digital input
        self.mm.digitalWrite(
            self.pressure_module_address,
            self.pressure_input_channel,
            1)

    def lift_pick(self):
        logging.debug("Lifting pickup")
        self.mm.emitAbsoluteMove(self.z, self.home_z)

    def move_to_drop(self):
        # pallet origin is x_y coordinates:
        logging.debug("Moving to drop location...")
        axes = [self.x, self.y]
        centroid = self.layer_centroids[self.layer_index]
        coords = [centroid['x'], centroid['y']]
        self.mm.emitCombinedAxesAbsoluteMove(axes, coords)

    def move_down_to_drop(self):
        logging.debug("Moving down to drop...")
        centroid = self.layer_centroids[self.layer_index]
        self.mm.emitAbsoluteMove(self.z, centroid['z'])

    def drop(self):
        logging.debug("Dropping... (check to make sure that drop is complete.)")
        self.mm.digitalWrite(
            self.pressure_module_address,
            self.pressure_input_channel,
            0)
        
    def move_up_from_box_stack(self):
        logging.debug("Moving up from box stack...")
        self.mm.emitAbsoluteMove(self.z, self.home_z)

    def move_to_idle_point(self):
        # move the z axis up.
        z_axis = self.axes["z"]
        self.mm.emitAbsoluteMove(self.z, self.home_z) # move to the top
        self.wait_for_motion()

        # move the axes back to position.
        (x_axis, y_axis) = (self.axes["x"], self.axes["y"])
        self.mm.emitCombinedAxesAbsoluteMove([x_axis, y_axis], [self.home_x,self.home_y])
        # Move z, then (x,y)
        logging.debug("Move to the idle point...")
        
    # Motion checks
    def check_for_box(self): # or wait for it.
        # Digital read
        logging.debug("Checking for box...")
        pass

    def check_pick_pressure(self):
        # digital read
        logging.debug("Checking pick pressure...")
        pass

    def check_encoder_position(self): #make sure we are in the right place
        #digital
        logging.debug("Checking encoder position...")
        pass
    
    # Hardware + System Checks
    
    def hardware_check(self):
        pass

    def health_check(self):
        pass

    def check_pallet(self):
        # Check for pallet presence...
        pass

    # User signal monitoring functions.
    def check_for_start(self):
        ## If a start signal.
        ## Prompt for start as a demo.
        ## If python2, use raw_input
        pr = input("Start machine motion? (y/n): ")
        return pr == "y"
        # return random.random() > 0.99999

    def check_for_interrupt(self):
        # True for interrupt -- handle (pause / stop)
        sleep(1)
        return False

    # Signal monitoring functions:
    def check_pressure_pick(self):
        
        pass

    def home(self):
        # move the axis up all the way, and and then home the other axes.
        logging.debug("Homing the machine.")
        self.move_to_idle_point()
        
    # System Progress + Signal Processing Loops
    
    def await_start(self):
        # Blocks the main thread until start signal is received.
        while True:
            if self.check_for_start():
                print("Start Signal Received...")
                self.state_controller.update("status", "Running")
                self.state_controller.update("current_box", self.layer_index + 1)
                break
        # Check pallet presence -- may need to be moved into a health check loop
        self.check_pallet()
        # Home all controls.
        self.home()
        # Begin motion loop.
        self.motion_loop()


    def monitor_loop(self):
        while not self.check_for_interrupt():
            sleep(1)
            
        #Set interrupt state.
        self.interrupt = True
        #stop the machine.
        self.mm.emitStop()
        # Join threads.
        self.monitor_thread.join()
        
    def monitor_interupt(self):
        monitor_thread = Thread(target=self.monitor_loop)
        monitor_thread.start()
        

    def motion_loop(self):
        # Start monitoring for Pause/Stop.
        self.monitor_interupt()
        while not self.interrupt and self.layer_index < len(self.layer_centroids):
            # Execute the next operation.
            self.next_operation()
            # Increment the motion index.
            
            
            self.motion_index = (self.motion_index + 1)%len(self.motion_queue)
            self.state_controller.update("cycle", self.motion_index)
            if self.motion_index == 0:
                # increment the box number
                self.layer_index += 1
                # Haha.
                if self.layer_index < len(self.layer_centroids):
                    self.state_controller.update("current_box", self.layer_index + 1)
                else:
                    self.state_controller.update("status", "Complete")

    # Calls operations in the motion queue.
    def next_operation(self):
        # get the next operation.
        operation = self.motion_queue[self.motion_index]
        self.motion_completed = False
        # Call the operation.
        operation()
        #Wait here -- (will do nothin for IO)
        # self.mm.waitForMotionCompletion()
        self.wait_for_motion()
            # Execute next instruction.

    # Wait for motion sequence to complete.
    def wait_for_motion(self):
        self.mm.waitForMotionCompletion()


if __name__ == "__main__":
    Palletizer(MACHINE_CONFIG, PALLET_CONFIG)
    # print("Palletizer Running")
    # 

# Call Palletizer.mm.myMqttClient.loop_stop() to prevent error at the end.
# 
