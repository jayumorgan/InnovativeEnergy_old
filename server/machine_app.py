#/usr/bin/python3

from env import IS_DEVELOPMENT
import logging
import time
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
from internal.notifier import NotificationLevel

if IS_DEVELOPMENT:
    from internal.fake_machine_motion import MachineMotion
else:
    from internal.machine_motion import MachineMotion

class MachineAppEngine(BaseMachineAppEngine):
    def buildStateDictionary(self):
        '''
        Builds and returns a dictionary that maps state names to MachineAppState.
        The MachineAppState class wraps callbacks for stateful transitions in your MachineApp.

        returns:
            dict<str, MachineAppState>
        '''
        stateDictionary = {
            'homing'                : HomingState(self),
            'move_to_start'         : MoveToInitialPositionState(self),
            'horizontal_green'      : GreenLightState(self, self.primaryMachineMotion, 'horizontal'),
            'horizontal_yellow'     : YellowLightState(self, self.primaryMachineMotion, 'horizontal'),
            'horizontal_red'        : RedLightState(self, 'horizontal'),
            'vertical_green'        : GreenLightState(self, self.primaryMachineMotion, 'vertical'),
            'vertical_yellow'       : YellowLightState(self, self.primaryMachineMotion, 'vertical'),
            'vertical_red'          : RedLightState(self, 'vertical'),
            'pedestrian_crossing'   : PedestrianCrossingState(self)
        }

        return stateDictionary

    def getDefaultState(self):
        '''
        Returns the state that your Application begins in when a run begins. This string MUST
        map to a key in your state dictionary.

        returns:
            str
        '''
        return 'homing'
    
    def initialize(self):
        ''' 
        Called when the program starts. Note this is only called ONCE
        in the lifetime of your MachineApp. If you want to execute behavior
        every time you click start, see 'beforeRun'.
        
        In this method, you will initialize your machine motion instances 
        and configure them. You may also define variables that you'd like to access 
        and manipulate over the course of your MachineApp here.
        '''
        self.logger.info('Running initialization')
        
        self.primaryMachineMotion = MachineMotion('127.0.0.1')
        self.primaryMachineMotion.configAxis(1, 8, 250)
        self.primaryMachineMotion.configAxis(2, 8, 250)
        self.primaryMachineMotion.configAxis(3, 8, 250)
        self.primaryMachineMotion.configAxisDirection(1, 'positive')
        self.primaryMachineMotion.configAxisDirection(2, 'positive')
        self.primaryMachineMotion.configAxisDirection(3, 'positive')
        self.primaryMachineMotion.registerInput('push_button_1', 1, 1)
    
        self.isPedestrianButtonTriggered = False
        self.nextLightDirection = 'horizontal'

    def onStop(self):
        '''
        Called when a stop is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.

        Warning: This logic is happening in a separate thread.
        '''
        self.primaryMachineMotion.emitStop()

    def onPause(self):
        '''
        Called when a pause is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.
        
        Warning: This logic is happening in a separate thread.
        '''
        self.primaryMachineMotion.emitStop()

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

class HomingState(MachineAppState):
    def onEnter(self):
        self.engine.primaryMachineMotion.emitHomeAll()
        self.notifier.sendMessage(NotificationLevel.INFO, 'Moving to home')
        self.gotoState('horizontal_green')

    def onResume(self):
        self.gotoState('homing')

class MoveToInitialPositionState(MachineAppState):
    def onEnter(self):
        self.engine.primaryMachineMotion.emitSpeed(25)
        self.engine.primaryMachineMotion.emitCombinedAxisRelativeMove([1, 2], ['positive', 'positive'], [250, 250])
        self.notifier.sendMessage(NotificationLevel.INFO, 'Moving to the start position')

    def onResume(self):
        self.gotoState('homing')

class GreenLightState(MachineAppState):
    def __init__(self, engine, machineMotion, direction):
        super().__init__(engine)

        self.__machineMotion        = machineMotion
        self.__direction            = direction
        self.__speed                = self.configuration['fullSpeed']
        self.__durationSeconds      = self.configuration['greenTimer']
        self.__axis                 = 2 if self.__direction == 'vertical' else 1

    def onEnter(self):
        self.__startTimeSeconds = time.time()
        self.logger.info('{} direction entered the GREEN light state'.format(self.__direction))
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to GREEN for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'green', "speed": self.__speed })

        self.engine.primaryMachineMotion.setContinuousMove(self.__axis, self.__speed)

        def __onPedestrianButtonClicked(topic, msg):
            if msg == 'true':
                self.engine.isPedestrianButtonTriggered = True
                self.engine.nextLightDirection = 'vertical' if self.__direction == 'horizontal' else 'horizontal'
                self.gotoState(self.__direction + '_yellow')

        self.registerCallback(self.__machineMotion, self.__machineMotion.getInputTopic('push_button_1'), __onPedestrianButtonClicked)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.gotoState(self.__direction + '_yellow')

    def onLeave(self):
        self.engine.primaryMachineMotion.stopContinuousMove(self.__axis)

    def onPause(self):
        self.engine.primaryMachineMotion.stopContinuousMove(self.__axis)

    def onStop(self):
        self.engine.primaryMachineMotion.stopContinuousMove(self.__axis)

    def onResume(self):
        self.engine.primaryMachineMotion.setContinuousMove(self.__axis, self.__speed)

    def onEstop(self):
        self.engine.primaryMachineMotion.setContinuousMove(self.__axis, self.__speed)

class YellowLightState(MachineAppState):
    def __init__(self, engine, machineMotion, direction):
        super().__init__(engine)

        self.__machineMotion        = machineMotion
        self.__direction            = direction
        self.__speed                = self.configuration['slowSpeed']
        self.__durationSeconds      = self.configuration['yellowTimer']
        self.__axis                 = 2 if self.__direction == 'vertical' else 1

    def onEnter(self):
        self.__startTimeSeconds = time.time()
        self.logger.info('{} direction entered the YELLOW light state'.format(self.__direction))
        self.notifier.sendMessage(NotificationLevel.INFO, 'Set light to YELLOW for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'yellow', "speed": self.__speed })

        self.engine.primaryMachineMotion.setContinuousMove(self.__axis, self.__speed)

        def __onPedestrianButtonClicked(topic, msg):
            if msg == 'true':
                self.engine.isPedestrianButtonTriggered = True
                self.engine.nextLightDirection = 'vertical' if self.__direction == 'horizontal' else 'horizontal'

        self.registerCallback(self.__machineMotion, self.__machineMotion.getInputTopic('push_button_1'), __onPedestrianButtonClicked)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.gotoState(self.__direction + '_red')

    def onLeave(self):
        self.engine.primaryMachineMotion.stopContinuousMove(self.__axis)

    def onPause(self):
        self.engine.primaryMachineMotion.stopContinuousMove(self.__axis)

    def onStop(self):
        self.engine.primaryMachineMotion.stopContinuousMove(self.__axis)

    def onResume(self):
        self.engine.primaryMachineMotion.setContinuousMove(self.__axis, self.__speed)

    def onEstop(self):
        self.engine.primaryMachineMotion.setContinuousMove(self.__axis, self.__speed)

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
                self.gotoState('pedestrian_crossing')
            elif self.__direction == 'horizontal':
                self.gotoState('vertical_green')
            elif self.__direction == 'vertical':
                self.gotoState('horizontal_green')

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
            self.gotoState(self.__nextLightState)

    def onLeave(self):
        self.notifier.sendMessage(NotificationLevel.INFO, 'Pedestrians can NOT cross anymore', { 'pedestriansCrossing': False })
        self.engine.isPedestrianButtonTriggered = False

