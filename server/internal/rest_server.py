import logging
from bottle import Bottle, request, response, abort, static_file
import os
import time
from threading import Thread
from pathlib import Path
import json
from machine_app import MachineAppEngine

class RestServer(Bottle):
    '''
    RESTful server that handles control of the MachineApp and configuration IO
    '''
    def __init__(self, machineApp: 'BaseMachineAppEngine'):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__logger = logging.getLogger(__name__)

        # Set up callbacks
        self.route('/', callback=self.index)
        self.route('/ping', callback=self.ping)
        self.route('/<filepath:path>', callback=self.serveStatic)
        self.route('/run/start', method='POST', callback=self.start)
        self.route('/run/stop', method='POST', callback=self.stop)
        self.route('/run/pause', method='POST', callback=self.pause)
        self.route('/run/resume', method='POST', callback=self.resume)
        self.route('/run/estop', method='POST', callback=self.estop)
        self.route('/run/estop', method='GET', callback=self.getEstop)
        self.route('/run/releaseEstop', method='POST', callback=self.releaseEstop)
        self.route('/run/resetSystem', method='POST', callback=self.resetSystem)
        self.route('/run/state', method='GET', callback=self.getState)

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
        self.__machineApp.loop()

    def ping(self):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'
        return 'pong'

    def index(self):
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

    def start(self):
        configuration = request.json
        if self.__machineApp == None:
            self.__logger.error('MachineApp not initialized properly')
            abort(400, 'MachineApp uninitialize')
            return

        if self.__machineApp.isRunning:
            abort(400, 'MachineApp is already running')
            return False

        self.__machineApp.start(configuration)
        return 'OK'

    def stop(self):
        if self.__machineApp != None:
            self.__machineApp.stop()
            return 'OK'
        else:
            abort(400, 'Failed to stop the MachineApp')

    def pause(self):
        if self.__machineApp != None:
            self.__machineApp.pause()
            return 'OK'
        else:
            abort(400, 'Failed to pause the MachineApp')

    def resume(self):
        if self.__machineApp != None:
            self.__machineApp.resume()
            return 'OK'
        else:
            abort(400, 'Failed to resume the MachineApp')

    def estop(self):
        if self.__machineApp != None:
            self.__machineApp.estop()
            return 'OK'
        else:
            abort(400, 'Failed to estop the MachineApp')

    def getEstop(self):
        if self.__machineApp.getEstop():
            return 'true'
        else:
            return 'false'

    def releaseEstop(self):
        if self.__machineApp.releaseEstop():
            return 'OK'
        else:
            abort(400, 'Failed to release estop')

    def resetSystem(self):
        if self.__machineApp.resetSystem():
            return 'OK'
        else:
            abort(400, 'Failed to reset the system')

    def getState(self):
        return {
            "isRunning": self.__machineApp.isRunning,
            "isPaused": self.__machineApp.isPaused
        }

def runServer(machineApp: 'BaseMachineAppEngine'):
    restServer = RestServer(machineApp)
    restServer.run(host='localhost', port=3011)