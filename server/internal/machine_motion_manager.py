from internal.fake_machine_motion import MachineMotion
import logging
from internal.mqtt_topic_subscriber import MqttTopicSubscriber

class MachineMotionInstance:
    def __init__(self, machineMotion: 'MachineMotion'):
        self.machineMotion = machineMotion
        self.subscriber = MqttTopicSubscriber(machineMotion)

class MachineMotionManager:
    '''
    Provides the user with a way to set and get machine motions by name,
    as well as a way to send the same commands to multiple machine motions.
    '''
    def __init__(self):
        self.__machineMotionDict = {}
        self.__masterMachineMotion = None
        self.__logger = logging.getLogger(__name__)
        self.__mqttTopicSubscriber = MqttTopicSubscriber(self)

    def register(self, name: str, machineMotion: MachineMotion, isMaster: bool = False):
        '''
        Register a machine motion for use during your program

        params:
            name: str
                name of your machine motion that you can use to retrieve it with later

            machineMotion: MachineMotion
                instance of MachineMotion.py

            isMaster: bool
                specifies whether or not this is the master machine motion
        '''
        self.__machineMotionDict[name] = MachineMotionInstance(machineMotion)
        if isMaster:
            self.__masterMachineMotion = name

    def get(self, name: str) -> 'MachineMotion':
        '''
        Retrieves the machine motion by name. Returns None if we can't find it.

        params:
            name: str
                name of your machine motion

        returns:
            MachineMorion or None
        '''
        if not name in self.__machineMotionDict:
            self.__logger.error('Could not find machine motion: {}'.format(name))
            return None

        return self.__machineMotionDict[name].machineMotion

    def generator(self):
        for name, instance in self.__machineMotionDict.items():
            yield instance.machineMotion

    def __hasMaster(self):
        return self.__masterMachineMotion != None and self.__masterMachineMotion in self.__machineMotionDict

    def triggerEstop(self):
        if not self.__hasMaster():
            for machineMotion in self.generator():
                machineMotion.triggerEstop()
        else:
            self.__machineMotionDict[self.__masterMachineMotion].triggerEstop()

    def releaseEstop(self):
        if not self.__hasMaster():
            for machineMotion in self.generator():
                machineMotion.releaseEstop()
        else:
            self.__machineMotionDict[self.__masterMachineMotion].releaseEstop()

    def resetSystem(self):
        if not self.__hasMaster():
            for machineMotion in self.generator():
                machineMotion.resetSystem()
        else:
            self.__machineMotionDict[self.__masterMachineMotion].resetSystem()

    def registerMqttCallback(self, machineMotionName, topic, callback):
        ''' 
        Register a callback for a particular topic. Note that you should call removeCallback
        when you are finished.

        params:
            machineMotionName: str
                Machine motion who's topic you want to subscribe to

            topic: str
                MQTT topic that you'd like to subscribe to

            callback: func(topic: str, msg: str) -> void
                Callback that gets called when we receive data on that topic

        returns:
            bool
                Whether or not we registered your callback
        '''
        for name, instance in self.__machineMotionDict.items():
            if name == machineMotionName:
                return instance.subscriber.registerCallback(topic, callback)

        self.__logger.error('Failed to find machine motion with name = {}'.format(machineMotionName))
        return False

    def removeMqttCallback(self, machineMotionName, topic, callback):
        '''
        Deregisters a callback for a particular topic. Please be sure to do this when you are done
        using a callback.

        params:
            machineMotionName: str
                Machine motion who's topic you want to subscribe to

            topic: str
                MQTT topic that you'd like to subscribe to

            callback: func(topic: str, msg: str) -> void
                Callback that gets called when we receive data on that topic
        '''
        for name, instance in self.__machineMotionDict.items():
            if name == machineMotionName:
                return instance.subscriber.removeCallback(topic, callback)

    def update(self):
        for name, instance in self.__machineMotionDict.items():
            instance.subscriber.update()
