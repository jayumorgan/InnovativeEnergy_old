import logging
from bottle import Bottle, request, response, abort, static_file
import os
import time
import threading
from threading import Thread
from pathlib import Path
import json
from internal.machine_app_subprocess import MachineAppSubprocess
from internal.notifier import getNotifier, NotificationLevel
import signal
import paho.mqtt.subscribe as MQTTsubscribe
import paho.mqtt.client as mqtt

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
        self.__estopManager = EstopManager()
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
        
        if self.__subprocess.start(inStateStepperMode, configuration):
            self.isRunning = True
            return 'OK'
        else:
            abort(400, 'Failed to start the MachineApp')

    def stop(self):
        if self.__subprocess.sendMsgToSubprocess({ 'request': 'stop' }):
            return 'OK'
        else:
            abort(400, 'Failed to stop the MachineApp')

    def pause(self):
        if self.__subprocess.sendMsgToSubprocess({ 'request': 'pause' }):
            return 'OK'
        else:
            abort(400, 'Failed to pause the MachineApp')

    def resume(self):
        if self.__subprocess.sendMsgToSubprocess({ 'request': 'resume' }):
            return 'OK'
        else:
            abort(400, 'Failed to resume the MachineApp')

    # TODO: All E-Stop functionality should be handles on this process
    def estop(self):
        if self.__estopManager.estop():
            self.__subprocess.terminate()
            return 'OK'
        else:
            abort(400, 'Failed to estop the MachineApp')

    def getEstop(self):
        return self.__estopManager.getEstop()

    def releaseEstop(self):
        if self.__estopManager.release():
            return 'OK'
        else:
            abort(400, 'Failed to release estop')

    def resetSystem(self):
        if self.__estopManager.reset():
            return 'OK'
        else:
           abort(400, 'Failed to reset the system')

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

class MQTTPATHS :
    ESTOP = "estop"
    ESTOP_STATUS = ESTOP + "/status"
    ESTOP_TRIGGER_REQUEST = ESTOP + "/trigger/request"
    ESTOP_TRIGGER_RESPONSE = ESTOP + "/trigger/response"
    ESTOP_RELEASE_REQUEST = ESTOP + "/release/request"
    ESTOP_RELEASE_RESPONSE = ESTOP + "/release/response"
    ESTOP_SYSTEMRESET_REQUEST = ESTOP + "/systemreset/request"
    ESTOP_SYSTEMRESET_RESPONSE = ESTOP + "/systemreset/response"

class EstopManager:
    TIMEOUT = 10.0

    '''
    Small class that subscribes/publishes to MQTT eStop events 
    to control the current state of the estop.
    '''
    def __init__(self):
        self.__isEstopped = False
        self.__notifier = getNotifier()
        self.__mqttClient = mqtt.Client()
        self.__logger = logging.getLogger(__name__)
        self.__mqttClient.on_connect = self.__onConnect
        self.__mqttClient.on_message = self.__onMessage
        self.__mqttClient.on_disconnect = self.__onDisconnect
        self.IP = '127.0.0.1'
        self.__mqttClient.connect(self.IP)
        self.__mqttClient.loop_start()

    def __onConnect(self, client, userData, flags, rc):
        if rc == 0:
            self.__mqttClient.subscribe(MQTTPATHS.ESTOP_STATUS)

    def __onMessage(self, client, userData, msg):
        topicParts = msg.topic.split('/')
        deviceType = topicParts[1]

        if (topicParts[0] == MQTTPATHS.ESTOP) :
            if (topicParts[1] == "status") :
                self.__isEstopped = json.loads(msg.payload.decode('utf-8'))

                if self.__isEstopped:
                    self.__notifier.sendMessage(NotificationLevel.APP_ESTOP, 'Machine is in estop')
                else:
                    self.__notifier.sendMessage(NotificationLevel.APP_ESTOP_RELEASE, 'Estop Released')

    def __onDisconnect(self, client, userData, rc):
        logging.info("Disconnected with rtn code [%d]"% (rc))
        return

    def estop(self):
        return_value = { 'value': False }

        def mqttResponse() :
            # Wait for response
            return_value['value'] = json.loads(MQTTsubscribe.simple(MQTTPATHS.ESTOP_TRIGGER_RESPONSE, retained = False, hostname = self.IP).payload.decode('utf-8'))
        
            return

        mqttResponseThread = threading.Thread(target = mqttResponse)
        mqttResponseThread.daemon = True
        mqttResponseThread.start()

        # Adding a delay to make sure MQTT simple function is launched before publish is made. Quick fix from bug on App. Launcher.
        time.sleep(0.2)

        # Publish trigger request on MQTT
        self.__mqttClient.publish(MQTTPATHS.ESTOP_TRIGGER_REQUEST, "message is not important")

        mqttResponseThread.join(EstopManager.TIMEOUT)

        if mqttResponseThread.isAlive() :
            self.__logger.error('MQTT response timeout.')
            return False
        else :
            return return_value['value']

        return return_value['value']

    def release(self):
        return_value = { 'value': False }

        def mqttResponse() :
            # Wait for response
            return_value['value'] = json.loads(MQTTsubscribe.simple(MQTTPATHS.ESTOP_RELEASE_RESPONSE, retained = False, hostname = self.IP).payload.decode('utf-8'))

            return

        mqttResponseThread = threading.Thread(target = mqttResponse)
        mqttResponseThread.daemon = True
        mqttResponseThread.start()

        # Adding a delay to make sure MQTT simple function is launched before publish is made. Quick fix from bug on App. Launcher.
        time.sleep(0.2)

        # Publish release request on MQTT
        self.__mqttClient.publish(MQTTPATHS.ESTOP_RELEASE_REQUEST, "message is not important")

        mqttResponseThread.join(EstopManager.TIMEOUT)

        if mqttResponseThread.isAlive() :
            self.__logger.error('MQTT response timeout.')
            return False
        else :
            return return_value['value']

        return return_value['value']

    def reset(self):
        return_value = { 'value': False }

        def mqttResponse() :
            # Wait for response
            return_value['value'] = json.loads(MQTTsubscribe.simple(MQTTPATHS.ESTOP_SYSTEMRESET_RESPONSE, retained = False, hostname = self.IP).payload.decode('utf-8'))

            return

        mqttResponseThread = threading.Thread(target = mqttResponse)
        mqttResponseThread.daemon = True
        mqttResponseThread.start()

        # Adding a delay to make sure MQTT simple function is launched before publish is made. Quick fix from bug on App. Launcher.
        time.sleep(0.2)

        # Publish reset system request on MQTT
        self.__mqttClient.publish(MQTTPATHS.ESTOP_SYSTEMRESET_REQUEST, "message is not important")

        mqttResponseThread.join(EstopManager.TIMEOUT)

        if mqttResponseThread.isAlive() :
            self.__logger.error('MQTT response timeout.')
            return False
        else :
            return return_value['value']

        return return_value['value']

    def getEstop(self):
        return 'true' if self.__isEstopped else 'false'

def runServer():
    restServer = RestServer()
    restServer.run(host='0.0.0.0', port=3011, server='paste')