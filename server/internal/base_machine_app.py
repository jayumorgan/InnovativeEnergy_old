from abc import ABC, abstractmethod
import logging
from internal.notifier import getNotifier, NotificationLevel
import time
from internal.mqtt_topic_subscriber import MqttTopicSubscriber

class MachineAppState(ABC):
    '''
    Abstract class that defines a MachineAppState. If you want to create a new state,
    you will inherit this class and implement, at the minimum, the onEnter and onLeave
    methods. See IdleState for an example.
    '''
    
    def __init__(self, engine: 'BaseMachineAppEngine'):
        '''
        Constructor that initializes state that will remain consistent throguhout the
        duration of your program. Please note that this state node is NOT active at
        point of construction. Therefore, you should NOT do things like in the constructor
        such as:

        (1) Construct a MqttTopicSubscriber
        (2) Impact the state of your GlobalApp in anyway
        (3) Go to a new state
        etc.

        All of these behaviors should happen in onEnter instead.
        '''
        self.logger = logging.getLogger(__name__)
        self.notifier = getNotifier()
        self.engine = engine
        self.configuration = self.engine.getConfiguration()

        self.__mqttTopicSubscriberList = []

    def gotoState(self, state):
        '''
        Updates the MachineAppEngine to the provided state

        params:
            newState: str
                name of the state that you would like to transition to
        returns:
            bool
                successfully moved to the new state
        '''
        return self.engine.gotoState(state)

    def registerCallback(self, machineMotion: 'MachineMotion', topic: str, callback):
        ''' 
        Register a callback for a particular topic. Note that you should call removeCallback
        when you are finished.

        params:
            machineMotion: MachineMotion
                Machine whose MQTT topic you want to subscribe to

            topic: str
                MQTT topic that you'd like to subscribe to

            callback: func(topic: str, msg: str) -> void
                Callback that gets called when we receive data on that topic
        '''
        mqttSubscriber = None
        for subscriber in self.__mqttTopicSubscriberList:
            if subscriber.getMachineMotion() == machineMotion:
                mqttSubscriber = subscriber
                break

        if mqttSubscriber == None:
            mqttSubscriber = MqttTopicSubscriber(machineMotion)
            self.__mqttTopicSubscriberList.append(mqttSubscriber)

        mqttSubscriber.registerCallback(topic, callback)

    @abstractmethod
    def onEnter(self):
        ''' 
        Called whenever this state is entered
        '''
        pass

    def onLeave(self):
        ''' Called when we're transitioning out of this state '''
        pass

    def update(self):
        '''
        Called continuously while this state is active
        
        Default behavior: Do nothing
        '''
        pass

    def onPause(self):
        '''
        Called whenever we pause while we're in this state

        Default behavior: Do nothing
        
        '''
        pass

    def onResume(self):
        '''
        Called whenever we resume while we're in this state
        
        Default behavior: Do nothing
        '''
        pass

    def onStop(self):
        ''' 
        Called whenever we stop while we're in this state 

        Default behavior: Reset the engine state to the beginning of the state machine
        '''

        self.engine.resetState()
        pass

    def onEstop(self):
        ''' 
        Called whenever we estop while we're in this state 

        Default behavior: Do nothing
        '''
        pass

    def onEstopReleased(self):
        ''' 
        Called whenever we estop while we're in this state 

        Default behavior: Reset the engine state to the beginning of the state machine
        '''
        self.engine.resetState()
        pass

    def updateCallbacks(self):
        '''
        Warning: For internal use only.

        Updates all of the MQTT topic subscribers that you currently have active.
        '''
        for subscriber in self.__mqttTopicSubscriberList:
            subscriber.update()

    def freeCallbacks(self):
        '''
        Warning: For internal use only.

        Deletes all of the MQTT topic subscribers that you currently have active.
        '''
        for subscriber in self.__mqttTopicSubscriberList:
            subscriber.delete()

        self.__mqttTopicSubscriberList.clear()

class BaseMachineAppEngine(ABC):
    '''
    Base class for the MachineApp engine
    '''
    UPDATE_INTERVAL_SECONDS = 0.16

    def __init__(self):
        self.configuration  = None                                      # Python dictionary containing the loaded configuration payload
        self.logger         = logging.getLogger(__name__)               # Logger used to output information to the local log file and console
        
        # High-Level State variables
        self.isRunning      = False                                     # The MachineApp will execute while this flag is set
        self.isPaused       = False                                     # The machine app will not do any state updates while this flag is set
        self.isEstopped           = False                               # Set whenever we are in the Estop state
        self.__isSystemReleased   = False                               # Set whenever we release the system
        
        self.__shouldStart  = False                                     # Tells the MachineApp loop that it should begin processing the state machine
        self.__shouldStop   = False                                     # Tells the MachineApp loop that it should stop on its next update
        self.__shouldPause  = False                                     # Tells the MachineApp loop that it should pause on its next update
        self.__shouldResume = False                                     # Tells the MachineApp loop that it should resume on its next update
        self.__shouldEstop          = True                              # Tells the update loop that we have entered the e-stop state
        self.__shouldReleaseEstop   = False                             # Tells the update loop that we have released the e-stop and reset the system

        self.__currentState         = None                              # Active state of the engine
        self.__stateDictionary      = {}                                # Mapping of state names to MachineAppState definitions
        self.__notifier             = getNotifier()                     # Used to broadcast information to the Web App's console

        self.initialize()
        
    def resetState(self):
        self.isRunning = False
        self.__shouldStart = False
        self.__shouldStop = False
        self.isPaused = False
        self.__shouldPause = False
        self.__shouldResume = False
        self.__currentState = self.getDefaultState()

    @abstractmethod
    def initialize(self):
        ''' 
        Called at the start of the MachineApp. In this method, you will
        initialize your machine motion instances and configure them. You
        may also define variables that you'd like to access and manipulate
        over the course of your MachineApp here.
        '''
        pass

    @abstractmethod
    def getDefaultState(self):
        '''
        Returns the state that your Application begins in when a run begins. This string MUST
        map to a key in your state dictionary.

        returns:
            str
        '''
        return None

    @abstractmethod
    def buildStateDictionary(self):
        '''
        Builds and returns a dictionary that maps state names to MachineAppState.
        The MachineAppState class wraps callbacks for stateful transitions in your MachineApp.

        returns:
            dict<str, MachineAppState>
        '''
        return {}

    @abstractmethod
    def afterRun(self):
        '''
        Executed when execution of your MachineApp ends (i.e., when self.isRunning goes from True to False).
        This could be due to an estop, stop event, or something else.

        In this method, you can clean up any resources that you'd like to clean up, or do nothing at all.
        '''
        pass

    @abstractmethod
    def beforeRun(self):
        '''
        Called before every run of your MachineApp. This is where you might want to
        reset to a default state.
        '''
        pass

    @abstractmethod
    def getMasterMachineMotion(self):
        ''' 
        Returns the master machine motion, which will be used for estopping,
        releasing the estop, and resetting the system.
        
        returns:
            MachineMotion
        '''
        pass

    def getConfiguration(self):
        ''' Returns the current configuration '''
        return self.configuration

    def setConfiguration(self, configuration):
        ''' Set the configuration to the a python dictionary '''
        self.configuration = configuration

    def getCurrentState(self):
        '''
        Returns the implementation of MachineAppState that maps to the value of self.__currentState.
        If the mapping is invalid, we return None and log an error.

        returns:
            MachineAppState
        '''
        if self.__currentState == None:
            self.logger.error('Current state is none')
            return None

        if not self.__currentState in self.__stateDictionary:
            self.logger.error('Trying to retrieve an unknown state: {}'.format(self.__currentState))
            return None

        return self.__stateDictionary[self.__currentState]
        
    def gotoState(self, newState: str):
        '''
        Updates the MachineAppEngine to the provided state

        params:
            newState: str
                name of the state that you would like to transition to
        returns:
            bool
                successfully moved to the new state
        '''
        if not newState in self.__stateDictionary:
            self.logger.error('Trying to move to an unknown state: {}'.format(newState))
            return False

        if not self.__currentState == None:
            prevState = self.getCurrentState()
            if prevState != None:
                prevState.onLeave()
                prevState.freeCallbacks()

        self.__notifier.sendMessage(NotificationLevel.APP_STATE_CHANGE, 'Entered MachineApp state: {}'.format(newState))
        self.__currentState = newState
        nextState = self.getCurrentState()

        if nextState != None:
            nextState.onEnter()

        return True


    def loop(self):
        '''
        Main loop of your MachineApp. If we set __shouldStart to True, the MachineApp begins processing
        the nodes in its core loop.
        '''

        # Outer Loop dealing with e-stops and start functionality
        while True:
            if self.__shouldEstop:
                self.__notifier.sendMessage(NotificationLevel.APP_ESTOP, 'Machine is in estop')
                self.__shouldEstop = False

            if self.__shouldReleaseEstop:
                if self.__isSystemReleased:
                    self.__isSystemReleased = False
                    self.__notifier.sendMessage(NotificationLevel.APP_ESTOP_RELEASE, 'MachineApp estop released')
                    self.__shouldReleaseEstop = False

                    currentState = self.getCurrentState()
                    if currentState != None:
                        currentState.onEstopReleased()

            if self.__shouldStart:              # Running start behavior
                self.beforeRun()
                self.__stateDictionary = self.buildStateDictionary()

                self.__notifier.sendMessage(NotificationLevel.APP_START, 'MachineApp started')

                # Begin the Application by moving to the default state
                self.gotoState(self.getDefaultState())
                self.isRunning = True
                self.__shouldStart = False
            else:
                time.sleep(0.16)
                continue

            # Inner Loop running the actual MachineApp program
            while self.isRunning:
                if self.__shouldEstop:          # Running E-Stop behavior
                    self.__notifier.sendMessage(NotificationLevel.APP_ESTOP, 'Machine is in estop')
                    self.__shouldEstop = False
                    self.isRunning = False

                    currentState = self.getCurrentState()
                    if currentState != None:
                        currentState.onEstop()

                    break

                if self.__shouldStop:           # Running stop behavior
                    self.__shouldStop = False
                    self.isRunning = False

                    currentState = self.getCurrentState()
                    if currentState != None:
                        currentState.onStop()

                    break

                if self.__shouldPause:          # Running pause behavior
                    self.__notifier.sendMessage(NotificationLevel.APP_PAUSE, 'MachineApp paused')
                    self.__shouldPause = False
                    self.isPaused = True

                    currentState = self.getCurrentState()
                    if currentState != None:
                        currentState.onPause()

                if self.__shouldResume:         # Running resume behavior
                    self.__notifier.sendMessage(NotificationLevel.APP_RESUME, 'MachineApp resumed')
                    self.__shouldResume = False
                    self.isPaused = False

                    currentState = self.getCurrentState()
                    if currentState != None:
                        currentState.onResume()

                if self.isPaused:
                    time.sleep(BaseMachineAppEngine.UPDATE_INTERVAL_SECONDS)
                    continue

                currentState = self.getCurrentState()
                if currentState == None:
                    self.logger.error('Currently in an invalid state')
                    continue

                currentState.updateCallbacks()
                currentState.update()

                time.sleep(BaseMachineAppEngine.UPDATE_INTERVAL_SECONDS)

            self.logger.info('Exiting MachineApp loop')
            self.__notifier.sendMessage(NotificationLevel.APP_COMPLETE, 'MachineApp completed')
            self.afterRun()

    def start(self, configuration):
        '''
        Starts the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-enter behavior in your MachineAppStates instead
        '''
        if self.isRunning:
            return False

        self.setConfiguration(configuration)
        self.__shouldStart = True
        return True

    def pause(self):
        '''
        Pauses the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-pause behavior in your MachineAppStates instead
        '''
        self.logger.info('Pausing the MachineApp')
        self.__shouldPause = True

    def resume(self):
        '''
        Resumes the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-resume behavior in your MachineAppStates instead
        '''
        self.logger.info('Resuming the MachineApp')
        self.__shouldResume = True

    def stop(self):
        '''
        Stops the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-stop behavior in your MachineAppStates instead
        '''
        self.logger.info('Stopping the MachineApp')
        self.__shouldStop = True

    def estop(self):
        '''
        E-stops the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-estop behavior in your MachineAppStates instead
        '''
        self.isEstopped = True
        self.__isSystemReleased = False
        masterMachineMotion = self.getMasterMachineMotion()
        masterMachineMotion.triggerEstop()
        self.__shouldEstop = True
        self.logger.info('Estop triggered')
        return True

    def getEstop(self):
        ''' Returns whether or not the machine is currently in estop '''
        return self.isEstopped

    def releaseEstop(self):
        ''' Releases the estop of all machine motions '''
        masterMachineMotion = self.getMasterMachineMotion()
        masterMachineMotion.releaseEstop()
        self.__isSystemReleased = True
        self.logger.info('Estop released')
        return True

    def resetSystem(self):
        ''' Resets the system for all machine motions '''
        masterMachineMotion = self.getMasterMachineMotion()
        masterMachineMotion.resetSystem()
        self.__shouldReleaseEstop = True
        self.logger.info('System reset')
        return True