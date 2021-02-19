import subprocess
import sys
import os
import io
from threading import Thread
import logging
import time
import json
from internal.interprocess_message import SubprocessToParentMessage
from internal.notifier import getNotifier

class MachineAppSubprocess:
    '''
    Manages the lifetime of the MachineApp subprocess, forwards stdin commands and stdout information.
    '''

    def __init__(self):
        self.__isRunning = False
        self.__subprocess = None
        self.__stdout = None
        self.__stderr = None
        self.__logger = logging.getLogger(__name__)
        self.__notifier = getNotifier()

        self.__stdthread = Thread(name='subprocess_stdout', target=self.__update)
        self.__stdthread.daemon = True
        self.__stdthread.start() 

    def start(self, inStateStepperMode, configuration):
        '''
        Starts running the MachineApp in a new process
        '''
        if self.__isRunning == True:
            return False

        with open('./internal/configuration.json', 'w') as f:
            f.write(json.dumps(configuration, indent=4))

        command = [ sys.executable, 'run_machine_app.py' ]
        if inStateStepperMode:
            command.append('--inStateStepperMode')

        self.__logger.info('Attempting to run subprocess: {}'.format(' '.join(command)))
        self.__subprocess = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.PIPE)
        self.__isRunning = True

        return True

    def sendMsgToSubprocess(self, data):
        '''
        Write a JSON payload to stdin  of the child process
        '''
        if self.__subprocess == None:
            return False

        self.__subprocess.stdin.write(str(json.dumps(data) + '\r\n').encode('utf-8'))
        self.__subprocess.stdin.flush()
        return True

    def __update(self):
        '''
        Used to forward notifier messages from the child process to the client. This enables us to not
        have to constantly disconnect/reconnect to the child process' websocket whenever the user pressed
        start or stop.

        We also catch standard 'print' outputs here too, and print them out to the parent process' console.
        '''
        while True:          # Waiting to receive the start command, will sleep in the meantime
            while self.__isRunning:  # Received start and waiting on the subprocess stdout
                if self.__subprocess == None or self.__subprocess.poll() != None or self.__subprocess.stdout.closed:
                    self.__isRunning = False
                    self.__logger.info('Subprocess is no longer active')
                    continue

                while self.__subprocess != None and self.__subprocess.stdout != None and self.__subprocess.stdout.readable():
                    line = self.__subprocess.stdout.readline().decode('utf-8').strip()

                    if len(line) == 0:
                        break

                    line = line.strip()
                    try:
                        content = json.loads(line)

                        if not "type" in content:
                            continue

                        msgType = content["type"]
                        if msgType == SubprocessToParentMessage.NOTIFICATION:
                            notification = content["data"]
                            self.__notifier.sendMessage(notification['level'], notification['message'], notification['customPayload'])
                    except:
                        print(line)

            time.sleep(1.0)


    def terminate(self):
        '''
        Terminates the subprocess immediately

        returns:
            bool
                Successfully terminated a running application or not
        '''
        if self.__subprocess == None:
            return False

        self.__subprocess.kill()
        self.__subprocess = None
        return True

    def isRunning(self):
        return self.__isRunning