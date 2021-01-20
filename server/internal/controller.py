from internal.service import ConfigurationService, RuntimeService
from threading import Thread
from pathlib import Path
import json
import logging

class ConfigurationController:
    def __init__(self):
        self.__configurationService = ConfigurationService()
        self.__logger = logging.getLogger(__name__)

    def createConfiguration(self):
        configurationType = request.query.type
        name = request.query.name
        if self.__configurationService.create(configurationType, name):
            return "OK"
        else:
            abort(400, 'Unable to save configuration: type={}, name={}'.format(configurationType, name))

    def deleteConfiguration(self):
        configurationType = request.query.type
        configurationId = request.query.id

        if self.__configurationService.delete(configurationType, configurationId):
            return "OK"
        else:
            abort(400, 'Unable to delete configuration: type={}, id={}'.format(configurationType, configurationId))

    def listConfigurations(self):
        return { "configurationList": self.__configurationService.listConfigs() }

    def getConfiguration(self):
        configurationType = request.query.type
        configurationId = request.query.id

        (isSuccess, data) = self.__configurationService.getConfiguration(configurationType, configurationId)
        if not isSuccess:
            abort(400, 'Unable to read configuration')
        else:
            return data

    def saveConfiguration(self):
        configurationType = request.query.type
        configurationId = request.query.id
        name = request.query.name
        body = request.json
        if not self.__configurationService.saveConfiguration(configurationType, configurationId, name, body):
            abort(400, 'Unable to save configuration')
        else:
            return 'OK'

    def copyConfiguration(self):
        pass

class RuntimeController:
    def __init__(self, machineApp: 'BaseMachineAppEngine'):
        self.__runService = RuntimeService(machineApp)
        self.__logger = logging.getLogger(__name__)

    def start(self):
        configurationType = request.query.type
        configurationId = request.query.id
        if self.__runService.run(configurationType, configurationId):
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