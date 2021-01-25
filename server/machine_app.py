#/usr/bin/python3

import logging
import time
from internal.fake_machine_motion import MachineMotion
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
from internal.notifier import NotificationLevel
from internal.mqtt_topic_subscriber import MqttTopicSubscriber

class EntryState(MachineAppState):
    def onEnter(self):
        self.notifier.sendMessage(NotificationLevel.INFO, 'Entered entry state')
        self.engine.gotoState('horizontal_green')

class GreenLightState(MachineAppState):
    def __init__(self, engine, machineMotion, direction):
        super().__init__(engine)

        self.__machineMotion        = machineMotion
        self.__direction            = direction
        self.__speed                = self.configuration['fullSpeed']
        self.__durationSeconds      = self.configuration['greenTimer']

    def __onPedestrianButtonClicked(self, topic, msg):
        if msg == 'true':
            self.engine.isPedestrianButtonTriggered = True
            self.engine.nextLightDirection = 'vertical' if self.__direction == 'horizontal' else 'horizontal'
            self.engine.gotoState(self.__direction + '_yellow')

    def onEnter(self):
        self.__startTimeSeconds = time.time()
        self.logger.info('{} direction entered the GREEN light state'.format(self.__direction))
        self.__machineMotion.setContinuousMove(1, self.__speed)
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to GREEN for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'green', "speed": self.__speed })

        self.__mqttTopicSubscriber  = MqttTopicSubscriber(self.__machineMotion)
        self.__mqttTopicSubscriber.registerCallback('pedestrian_crossing_topic', self.__onPedestrianButtonClicked)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.engine.gotoState(self.__direction + '_yellow')

        self.__mqttTopicSubscriber.update()

    def onLeave(self):
        self.__machineMotion.stopContinuousMove(1)
        self.__mqttTopicSubscriber.delete()


class YellowLightState(MachineAppState):
    def __init__(self, engine, machineMotion, direction):
        super().__init__(engine)

        self.__machineMotion        = machineMotion
        self.__direction            = direction
        self.__speed                = self.configuration['slowSpeed']
        self.__durationSeconds      = self.configuration['yellowTimer']

    def __onPedestrianButtonClicked(self, topic, msg):
        if msg == 'true':
            self.engine.isPedestrianButtonTriggered = True
            self.engine.nextLightDirection = 'vertical' if self.__direction == 'horizontal' else 'horizontal'

    def onEnter(self):
        self.__startTimeSeconds = time.time()
        self.logger.info('{} direction entered the YELLOW light state'.format(self.__direction))
        self.__machineMotion.setContinuousMove(1, self.__speed)
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to YELLOW for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'yellow', "speed": self.__speed })

        self.__mqttTopicSubscriber  = MqttTopicSubscriber(self.__machineMotion)
        self.__mqttTopicSubscriber.registerCallback('pedestrian_crossing_topic', self.__onPedestrianButtonClicked)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.engine.gotoState(self.__direction + '_red')

        self.__mqttTopicSubscriber.update()

    def onLeave(self):
        self.__machineMotion.stopContinuousMove(1)
        self.__mqttTopicSubscriber.delete()

class RedLightState(MachineAppState):
    def __init__(self, engine, direction):
        super().__init__(engine)

        self.__direction        = direction
        self.__durationSeconds  = self.configuration['redTimer']
        
    def onEnter(self):
        self.logger.info('{} direction entered the RED light state'.format(self.__direction))
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to RED for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'red', "speed": 0 })

        self.__startTimeSeconds = time.time()
        
    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            if self.engine.isPedestrianButtonTriggered:
                self.engine.gotoState('pedestrian_crossing')
            elif self.__direction == 'horizontal':
                self.engine.gotoState('vertical_green')
            elif self.__direction == 'vertical':
                self.engine.gotoState('horizontal_green')

class PedestrianCrossingState(MachineAppState):
    def __init__(self, engine):
        super().__init__(engine)

        self.__durationSeconds  = self.configuration['pedestrianTimer']

    def onEnter(self):
        self.logger.info('Pedestrian crossing initialized')
        self.notifier.sendMessage(NotificationLevel.INFO, 'Pedestrians can now cross', { 'pedestriansCrossing': True })
        self.__nextLightState = self.engine.nextLightDirection + '_green'
        self.__startTimeSeconds = time.time()

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.engine.gotoState(self.__nextLightState)

    def onLeave(self):
        self.notifier.sendMessage(NotificationLevel.INFO, 'Pedestrians can NOT cross anymore', { 'pedestriansCrossing': False })
        self.engine.isPedestrianButtonTriggered = False


class MachineAppEngine(BaseMachineAppEngine):
    
    def initialize(self):
        ''' 
        Called when the program starts. Note this is only called ONCE
        in the lifetime of your MachineApp. If you want to execute behavior
        every time you click start, see 'beforeRun'.
        
        In this method, you will initialize your machine motion instances 
        and configure them. You may also define variables that you'd like to access 
        and manipulate over the course of your MachineApp here.
        '''
        self.isPedestrianButtonTriggered = False
        self.nextLightDirection = 'horizontal'
        self.primaryMachineMotion = MachineMotion('127.0.0.1')
        self.secondaryMachineMotion = MachineMotion('127.0.0.1')

    def beforeRun(self):
        '''
        Called before every run of your MachineApp. This is where you might want to
        reset to a default state.
        '''
        self.isPedestrianButtonTriggered = False
        self.nextLightDirection = 'horizontal'

    def afterRun(self):
        '''
        Executed when execution of your MachineApp ends (i.e., when self.isRunning goes from True to False).
        This could be due to an estop, stop event, or something else.

        In this method, you can clean up any resources that you'd like to clean up, or do nothing at all.
        '''
        pass

    def getMasterMachineMotion(self):
        '''
        Returns the primary machine motion that will be used for estop events.

        returns:
            MachineMotion
        '''
        return self.primaryMachineMotion

    def getDefaultState(self):
        '''
        Returns the state that your Application begins in when a run begins. This string MUST
        map to a key in your state dictionary.

        returns:
            str
        '''
        return 'entry'

    def buildStateDictionary(self):
        '''
        Builds and returns a dictionary that maps state names to MachineAppState.
        The MachineAppState class wraps callbacks for stateful transitions in your MachineApp.

        returns:
            dict<str, MachineAppState>
        '''
        stateDictionary = {
            'entry'                 : EntryState(self),
            'horizontal_green'      : GreenLightState(self, self.primaryMachineMotion, 'horizontal'),
            'horizontal_yellow'     : YellowLightState(self, self.primaryMachineMotion, 'horizontal'),
            'horizontal_red'        : RedLightState(self, 'horizontal'),
            'vertical_green'        : GreenLightState(self, self.secondaryMachineMotion, 'vertical'),
            'vertical_yellow'       : YellowLightState(self, self.secondaryMachineMotion, 'vertical'),
            'vertical_red'          : RedLightState(self, 'vertical'),
            'pedestrian_crossing'   : PedestrianCrossingState(self)
        }

        return stateDictionary