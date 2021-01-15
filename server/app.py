import logging
from logging.handlers import RotatingFileHandler
from bottle import Bottle, request, response, abort, static_file
import os
from threading import Thread
import time
from pathlib import Path
import json

class SchemaService:
    def __init__(self):
        self.__logger = logging.getLogger(__name__)
        self.__dataPath = os.path.join('.', 'data')
        self.__schemaPath = os.path.join(self.__dataPath, 'schemas')

        if not os.path.isdir(self.__dataPath):
            os.mkdir(self.__dataPath)

        if not os.path.isdir(self.__schemaPath):
            os.mkdir(self.__schemaPath)

    def createSchema(self, name, schema):
        pass

    def deleteSchema(self, id):
        pass

    def updateSchema(self, id, schema):
        pass

    def tryGetSchema(self, id):
        fullFilePath = os.path.join(self.__schemaPath, id + '.json')
        with open(fullFilePath) as f:
            try:
                return (True, json.loads(f.read()))
            except Exception as e:
                self.__logger.exception('Failed to read file at path {}, exception: {}'.format(fullFilePath, str(e)))
        return (False, None)

    def listSchemas(self):
        schemas = []

        for filename in os.listdir(self.__schemaPath):
            if not filename.endswith('.json'):
                self.__logger.error('Unknown schema file: ' + filename)
                continue

            fullFilePath = os.path.join(self.__schemaPath, filename)
            with open(fullFilePath) as f:
                try:
                    jsonContents = json.loads(f.read())
                    identifier = jsonContents["id"]
                    name = jsonContents["name"]
                    schemas.append({
                        "id": identifier,
                        "name": name
                    })
                except Exception as e:
                    self.__logger.exception('Failed to read file at path {}, exception: {}'.format(fullFilePath, str(e)))

        return {
            "schemas": schemas
        }


class RestServer(Bottle):
    '''
    RESTful server that handles control of the MachineApp and configuration IO
    '''
    def __init__(self):
        super(RestServer, self).__init__()
    
        self.__clientDirectory = os.path.join('..', 'client')
        self.__logger = logging.getLogger(__name__)
        self.__schemaService = SchemaService()

        self.route('/', callback=self.index)
        self.route('/<filepath:path>', callback=self.serveStatic)
        self.route('/schema/create', method='POST', callback=self.createNewSchema)
        self.route('/schema', callback=self.getSchema)
        self.route('/schema/list', callback=self.listSchemas)

    def index(self):
        return static_file('index.html', root=self.__clientDirectory)
        
    def serveStatic(self, filepath):
        self.__logger.info('Serving static file: {}'.format(filepath))
        return static_file(filepath, root=self.__clientDirectory)

    def createNewSchema(self):
        name = request.query.name
        schema = request.json()
        pass

    def listSchemas(self):
        return self.__schemaService.listSchemas()

    def getSchema(self):
        schemaId = request.query.id
        (success, schema) = self.__schemaService.tryGetSchema(schemaId)

        if not success:
            abort(400, 'Schema with id={} not found'.format(id))
        else:
            return schema


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