from internal.service import RuntimeService
from threading import Thread
from pathlib import Path
import json
import logging
from bottle import  request, response, abort


class RuntimeController:
    def __init__(self, machineApp: 'BaseMachineAppEngine'):
        self.__runService = RuntimeService(machineApp)
        self.__logger = logging.getLogger(__name__)

    def start(self):
        configuration = request.json
        if self.__runService.run(configuration):
            return 'OK'
        else:
            abort(400, 'Unable to start the MachineApp')

    def stop(self):
        if self.__runService.stop():
            return 'OK'
        else:
            abort(400, 'Failed to stop the MachineApp')

    def pause(self):
        if self.__runService.pause():
            return 'OK'
        else:
            abort(400, 'Failed to pause the MachineApp')

    def resume(self):
        if self.__runService.resume():
            return 'OK'
        else:
            abort(400, 'Failed to resume the MachineApp')

    def estop(self):
        if self.__runService.estop():
            return 'OK'
        else:
            abort(400, 'Failed to estop the MachineApp')

    def getEstop(self):
        return self.__runService.getEstop()

    def releaseEstop(self):
        if self.__runService.releaseEstop():
            return 'OK'
        else:
            abort(400, 'Failed to release estop')

    def resetSystem(self):
        if self.__runService.resetSystem():
            return 'OK'
        else:
            abort(400, 'Failed to reset the system')

    