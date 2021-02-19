import subprocess
import os
import io
from threading import Thread
import logging
import time
import json
from internal.interprocess_message import SubprocessToParentMessage
from internal.notifier import getNotifier

class MachineAppSubprocess:
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
        command = [ 'python', 'run_machine_app.py' ]
        command.append('--configuration')
        command.append(json.dumps(configuration))
        if inStateStepperMode:
            command.append('--inStateStepperMode')

        self.__subprocess = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.PIPE)
        self.__isRunning = True

        return True

    def writeToSubprocess(self, data):
        if self.__subprocess == None:
            return False

        self.__subprocess.stdin.write(str(json.dumps(data) + '\r\n').encode('utf-8'))
        self.__subprocess.stdin.flush()
        return True

    def __update(self):
        while True:          # Waiting to receive the start command, will sleep in the meantime
            while self.__isRunning:  # Received start and waiting on the subprocess stdout
                if self.__subprocess == None or self.__subprocess.stdout.closed:
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

                #time.sleep(1.0)

            time.sleep(1.0)


    def stop(self):
        if self.__subprocess == None:
            return False

        self.__isRunning = False

        self.__subprocess.terminate()
        self.__subprocess = None

        