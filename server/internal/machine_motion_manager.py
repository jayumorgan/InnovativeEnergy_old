from internal.fake_machine_motion import MachineMotion
import logging

class MachineMotionManager:
    '''
    Provides the user with a way to set and get machine motions by name,
    as well as a way to send the same commands to multiple machine motions.
    '''
    def __init__(self):
        self.__machineMotionDict = {}
        self.__masterMachineMotion = None
        self.__logger = logging.getLogger(__name__)

    def register(self, name: str, machineMotion: MachineMotion, isMaster: bool = False):
        '''
        Register a machine motion for use during your program

        params:
            name: str
                name of your machine motion that you can use to retrieve it with later

            machineMotion: MachineMotion
                instance of MachineMotion.py

            isMaster: bool
                specifies whether or not this is the master machine motion
        '''
        self.__machineMotionDict[name] = machineMotion
        if isMaster:
            self.__masterMachineMotion = name

    def get(self, name: str):
        '''
        Retrieves the machine motion by name. Returns None if we can't find it.

        params:
            name: str
                name of your machine motion

        returns:
            MachineMorion or None
        '''
        if not name in self.__machineMotionDict:
            self.__logger.error('Could not find machine motion: {}'.format(name))
            return None

        return self.__machineMotionDict[name]

    def generator(self):
        for name, machineMotion in self.__machineMotionDict.items():
            yield machineMotion

    def __hasMaster(self):
        return self.__masterMachineMotion != None and self.__masterMachineMotion in self.__machineMotionDict

    def triggerEstop(self):
        if not self.__hasMaster():
            for machineMotion in self.generator():
                machineMotion.triggerEstop()
        else:
            self.__machineMotionDict[self.__masterMachineMotion].triggerEstop()

    def releaseEstop(self):
        if not self.__hasMaster():
            for machineMotion in self.generator():
                machineMotion.releaseEstop()
        else:
            self.__machineMotionDict[self.__masterMachineMotion].releaseEstop()

    def resetSystem(self):
        if not self.__hasMaster():
            for machineMotion in self.generator():
                machineMotion.resetSystem()
        else:
            self.__machineMotionDict[self.__masterMachineMotion].resetSystem()

