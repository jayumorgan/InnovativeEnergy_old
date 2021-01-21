import logging
import time
from internal.fake_machine_motion import MachineMotion
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
from internal.notifier import NotificationLevel

class IdleState(MachineAppState):
    '''
    Example of a MachineAppState.

    The Idle state logs a message when you enter it. It then waits 3 seconds
    before requesting the MachineappEngine to move to the 'complete' state.
    '''

    def onEnter(self):
        self.logger.info('Entered the idle state')
        self.startTime = time.time()
        self.waitTimeSeconds = 3.0
        if 'waitTimeSeconds' in self.configuration:
            self.waitTimeSeconds = self.configuration['waitTimeSeconds']
        self.notifier.sendMessage(NotificationLevel.INFO, 'Waiting for {} seconds'.format(self.waitTimeSeconds))

    def update(self):
        if time.time() - self.startTime > self.waitTimeSeconds:
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

class MachineAppEngine(BaseMachineAppEngine):
    def initialize(self):
        self.machineMotionManager.register('primary', MachineMotion(), True)
        self.machineMotionManager.register('secondary', MachineMotion())

    def getDefaultState(self):
        return 'idle'

    def buildStateDictionary(self):
        stateDictionary = {
            'idle': IdleState(),
            'complete': CompleteState()
        }

        return stateDictionary

    def cleanup(self):
        pass