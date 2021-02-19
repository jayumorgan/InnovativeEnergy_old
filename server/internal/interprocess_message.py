import time
import json
import sys
import logging

class SubprocessToParentMessage:
    ''' Messages sent from the Subprocess to the parent process '''
    NONE            = 0
    NOTIFICATION    = 1

def sendSubprocessToParentMsg(type, data = None):
    '''
    Sends a message to the parent process
    '''
    msg = json.dumps({ 'type': type, 'data': data })
    sys.stdout.write(msg + '\n')
    sys.stdout.flush()

def sendNotification(level, message, customPayload=None):
    '''
        Broadcast a message to all connected clients

        params:
            level: str
                Notification level defines how the data is visualized on the client
            message: str
                message to be shown on the client
            customPayload: dict
                (Optional) Custom data to be sent to the client, if any
    '''
    sendSubprocessToParentMsg(SubprocessToParentMessage.NOTIFICATION, {
        "timeSeconds": time.time(),
        "level": level,
        "message": message,
        "customPayload": customPayload
    })