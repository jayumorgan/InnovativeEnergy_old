#/usr/bin/python3

import logging
import time
from internal.fake_machine_motion import MachineMotion
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
from internal.notifier import NotificationLevel

class EntryState(MachineAppState):
    def onEnter(self, transitionData):
        self.notifier.sendMessage(NotificationLevel.INFO, 'Entered entry state')
        self.engine.gotoState('horizontal_green')

class GreenLightState(MachineAppState):
    def __init__(self, engine, machineMotionName, direction):
        super().__init__(engine)

        self.__machineMotionName= machineMotionName
        self.__machineMotion    = self.machineMotionManager.get(machineMotionName)
        self.__direction        = direction
        self.__speed            = self.configuration['fullSpeed']
        self.__durationSeconds  = self.configuration['greenTimer']

    def __onPedestrianButtonClicked(self, topic, msg):
        if msg == 'true':
            self.engine.gotoState(self.__direction + '_yellow', { "doPestrianCrossing": True })

    def onEnter(self, transitionData):
        self.__startTimeSeconds = time.time()
        if self.__machineMotion == None:
            self.logger.error('Unable to find the machine motion with name {}'.format(self.__machineMotionName))
            self.notifier.sendMessage(NotificationLevel.ERROR, 'Unable to find the machine motion with name {}'.format(self.__machineMotionName))
            self.engine.gotoState('error')
            return

        self.logger.info('{} direction entered the GREEN light state'.format(self.__direction))
        self.__machineMotion.setContinuousMove(1, self.__speed)
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to GREEN for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'green', "speed": self.__speed })

        self.machineMotionManager.registerMqttCallback(self.__machineMotionName, 'pedestrian_crossing_topic', self.__onPedestrianButtonClicked)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.engine.gotoState(self.__direction + '_yellow')

    def onLeave(self):
        self.machineMotionManager.removeMqttCallback(self.__machineMotionName, 'pedestrian_crossing_topic', self.__onPedestrianButtonClicked)
        self.__machineMotion.stopContinuousMove(1)

class YellowLightState(MachineAppState):
    def __init__(self, engine, machineMotionName, direction):
        super().__init__(engine)

        self.__machineMotionName= machineMotionName
        self.__machineMotion    = self.machineMotionManager.get(machineMotionName)
        self.__direction        = direction
        self.__speed            = self.configuration['slowSpeed']
        self.__durationSeconds  = self.configuration['yellowTimer']

    def __onPedestrianButtonClicked(self, topic, msg):
        if msg == 'true':
            self.__transitionData = { "doPestrianCrossing": True } # Go to the pedestrian crossing right after the yellow light

    def onEnter(self, transitionData):
        self.__startTimeSeconds = time.time()
        self.__transitionData = transitionData
        if self.__machineMotion == None:
            self.logger.error('Unable to find the machine motion with name {}'.format(self.__machineMotionName))
            self.notifier.sendMessage(NotificationLevel.ERROR, 'Unable to find the machine motion with name {}'.format(self.__machineMotionName))
            self.engine.gotoState('error')
            return

        self.logger.info('{} direction entered the YELLOW light state'.format(self.__direction))
        self.__machineMotion.setContinuousMove(1, self.__speed)
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to YELLOW for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'yellow', "speed": self.__speed })

        self.machineMotionManager.registerMqttCallback(self.__machineMotionName, 'pedestrian_crossing_topic', self.__onPedestrianButtonClicked)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.engine.gotoState(self.__direction + '_red', self.__transitionData)

    def onLeave(self):
        self.machineMotionManager.removeMqttCallback(self.__machineMotionName, 'pedestrian_crossing_topic', self.__onPedestrianButtonClicked)
        self.__machineMotion.stopContinuousMove(1)

class RedLightState(MachineAppState):
    def __init__(self, engine, direction):
        super().__init__(engine)

        self.__direction        = direction
        self.__durationSeconds  = self.configuration['redTimer']
        
    def onEnter(self, transitionData):
        self.logger.info('{} direction entered the RED light state'.format(self.__direction))
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to RED for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'red', "speed": 0 })

        self.__shouldGoToPedstrianCrossing = transitionData != None and transitionData["doPestrianCrossing"]
        self.__startTimeSeconds = time.time()
        
    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            if self.__shouldGoToPedstrianCrossing:
                self.engine.gotoState('pedestrian_crossing', { 'nextLight': 'vertical' if self.__direction == 'horizontal' else 'horizontal' })
            elif self.__direction == 'horizontal':
                self.engine.gotoState('vertical_green')
            elif self.__direction == 'vertical':
                self.engine.gotoState('horizontal_green')
class PedestrianCrossingState(MachineAppState):
    def __init__(self, engine):
        super().__init__(engine)

        self.__durationSeconds  = self.configuration['pedestrianTimer']

    def onEnter(self, transitionData):
        self.logger.info('Pedestrian crossing initialized')
        self.notifier.sendMessage(NotificationLevel.INFO, 'Pedestrians can now cross', { 'pedestriansCrossing': True })

        if not 'nextLight' in transitionData:
            self.logger.error('Expected to have a nextLight in our transition data payload')
            return

        self.__nextLightState = transitionData['nextLight'] + '_green'
        self.__startTimeSeconds = time.time()

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.engine.gotoState(self.__nextLightState)


    def onLeave(self):
        self.notifier.sendMessage(NotificationLevel.INFO, 'Pedestrians can NOT cross anymore', { 'pedestriansCrossing': False })

class MachineAppEngine(BaseMachineAppEngine):
    def initialize(self):
        self.machineMotionManager.register('primary', MachineMotion('127.0.0.1'), True)
        self.machineMotionManager.register('secondary', MachineMotion('127.0.0.1'))

    def getDefaultState(self):
        return 'entry'

    def buildStateDictionary(self):
        stateDictionary = {
            'entry'                 : EntryState(self),
            'horizontal_green'      : GreenLightState(self, 'primary', 'horizontal'),
            'horizontal_yellow'     : YellowLightState(self, 'primary', 'horizontal'),
            'horizontal_red'        : RedLightState(self, 'horizontal'),
            'vertical_green'        : GreenLightState(self, 'secondary', 'vertical'),
            'vertical_yellow'       : YellowLightState(self, 'secondary', 'vertical'),
            'vertical_red'          : RedLightState(self, 'vertical'),
            'pedestrian_crossing'   : PedestrianCrossingState(self)
        }

        return stateDictionary

    def cleanup(self):
        pass