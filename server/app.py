import logging
from logging.handlers import RotatingFileHandler
from bottle import Bottle, request, response, abort, static_file
import os

class RestServer(Bottle):
    def __init__(self):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__logger = logging.getLogger(__name__)
        self.route('/', callback=self.index)
        self.route('/<filepath:path>', callback=self.serveStatic)

    def index(self):
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

class WebsocketStreamer:
    pass

class Application:
    def __init__(self):
        self.__restServer = RestServer()
        self.__websocket = WebsocketStreamer()

    def run(self):
        self.__restServer.run(host='localhost', port=3011)
        pass

if __name__ == "__main__":
    logging.basicConfig(
        format='%(asctime)s {%(name)s:%(lineno)d} (%(levelname)s) - %(message)s',
        level=logging.DEBUG,
        handlers=[
            RotatingFileHandler('machine_app.log', mode='a', maxBytes=5*1024*1024,  backupCount=2, encoding=None, delay=0),
            logging.StreamHandler()
        ]
    )

    app = Application()
    app.run()