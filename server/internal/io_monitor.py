from internal.notifier import NotificationLevel, sendNotification

class IOValue:
    def __init__(self, name, device, pin):
        self.name = name
        self.device = device
        self.pin = pin
        self.state = 0

    def isEqual(self, device, pin):
        return self.device == device and self.pin == pin

    def toJson(self):
        return {
            "name": self.name,
            "device": self.device,
            "pin": self.pin,
            "value": self.state
        }

class IOMonitor:
    '''
    Used to monitor the state of a group of IO modules and return their
    current values to the Web Client via the Notifier.
    '''

    def __init__(self, machineMotion):
        self.__machineMotion = machineMotion

        self.__monitorList = []
        self.__machineMotion.addMqttCallback(self.__mqttEventCallback)

    def startMonitoring(self, name, device, pin):
        '''
        Adds an IO do the monitored list. Whenever this IO is updated, the state
        will be sent to the Web Client.

        params:
            name: str
                Friendly name of the IO that you want to be sent to the Web Client. Must be unique.

            device: int
                IO module

            pin: int

        returns:
            bool
                Specifies whether or not the provided name is already taken
        '''
        for monitoredItem in self.__monitorList:
            if monitoredItem.name == name:
                return False

        self.__monitorList.append(IOValue(name, device, pin))
        return True

    def stopMonitoring(self, name):
        '''
        Removed an IO from the monitored list.

        params:
            name: str
                Name of IO to be removed

        returns:
            bool
                Whether or not it could be removed
        '''
        for idx in range(self.__monitorList):
            if self.__monitorList[idx].name == name:
                del self.__monitorList[idx]
                return True
        
        return False

    def __mqttEventCallback(self, topic, msg):
        topicParts = topic.split('/')
        deviceType = topicParts[1]
        if deviceType != 'io-expander':
            return

        if (topicParts[3] == 'available'):
            return

        device = int( topicParts[2] )
        pin = int( topicParts[4] )
        value  = msg

        for monitorItem in self.__monitorList:
            if monitorItem.isEqual(device, pin):
                monitorItem.state = value
                sendNotification(NotificationLevel.IO_STATE, '', monitorItem.toJson())
                break