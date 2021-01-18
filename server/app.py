import logging
from logging.handlers import RotatingFileHandler
from bottle import Bottle, request, response, abort, static_file
import os
from threading import Thread
import time
from pathlib import Path
import json

class ConfigurationService:
    '''
    Handles all configuration IO 
    '''
    def __init__(self):
        self.__dataPath = os.path.join('.', 'data')
        self.__configurationPath = os.path.join(self.__dataPath, 'configurations')

    def create(self, type, name):
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            os.mkdir(typePath)

        identifier = time.time()

        newConfigurationData = {
            "type": type,
            "name": name,
            "creationTimeSeconds": time.time(),
            "id": identifier,
            "payload": {}
        }

        fullFilePath = os.path.join(typePath, str(identifier))

        with open(fullFilePath, 'w') as f:
            f.write(json.dumps(newConfigurationData, indent=4))

        return True

    def delete(self, type, id):
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            os.mkdir(typePath)

        configPath = os.path.join(typePath, id + '.json')
        if not os.path.exists(configPath):
            return False

        os.remove(configPath)
        return True

    def listConfigs(self, type):
        retval = []
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            os.mkdir(typePath)

        for filename in os.listdir(typePath):
            if not filename.endswith('.json'):
                self.__logger.error('Unknown configuration file: ' + filename)
                continue

            fullFilePath = os.path.join(typePath, filename)
            with open(fullFilePath) as f:
                try:
                    jsonContents = json.loads(f.read())
                    identifier = jsonContents["id"]
                    name = jsonContents["name"]
                    retval.append({
                        "id": identifier,
                        "name": name
                    })
                except Exception as e:
                    self.__logger.exception('Failed to read file at path {}, exception: {}'.format(fullFilePath, str(e)))

        return retval

    def getConfiguration(self, type, identifier):
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            return (False, None)

        fullFilePath = os.path.join(typePath, identifier + '.json')
        if not os.path.exists(fullFilePath):
            return (False, None)

        f = open(fullFilePath, 'r')

        try:
            return (True, json.loads(f.read()))
        except Exception as e:
            self.__logger.exception('Failed to read file at path {}, exception: {}'.format(fullFilePath, str(e)))
            return (False, None)

    def saveConfiguration(self, type, identifier, payload):
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            return Fals

        fullFilePath = os.path.join(typePath, identifier + '.json')
        if not os.path.exists(fullFilePath):
            return False

        try:
            with open(fullFilePath, 'r') as f:
                existingContent = json.loads(f.read())
            
            existingContent["payload"] = payload
            with open(fullFilePath, 'w') as f:
                f.write(json.dumps(existingContent))
                return False
                
        except Exception as e:
            self.__logger.exception('Failed to read file at path {}, exception: {}'.format(fullFilePath, str(e)))
            return True


class RestServer(Bottle):
    '''
    RESTful server that handles control of the MachineApp and configuration IO
    '''
    def __init__(self):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__logger = logging.getLogger(__name__)
        self.__configurationService = ConfigurationService()

        self.route('/', callback=self.index)
        self.route('/<filepath:path>', callback=self.serveStatic)

        self.route('/configuration/create', method='POST', callback=self.createConfiguration)
        self.route('/configuration/delete', method='DELETE', callback=self.deleteConfiguration)
        self.route('/configuration/list', callback=self.listConfigurations)
        self.route('/configuration', callback=self.getConfiguration)
        self.route('/configuration/save', method='POST', callback=self.saveConfiguration)

    def index(self):
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

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
        return { "configurationList": self.listConfigurations() }

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
        body = request.json()
        if not self.__configurationService.saveConfiguration(configurationType, configurationId, body):
            abort(400, 'Unable to save configuration')
        else:
            return 'OK'

    def copyConfiguration(self):
        pass

class MachineAppLoop:
    '''
    Primary loop of the MachineApp. The user will spend the majority of
    their time writing code in this thread.
    '''
    def __init__(self):
        self.__thread = Thread(target=self.__runInternal, name="MachineAppLoop")
        self.__thread.daemon = True

    def run(self):
        self.__thread.start()

    def __runInternal(self):
        while True:
            time.sleep(0.16)

def run():
    machineAppLoop = MachineAppLoop()
    restServer = RestServer()
    machineAppLoop.run()
    restServer.run(host='localhost', port=3011)

if __name__ == "__main__":
    logging.basicConfig(
        format='%(asctime)s {%(name)s:%(lineno)d} (%(levelname)s) - %(message)s',
        level=logging.DEBUG,
        handlers=[
            RotatingFileHandler('machine_app.log', mode='a', maxBytes=5*1024*1024,  backupCount=2, encoding=None, delay=0),
            logging.StreamHandler()
        ]
    )

    run()