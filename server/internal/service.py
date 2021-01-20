import os
import logging
from threading import Thread
import time
import json
from machine_app import MachineAppEngine
import math

class ConfigurationService:
    '''
    Handles all configuration IO 
    '''
    def __init__(self):
        self.__dataPath = os.path.join('.', 'data')
        if not os.path.isdir(self.__dataPath):
            os.mkdir(self.__dataPath)

        self.__configurationPath = os.path.join(self.__dataPath, 'configurations')
        if not os.path.isdir(self.__configurationPath):
            os.mkdir(self.__configurationPath)

        self.__logger = logging.getLogger(__name__)

    def create(self, type, name):
        '''
        Creates a new configuration with the specified type and identifier

        params:
            type: str
                Type of configuration
            id: int
                Identifier of the configuration

        returns
            bool
                Created successfully
        '''
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            os.mkdir(typePath)

        identifier = math.trunc(time.time())

        newConfigurationData = {
            "type": type,
            "name": name,
            "creationTimeSeconds": identifier,
            "id": identifier,
            "version": "1.0.0",
            "payload": {}
        }

        fullFilePath = os.path.join(typePath, str(identifier) + '.json')

        with open(fullFilePath, 'w') as f:
            f.write(json.dumps(newConfigurationData, indent=4))

        return True

    def delete(self, type, id):
        '''
        Deletes the configuration specified by the type and identifier

        params:
            type: str
                Type of configuration
            id: int
                Identifier of the configuration

        returns
            bool
                Deleted successfully
        '''
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            os.mkdir(typePath)

        configPath = os.path.join(typePath, id + '.json')
        self.__logger.info('Deleting file at path: {}'.format(configPath))
        if not os.path.exists(configPath):
            return False

        os.remove(configPath)
        return True

    def listConfigs(self):
        '''
        Creates a dictionary that maps configuration type to a list of configuration name/id dictionary

        returns:
            dict(str -> dict(str -> value))
            
        '''
        typeToConfigurationMap = {}

        for typeName in os.listdir(self.__configurationPath):
            typePath = os.path.join(self.__configurationPath, typeName)
            if not os.path.isdir(typePath):
                continue

            typeToConfigurationMap[typeName] = []

            for configName in os.listdir(typePath):
                if not configName.endswith('.json'):
                    self.__logger.error('Unknown configuration file: ' + configName)
                    continue

                configPath = os.path.join(typePath, configName)
                with open(configPath) as f:
                    try:
                        jsonContents = json.loads(f.read())
                        identifier = jsonContents["id"]
                        name = jsonContents["name"]
                        typeToConfigurationMap[typeName].append({ "id": identifier, "name": name })
                    except Exception as e:
                        self.__logger.exception('Failed to read file at path {}, exception: {}'.format(configPath, str(e)))

        return typeToConfigurationMap

    def getConfiguration(self, type, identifier):
        '''
        Given a proper type and identifier, returns  a Tuple containing True
        and the content of the configuration as a python dictionary.

        If we fail to find the configuration, returns (False, None).
        
        params:
            type: str
                Type of configuration
            id: int
                Identifier of the configuration

        returns
            tuple(boolean, dict)
                The first member of the tuple specified whether we successfully
                found the configuration.
                
                The second parameter of the tuple is the fully loaded configuration 
                file as a dictionary if we were able to find it, otherwise None.        
        '''
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

    def saveConfiguration(self, type, identifier, name, payload):
        '''
        Saves an existing configuration given the type, identifier, name, and a dictionary payload.

        params:
            type: str
                Type of configuration
            identifier: int
                Identifier of the configuration
            name: str
                New name of the configuration
            payload: dict
                New content of the configuration

        returns:
            boolean
                Whether or not the save was successful
        '''
        typePath = os.path.join(self.__configurationPath, type)
        if not os.path.isdir(typePath):
            self.__logger.error('Type path not defined')
            return False

        fullFilePath = os.path.join(typePath, identifier + '.json')
        if not os.path.exists(fullFilePath):
            self.__logger.error('File does not exist')
            return False

        try:
            with open(fullFilePath, 'r') as f:
                existingContent = json.loads(f.read())
            
            existingContent["name"] = name
            existingContent["payload"] = payload
            existingContent["lastUpdateTimeSeconds"] = math.trunc(time.time())
            with open(fullFilePath, 'w') as f:
                f.write(json.dumps(existingContent, indent=4))
                return True
                
        except Exception as e:
            self.__logger.exception('Failed to read file at path {}, exception: {}'.format(fullFilePath, str(e)))
            return False

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

    def run(self, configurationType, configurationId):
        if self.__requestRunMachineApp:
            self.__logger.error('Cannot run start machine running while it is already set to start running')
            return False

        if self.__machineApp == None:
            self.__logger.error('MachineApp not initialized properly')
            return False

        configurationService = ConfigurationService()        # Used to load configurations from disk
        (foundConfiguration, configuration) = configurationService.getConfiguration(configurationType, configurationId)
        if not foundConfiguration:
            self.__logger.error('Failed to find the configuration, type: {}, id: {}'.format(configurationType, configurationId))
            return False

        self.__logger.info('Loaded configuration. type={}, name={}, id={}'.format(configurationType, configuration["name"], configuration["id"]))
        self.__machineApp.setConfiguration(configuration)
        self.__requestRunMachineApp = True
        return True

    def pause(self):
        if self.machineApp != None:
            self.machineApp.pause()
            return True

        return False

    def resume(self):
        if self.machineApp != None:
            self.machineApp.resume()
            return True

        return False

    def stop(self):
        if self.machineApp != None:
            self.machineApp.stop()
            return True

        return False
