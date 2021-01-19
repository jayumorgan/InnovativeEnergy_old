from services import ConfigurationService
import logging
import time
from abc import ABC, abstractmethod

class MachineAppState(ABC):
    '''
    Abstract class that defines a MachineAppState. If you want to create a new state,
    you will inherit this class and implement, at the minimum, the onEnter and onLeave
    methods. See IdleState for an example.
    '''
    
    def __init__(self, engine: 'MachineAppEngine'):
        self.engine = engine
        self.logger = logging.getLogger(__name__)

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
        '''Called whenever we stop while we're in this state'''
        pass

class IdleState(MachineAppState):
    '''
    Example of a MachineAppState.

    The Idle state logs a message when you enter it. It then waits 3 seconds
    before requesting the MachineappEngine to move to the 'complete' state.
    '''

    def onEnter(self):
        self.logger.info('Entered the idle state')
        self.startTime = time.time()

    def update(self):
        if time.time() - self.startTime > 3.0:
            self.engine.gotoState('complete')

    def onLeave(self):
        self.logger.info('Exiting the idle state')

class CompleteState(MachineAppState):
    '''
    Example of a MachineAppState

    The CompleteState stops the MachineAppEngine entirely
    '''

    def onEnter(self):
        self.logger.info('Entered the complete state')
        self.engine.stop()

    def onLeave(self):
        self.logger.info('Exiting the complete state')

class MachineAppEngine:
    UPDATE_INTERVAL_SECONDS = 0.16

    def __init__(self, configurationType, configurationId):
        self.__logger = logging.getLogger(__name__)                 # Logger used to output information to the local log file and console

        self.__configurationService = ConfigurationService()        # Used to load configurations from disk
        (foundConfiguration, configuration) = self.__configurationService.getConfiguration(configurationType, configurationId)

        if not foundConfiguration:
            self.__logger.error('Unable to load specified configuration: type={}, id={}'.format(configurationType, configurationId))
            return

        self.__logger.info('Loaded configuration. type={}, name={}, id={}'.format(configurationType, self.__configuration["name"], self.__configuration["id"]))

        self.__configuration = configuration["payload"]             # Python dictionary containing the loaded configuration
        self.__isRunning = True                                     # The MachineApp will execute while this flag is set
        self.__shouldStop = False                                   # Tells the MachineApp loop that it should stop on its next update
        self.__isPaused = False                                     # The machine app will not do any state updates while this flag is set
        self.__shouldPause = False                                  # Tells the MachineApp loop that it should pause on its next update
        self.__shouldResume = False                                 # Tells the MachineApp loop that it should resume on its next update

        self.__defaultState = 'idle'                                # State that the application will begin in
        self.__currentState = None                                  # Active state of the engine
        self.__stateDictionary = self.buildStateDictionary()        # Mapping of state names to MachineAppState definitions

        self.loop()                                                 # Start the update loop, which runs until the program is completed or stopped

    def buildStateDictionary(self):
        '''
        Builds and returns a dictionary that maps state names to MachineAppState.
        The MachineAppState class wraps callbacks for stateful transitions in your MachineApp.
        '''
        stateDictionary = {
            'idle': IdleState(self),
            'complete': CompleteState(self)
        }

        return stateDictionary

    def getCurrentState(self):
        '''
        Returns the implementation of MachineAppState that maps to the value of self.__currentState.
        If the mapping is invalid, we return None and log an error.
        '''
        if not self.__currentState in self.__stateDictionary:
            self.__logger.error('Trying to retrieve an unknown state: {}'.format(self.__currentState))
            return None

        return self.__stateDictionary[self.__currentState]
        
    def gotoState(self, newState: str):
        '''
        Updates the MachineAppEngine to the provided state
        '''
        if not newState in self.__stateDictionary:
            self.__logger.error('Trying to move to an unknown state: {}'.format(newState))
            return False

        prevState = self.getCurrentState()
        if prevState != None:
            prevState.onLeave()

        self.__currentState = newState
        nextState = self.getCurrentState()

        if nextState != None:
            nextState.onEnter()

        return True


    def loop(self):
        '''
        Main loop of your MachineApp. Will run while the machine App is active
        '''

        # Begin the Application by moving to the default state
        self.gotoState(self.__defaultState)

        while self.__isRunning:
            if self.__shouldStop:
                self.__shouldStop = False
                self.__isRunning = False

            if self.__shouldPause:
                self.__shouldPause = False
                self.__isPaused = True

            if self.__shouldResume:
                self.__shouldResume = False
                self.__isPaused = False

            if self.__isPaused:
                time.sleep(MachineAppEngine.UPDATE_INTERVAL_SECONDS)

            currentState = self.getCurrentState()
            if currentState == None:
                self.__logger.error('Currently in an invalid state')
                continue

            currentState.update()

            time.sleep(MachineAppEngine.UPDATE_INTERVAL_SECONDS)

        self.cleanup()

    def pause(self):
        '''
        Pauses the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-pause behavior in your MachineAppStates instead
        '''
        self.__logger.info('Pausing the MachineApp')
        self.__shouldPause = True

    def resume(self):
        '''
        Resumes the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-resume behavior in your MachineAppStates instead
        '''
        self.__logger.info('Resuming the MachineApp')
        self.__shouldResume = True

    def stop(self):
        '''
        Stops the MachineApp loop.
        
        Warning: Logic in here is happening in a different thread. You should only 
        alter this behavior if you know what you are doing. It is recommended that
        you implement any on-stop behavior in your MachineAppStates instead
        '''
        self.__logger.info('Stopping the MachineApp')
        self.__shouldStop = False

    def cleanup(self):
        '''
        Called when the program exits. Used to clean up your MachineApp so that you stop
        in a nice state.
        '''
        currentState = self.getCurrentState()
        if currentState != None:
            currentState.onStop()

        self.__currentState = None