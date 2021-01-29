#/usr/bin/python3

from internal.rest_server import runServer
from internal.notifier import initializeNotifier
import logging
from logging.handlers import RotatingFileHandler
from machine_app import MachineAppEngine
from env import IS_DEVELOPMENT
import json
import time

def run():
    ''' Entry to the entire program '''
    if not IS_DEVELOPMENT:
        # Warning: Do not touch. This code checks whether or not we should run this machine app template
        # code based on the flag set in mm-config.json
        while True:
            with open('/var/lib/cloud9/vention-control/mm-config.json') as f:
                config = json.load(f)
                hasCustomMachineApp = 'custom_machine_app' in config and config['custom_machine_app'] == True
                
            if not hasCustomMachineApp:
                logging.info('Not starting the MachineApp.')
                time.sleep(60 * 60) # Sleep for one hour
            else:
                break

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