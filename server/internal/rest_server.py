import logging
from bottle import Bottle, request, response, abort, static_file
import os
import time
from threading import Thread
from pathlib import Path
import json
from internal.machine_app_subprocess import MachineAppSubprocess
from internal.notifier import getNotifier, NotificationLevel
import signal

class RestServer(Bottle):
    '''
    RESTful server that handles control of the MachineApp and configuration IO
    '''
    def __init__(self):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__serverDirectory = os.path.join('.')
        self.__logger = logging.getLogger(__name__)
        self.__subprocess = MachineAppSubprocess()
        self.isRunning = False # TODO: Correctly update these
        self.isPaused = False

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

        self.route('/kill', method='GET', callback=self.kill)
        self.route('/logs', method='GET', callback=self.getLog)
        
    def ping(self):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'
        return 'pong'

    def index(self):
        self.__logger.info('Handling index file request')
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

    def getLog(self):
        return static_file('machine_app.log', root=self.__serverDirectory)

    def start(self):
        inStateStepperMode = (request.params['stateStepperMode'] == 'true') if 'stateStepperMode' in request.params else False
        configuration = request.json
        
        self.__subprocess.start(inStateStepperMode, configuration)
        return 'OK'

    def stop(self):
        if self.__subprocess.writeToSubprocess({ 'request': 'stop' }):
            return 'OK'
        else:
            abort(400, 'Failed to stop the MachineApp')

    def pause(self):
        if self.__subprocess.writeToSubprocess({ 'request': 'pause' }):
            return 'OK'
        else:
            abort(400, 'Failed to pause the MachineApp')

    def resume(self):
        if self.__subprocess.writeToSubprocess({ 'request': 'resume' }):
            return 'OK'
        else:
            abort(400, 'Failed to resume the MachineApp')

    # TODO: All E-Stop functionality should be handles on this process
    def estop(self):
        #if self.__subprocess.writeToSubprocess({ 'request': 'estop' }):
            #self.__machineApp.estop()
            return 'OK'
        #else:
        #    abort(400, 'Failed to estop the MachineApp')

    def getEstop(self):
        #if self.__machineApp.getEstop():
        #    return 'true'
        #else:
        return 'false'

    def releaseEstop(self):
        if self.__machineApp.releaseEstop():
            return 'OK'
        else:
            abort(400, 'Failed to release estop')

    def resetSystem(self):
        #if self.__machineApp.resetSystem():
        return 'OK'
        #else:
        #   abort(400, 'Failed to reset the system')

    def getState(self):
        return {
            "isRunning": self.isRunning,
            "isPaused": self.isPaused
        }

    def kill(self):
        getNotifier().setDead()
        self.__machineApp.kill()
        os.kill(os.getpid(), signal.SIGTERM)
        return 'OK'

def runServer():
    restServer = RestServer()
    restServer.run(host='0.0.0.0', port=3011, server='paste')