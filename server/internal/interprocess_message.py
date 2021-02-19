import time
import json

class SubprocessToParentMessage:
    ''' Messages sent from the Subprocess to the parent process '''
    NONE            = 0
    NOTIFICATION    = 1

class ParentToSubprocessMessage:
    ''' Messages sent from the parent to the subprocess '''
    NONE    = 0
    STOP    = 1
    PAUSE   = 2
    RESUME  = 3
    ESTOP   = 4

def sendSubprocessToParentMsg(type, data = None):
    msg = json.dumps({ 'type': type, 'data': data })
    print(msg + '\n')

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