#/usr/bin/python3

from internal.rest_server import runServer
from internal.notifier import initializeNotifier
import logging
from logging.handlers import RotatingFileHandler
from machine_app import MachineAppEngine

def run():
    ''' Entry to the entire program '''
    logging.info('Starting your MachineApp')

    initializeNotifier()
    machineApp = MachineAppEngine()
    runServer(machineApp)

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