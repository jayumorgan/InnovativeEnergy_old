import logging
from logging.handlers import RotatingFileHandler
from bottle import Bottle, request, response, abort, static_file
import os
from threading import Thread
import time
from pathlib import Path
import json
import math
from service import ConfigurationService, RuntimeService
from notifier import initializeNotifier

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
    def __init__(self):
        self.__runService = RuntimeService()
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

    
class RestServer(Bottle):
    '''
    RESTful server that handles control of the MachineApp and configuration IO
    '''
    def __init__(self):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__logger = logging.getLogger(__name__)
        self.__configurationController = ConfigurationController()
        self.__runtimeController = RuntimeController()

        self.route('/', callback=self.index)
        self.route('/<filepath:path>', callback=self.serveStatic)

        self.route('/configuration/create', method='POST', callback=self.__configurationController.createConfiguration)
        self.route('/configuration/delete', method='DELETE', callback=self.__configurationController.deleteConfiguration)
        self.route('/configuration/list', callback=self.__configurationController.listConfigurations)
        self.route('/configuration', callback=self.__configurationController.getConfiguration)
        self.route('/configuration/save', method='POST', callback=self.__configurationController.saveConfiguration)

        self.route('/run/start', method='POST', callback=self.__runtimeController.start)
        self.route('/run/stop', method='POST', callback=self.__runtimeController.stop)
        self.route('/run/pause', method='POST', callback=self.__runtimeController.pause)
        self.route('/run/resume', method='POST', callback=self.__runtimeController.resume)

    def index(self):
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

def run():
    initializeNotifier()
    restServer = RestServer()
    restServer.run(host='localhost', port=3011)

if __name__ == "__main__":
    logging.basicConfig(
        format='%(asctime)s {%(name)s:%(lineno)d} (%(levelname)s) - %(message)s',
        level=logging.INFO,
        handlers=[
            RotatingFileHandler('machine_app.log', mode='a', maxBytes=5*1024*1024,  backupCount=2, encoding=None, delay=0),
            logging.StreamHandler()
        ]
    )

    run()