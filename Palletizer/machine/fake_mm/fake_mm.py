#!/usr/bin/env python3

from time import sleep

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
        sleep(0.5)
        logging.debug("Wait for motion completion...")
        
    def emitStop(self):
        print("Please Stop...")

    def configMachineMotionIp(self, mode, ip, gateway, mask):
        print(mode, ip, gateway, mask)

    def emitAbsoluteMove(self, axis, position):
        print("Moving axis:{axis} to {position}")

    def emitCombinedAxesAbsoluteMove(self, axes, positions):
        print("Moving axes:{axes} to {positions}")
        
    def digitalWrite(self, deviceNetworkId, pin, value):
        print("Writing to (pin,networkID) ",pin, deviceNetworkId, " value ", value)
