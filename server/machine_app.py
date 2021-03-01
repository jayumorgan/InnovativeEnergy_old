#/usr/bin/python3

from env import env
import logging
import time
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
from internal.notifier import NotificationLevel, sendNotification
from internal.io_monitor import IOMonitor

'''
If we are in development mode (i.e. running locally), we initialize a mocked instance of machine motion.
This fake MachineMotion interface is used ONLY when developing locally on your own machine motion, so
that you have a good idea of whether or not your application properly builds.
''' 
if env.IS_DEVELOPMENT:
    from internal.fake_machine_motion import MachineMotion
else:
    from internal.machine_motion import MachineMotion

class MachineAppEngine(BaseMachineAppEngine):
    ''' Manages and orchestrates your MachineAppStates '''

    def buildStateDictionary(self):
        '''
        Builds and returns a dictionary that maps state names to MachineAppState.
        The MachineAppState class wraps callbacks for stateful transitions in your MachineApp.

        Note that this dictionary is built when your application starts, not when you click the
        'Play' button.

        returns:
            dict<str, MachineAppState>
        '''
        stateDictionary = {
            'homing'                : HomingState(self),
            'move_to_start'         : MoveToInitialPositionState(self),
            'horizontal_green'      : GreenLightState(self, 'horizontal'),
            'horizontal_yellow'     : YellowLightState(self, 'horizontal'),
            'horizontal_red'        : RedLightState(self, 'horizontal'),
            'vertical_green'        : GreenLightState(self, 'vertical'),
            'vertical_yellow'       : YellowLightState(self, 'vertical'),
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
        Called when you press play in the UI.
        
        In this method, you will initialize your machine motion instances 
        and configure them. You may also define variables that you'd like to access 
        and manipulate over the course of your MachineApp here.
        '''
        self.logger.info('Running initialization')
        
        # Create and configure your machine motion instances
        self.primaryMachineMotion = MachineMotion('127.0.0.1')
        self.primaryMachineMotion.configAxis(1, 8, 250)
        self.primaryMachineMotion.configAxis(2, 8, 250)
        self.primaryMachineMotion.configAxis(3, 8, 250)
        self.primaryMachineMotion.configAxisDirection(1, 'positive')
        self.primaryMachineMotion.configAxisDirection(2, 'positive')
        self.primaryMachineMotion.configAxisDirection(3, 'positive')
        self.primaryMachineMotion.registerInput('push_button_1', 1, 1)  # Register an input with the provided name

        self.primaryIoMonitor = IOMonitor(self.primaryMachineMotion)
        self.primaryIoMonitor.startMonitoring('push_button_1', True, 1, 1)

        self.secondaryMachineMotion = MachineMotion('127.0.0.1')
        self.secondaryMachineMotion.configAxis(1, 8, 250)
        self.secondaryMachineMotion.configAxis(2, 8, 250)
        self.secondaryMachineMotion.configAxis(3, 8, 250)
        self.secondaryMachineMotion.configAxisDirection(1, 'positive')
        self.secondaryMachineMotion.configAxisDirection(2, 'positive')
        self.secondaryMachineMotion.configAxisDirection(3, 'positive')
    
        # Setup your global variables
        self.isPedestrianButtonTriggered = False
        self.nextLightDirection = 'horizontal'

    def onStop(self):
        '''
        Called when a stop is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.
        '''
        self.primaryMachineMotion.emitStop()
        self.secondaryMachineMotion.emitStop()

    def onPause(self):
        '''
        Called when a pause is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.
        '''
        self.primaryMachineMotion.emitStop()
        self.secondaryMachineMotion.emitStop()

    def onEstop(self):
        '''
        Called AFTER the MachineMotion has been estopped. Please note that any state
        that you were using will no longer be available at this point. You should
        most likely reset all IOs to the OFF position in this method.
        '''
        pass

    def onResume(self):
        pass

    def afterRun(self):
        '''
        Executed when execution of your MachineApp ends (i.e., when self.isRunning goes from True to False).
        This could be due to an estop, stop event, or something else.

        In this method, you can clean up any resources that you'd like to clean up, or do nothing at all.
        '''
        pass

class HomingState(MachineAppState):
    '''
    Homes our primary machine motion, and sends a message when complete.
    '''
    def onEnter(self):
        self.engine.primaryMachineMotion.emitHomeAll()
        sendNotification(NotificationLevel.INFO, 'Moving to home')
        self.gotoState('horizontal_green')

    def onResume(self):
        self.gotoState('homing')

class MoveToInitialPositionState(MachineAppState):
    '''
    Moves our X and Y axes to their initial position.
    '''
    def onEnter(self):
        self.engine.primaryMachineMotion.emitSpeed(25)
        self.engine.primaryMachineMotion.emitCombinedAxisRelativeMove([1, 2], ['positive', 'positive'], [250, 250])
        sendNotification(NotificationLevel.INFO, 'Moving to the start position')

    def onResume(self):
        '''
        When we resume after pausing at this stage, we return to the 'homing' state
        '''
        self.gotoState('homing')

class GreenLightState(MachineAppState):
    ''' Runs the green-light behavior for the given direction '''
    def __init__(self, engine, direction):
        super().__init__(engine)

        self.__direction            = direction
        self.__speed                = self.configuration['fullSpeed']
        self.__durationSeconds      = self.configuration['greenTimer']
        self.__machineMotion        = self.engine.primaryMachineMotion if self.__direction == 'horizontal' else self.engine.secondaryMachineMotion
        self.__axis                 = 2 if self.__direction == 'vertical' else 1

    def onEnter(self):
        self.logger.info('{} direction entered the GREEN light state'.format(self.__direction))
        
        # Record the time that we entered this state
        self.__startTimeSeconds = time.time()

        # Inform the frontend's console that we've entered this state. See Notifier::sendMessage for more information
        # on the parameters defined here.
        sendNotification(NotificationLevel.INFO, 'Set light to GREEN for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'green', "speed": self.__speed })

        # Register a callback that gets set when the push button is clicked
        def __onPedestrianButtonClicked(topic, msg):
            if msg == 'true':
                self.engine.isPedestrianButtonTriggered = True
                self.engine.nextLightDirection = 'vertical' if self.__direction == 'horizontal' else 'horizontal'
                self.gotoState(self.__direction + '_yellow')

        self.registerCallback(self.engine.primaryMachineMotion, 'push_button_1', __onPedestrianButtonClicked)

        # Set the axis moving
        self.__machineMotion.setContinuousMove(self.__axis, self.__speed)

    def update(self):   # This method gets called every 0.16 seconds
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.gotoState(self.__direction + '_yellow')

    def onLeave(self):      # Stop the continuous move when we leave this state
        self.__machineMotion.stopContinuousMove(self.__axis)

    def onPause(self):      # Stop the continuous move when we pause in this state
        self.__machineMotion.stopContinuousMove(self.__axis)

    def onStop(self):       # Stop the continuous move when we receive a stop in this state
        self.__machineMotion.stopContinuousMove(self.__axis)

    def onResume(self):     # Restart the continuous move when we receive a 
        self.__machineMotion.setContinuousMove(self.__axis, self.__speed)

class YellowLightState(MachineAppState):
    ''' Runs the yellow-light behavior for the given direction '''
    def __init__(self, engine, direction):
        super().__init__(engine)

        self.__direction            = direction
        self.__speed                = self.configuration['slowSpeed']
        self.__durationSeconds      = self.configuration['yellowTimer']
        self.__machineMotion        = self.engine.primaryMachineMotion if self.__direction == 'horizontal' else self.engine.secondaryMachineMotion
        self.__axis                 = 2 if self.__direction == 'vertical' else 1

    def onEnter(self):
        self.__startTimeSeconds = time.time()
        self.logger.info('{} direction entered the YELLOW light state'.format(self.__direction))
        sendNotification(NotificationLevel.INFO, 'Set light to YELLOW for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'yellow', "speed": self.__speed })

        def __onPedestrianButtonClicked(topic, msg):
            if msg == 'true':
                self.engine.isPedestrianButtonTriggered = True
                self.engine.nextLightDirection = 'vertical' if self.__direction == 'horizontal' else 'horizontal'

        self.registerCallback(self.engine.primaryMachineMotion, 'push_button_1', __onPedestrianButtonClicked)
        
        self.__machineMotion.setContinuousMove(self.__axis, self.__speed)

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.gotoState(self.__direction + '_red')

    def onLeave(self):
        self.__machineMotion.stopContinuousMove(self.__axis)

    def onPause(self):
        self.__machineMotion.stopContinuousMove(self.__axis)

    def onStop(self):
        self.__machineMotion.stopContinuousMove(self.__axis)

    def onResume(self):
        self.__machineMotion.setContinuousMove(self.__axis, self.__speed)

class RedLightState(MachineAppState):
    ''' Runs the red light state for the given direction '''
    def __init__(self, engine, direction):
        super().__init__(engine)

        self.__direction        = direction
        self.__durationSeconds  = self.configuration['redTimer']
        
    def onEnter(self):
        self.logger.info('{} direction entered the RED light state'.format(self.__direction))
        sendNotification(NotificationLevel.INFO, 'Set light to RED for {} conveyor'.format(self.__direction), 
            { "direction": self.__direction, "color": 'red', "speed": 0 })

        self.__startTimeSeconds = time.time()
        
    def update(self):
        # After the provided stop light duration, we go to the pedestrian_crossing state
        # if the global variable on the engine is set to true. Otherwise, we try and go
        # to the next valid green light state.

        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            if self.engine.isPedestrianButtonTriggered:
                self.gotoState('pedestrian_crossing')
            elif self.__direction == 'horizontal':
                self.gotoState('vertical_green')
            elif self.__direction == 'vertical':
                self.gotoState('horizontal_green')

class PedestrianCrossingState(MachineAppState):
    ''' Runs the pedestrian crossing state '''

    def onEnter(self):
        self.__durationSeconds  = self.configuration['pedestrianTimer']
        self.logger.info('Pedestrian crossing initialized')
        sendNotification(NotificationLevel.INFO, 'Pedestrians can now cross', { 'pedestriansCrossing': True })
        self.__nextLightState = self.engine.nextLightDirection + '_green'
        self.__startTimeSeconds = time.time()

    def update(self):
        if time.time() - self.__startTimeSeconds >= self.__durationSeconds:
            self.gotoState(self.__nextLightState)

    def onLeave(self):
        sendNotification(NotificationLevel.INFO, 'Pedestrians can NOT cross anymore', { 'pedestriansCrossing': False })
        self.engine.isPedestrianButtonTriggered = False

