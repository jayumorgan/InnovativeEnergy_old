from abc import ABC, abstractmethod
import logging
from internal.notifier import getNotifier

class MachineAppState(ABC):
    '''
    Abstract class that defines a MachineAppState. If you want to create a new state,
    you will inherit this class and implement, at the minimum, the onEnter and onLeave
    methods. See IdleState for an example.
    '''
    
    def __init__(self, engine: 'MachineAppEngine'):
        self.engine = engine
        self.configuration = self.engine.configuration
        self.logger = logging.getLogger(__name__)
        self.notifier = getNotifier()

    @abstractmethod
    def onEnter(self):
        ''' Called whenever this state is entered'''
        pass

    def update(self):
        ''' Called continuously while this state is active'''
        pass

    @abstractmethod
    def onLeave(self):
        ''' Called when we're transitioning out of this state '''
        pass

    def onPause(self):
        ''' Called whenever we pause while we're in this state'''
        pass

    def onResume(self):
        ''' Called whenever we resume while we're in this state'''
        pass

    def onStop(self):
        ''' Called whenever we stop while we're in this state '''
        pass

    def onEstop(self):
        pass

    def onEstopReleased(self):
        pass

class BaseMachineAppEngine(ABC):
    '''
    Base class for the MachineApp engine
    '''
    UPDATE_INTERVAL_SECONDS = 0.16

    def __init__(self):
        self.configuration = None                                  # Python dictionary containing the loaded configuration payload
        self.logger = logging.getLogger(__name__)                   # Logger used to output information to the local log file and console
        self.isRunning = True                                     # The MachineApp will execute while this flag is set
        self.__shouldStop = False                                   # Tells the MachineApp loop that it should stop on its next update
        self.isPaused = False                                     # The machine app will not do any state updates while this flag is set
        self.__shouldPause = False                                  # Tells the MachineApp loop that it should pause on its next update
        self.__shouldResume = False                                 # Tells the MachineApp loop that it should resume on its next update

        self.__currentState = None                                  # Active state of the engine
        self.__stateDictionary = self.buildStateDictionary()        # Mapping of state names to MachineAppState definitions
        self.__notifier = getNotifier()                             # Used to broadcast information to the Web App's console

    @abstractmethod
    def getDefaultState(self):
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
    def cleanup(self):
        ''' Executed when the MachineApp loop exits '''
        pass

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

        self.__currentState = newState
        nextState = self.getCurrentState()

        if nextState != None:
            nextState.onEnter()

        self.__notifier.sendMessage(NotificationLevel.APP_STATE_CHANGE, 'Entered MachineApp state: {}'.format(newState))

        return True


    def loop(self):
        '''
        Main loop of your MachineApp. Will run while the machine App is active
        '''
        self.__notifier.sendMessage(NotificationLevel.APP_START, 'MachineApp started')

        # Begin the Application by moving to the default state
        self.gotoState(self.getDefaultState())

        while self.isRunning:
            if self.__shouldStop:
                self.__shouldStop = False
                self.isRunning = False

            if self.__shouldPause:
                self.__notifier.sendMessage(NotificationLevel.APP_PAUSE, 'MachineApp paused')
                self.__shouldPause = False
                self.isPaused = True

            if self.__shouldResume:
                self.__notifier.sendMessage(NotificationLevel.APP_RESUME, 'MachineApp resumed')
                self.__shouldResume = False
                self.isPaused = False

            if self.isPaused:
                time.sleep(MachineAppEngine.UPDATE_INTERVAL_SECONDS)

            currentState = self.getCurrentState()
            if currentState == None:
                self.logger.error('Currently in an invalid state')
                continue

            currentState.update()

            time.sleep(MachineAppEngine.UPDATE_INTERVAL_SECONDS)

        self.logger.info('Exiting MachineApp loop')
        self.__internalCleanup()
        self.__notifier.sendMessage(NotificationLevel.APP_COMPLETE, 'MachineApp completed')

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

    def __internalCleanup(self):
        '''
        Called when the program exits. Used to clean up your MachineApp so that you stop
        in a nice state.
        '''
        currentState = self.getCurrentState()
        if currentState != None:
            currentState.onStop()

        self.__currentState = None
        self.cleanup()
