import logging
from threading import Thread
import time
from machine_app import MachineAppEngine

class RuntimeService:
    '''
    Handles stateful requests to and form the main MachineApp update loop
    '''
    def __init__(self, machineApp: 'BaseMachineAppEngine'):
        self.__requestRunMachineApp = False             # If set to True, we will start the MachineApp's loop
        self.__logger = logging.getLogger(__name__)
        self.__machineApp = machineApp                   # MachineApp that is currently being run

        self.__machineAppThread = Thread(target=self.__primaryThreadLoop, name="MachineAppUpdate", daemon=True)
        self.__machineAppThread.start()
        
    def __primaryThreadLoop(self):
        '''
        Internal loop running on it's own thread. When a user requests for a MachineApp to
        start running, the loop handles all control to the MachineAppEngine for the duration
        of the program. Once that program finishes, it returns control to the loop below until
        another 'run' request arrives.
        '''
        while True:
            if self.__requestRunMachineApp:
                self.__machineApp.loop()
                self.__requestRunMachineApp = False

            time.sleep(0.5)

    def run(self, configuration):
        if self.__requestRunMachineApp:
            self.__logger.error('Cannot run start machine running while it is already set to start running')
            return False

        if self.__machineApp == None:
            self.__logger.error('MachineApp not initialized properly')
            return False

        self.__machineApp.setConfiguration(configuration)
        self.__requestRunMachineApp = True
        return True

    def pause(self):
        if self.__machineApp != None:
            self.__machineApp.pause()
            return True

        return False

    def resume(self):
        if self.__machineApp != None:
            self.__machineApp.resume()
            return True

        return False

    def stop(self):
        if self.__machineApp != None:
            self.__machineApp.stop()
            return True

        return False

    def estop(self):
        if self.__machineApp != None:
            self.__machineApp.estop()
            return True

        return False