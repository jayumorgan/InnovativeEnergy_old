import logging
from bottle import Bottle, request, response, abort, static_file
import os
import time
from internal.controller import RuntimeController
    
class RestServer(Bottle):
    '''
    RESTful server that handles control of the MachineApp and configuration IO
    '''
    def __init__(self, machineApp: 'BaseMachineAppEngine'):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__logger = logging.getLogger(__name__)
        self.__runtimeController = RuntimeController(machineApp)

        self.route('/', callback=self.index)
        self.route('/<filepath:path>', callback=self.serveStatic)

        self.route('/run/start', method='POST', callback=self.__runtimeController.start)
        self.route('/run/stop', method='POST', callback=self.__runtimeController.stop)
        self.route('/run/pause', method='POST', callback=self.__runtimeController.pause)
        self.route('/run/resume', method='POST', callback=self.__runtimeController.resume)
        self.route('/run/estop', method='POST', callback=self.__runtimeController.estop)
        self.route('/run/estop', method='GET', callback=self.__runtimeController.getEstop)
        self.route('/run/releaseEstop', method='POST', callback=self.__runtimeController.releaseEstop)
        self.route('/run/resetSystem', method='POST', callback=self.__runtimeController.resetSystem)

    def index(self):
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

def runServer(machineApp: 'BaseMachineAppEngine'):
    restServer = RestServer(machineApp)
    restServer.run(host='localhost', port=3011)