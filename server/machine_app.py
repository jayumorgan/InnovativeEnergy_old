#/usr/bin/python3

from env import env
import logging
import time
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
#new from template needed in this program 
from internal.notifier import NotificationLevel, sendNotification, getNotifier
from internal.io_monitor import IOMonitor
from sensor import Sensor
from digital_out import Digital_Out
from pneumatic import Pneumatic
#from math import ceil, sqrt #may or maynot need math

'''
If we are in development mode (i.e. running locally), we Initialize a mocked instance of machine motion.
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
            'Initialize'            : InitializeState(self),
            'Feed_New_Roll'         : FeedNewRollState(self),
            'Roll' 		    : Roll(self),
	    'Clamp'     	    : Clamp(self),
            'Cut'          	    : Cut(self),
	    'Home'                  : HomingState(self), #home state rollers need to be down
	    #First_Roll state needs to be added	
	    
            
        }

        return stateDictionary
		
	def getDefaultState(self):
        '''
        Returns the state that your Application begins in when a run begins. This string MUST
        map to a key in your state dictionary.

        returns:
            str
        '''
        return 'Initialize'
    
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
        
        # Create and configure your machine motion instances
        mm_IP = '192.168.7.2' 
	self.MachineMotion = MachineMotion(mm_IP) 
		
	'''
	example code below shows how to configure Axis (the actuator #)
	self.MachineMotion.configAxis(1, 8, 250) #refer to API and ASD. 1 is axis, 8 is microstep (keep), 250 is mechanical gain. 319.186mm is mechanical gain for the rollers
        self.MachineMotion.configAxis(2, 8, 250) 
        self.MachineMotion.configAxis(3, 8, 250)
        self.MachineMotion.configAxisDirection(1, 'positive')
        self.MachineMotion.configAxisDirection(2, 'positive')
        self.MachineMotion.configAxisDirection(3, 'positive')
        self.MachineMotion.registerInput('push_button_1', 1, 1)  # Register an input with the provided name #I do not understand this
	'''

	# Timing Belts 
        self.timing_belt_axis = 1 #is this the actuator number?
        self.MachineMotion.configAxis(self.timing_belt_axis, 8, 150) #150 is for mechanical gain for timing belt. If gearbox used then divide by 5
        self.MachineMotion.configAxisDirection(self.timing_belt_axis, 'positive')
		
	#Rollers
	self.roller_axisf = 2
	self.MachineMotion.configAxis(self.roller_axis, 8, 319.186) #need to update last two spots
	self.MachineMotion.configAxisDirection(self.roller_axis, 'positive')
	
	#pneumatics
		
	dio1 = mm_IP
        dio2 = mm_IP
		
	self.knife_pneumatic = Pneumatic("Knife Pneumatic", ipAddress=dio1, networkId=1, pushPin=0, pullPin=1) #will need to update if this changes once dovetail arrives	
	self.roller_pneumatic = Pneumatic("Roller Pneumatic", ipAddress=dio2, networkId=2, pushPin=0, pullPin=1) #I will need to find actual pin numbers #also what is difference between pushPin and pullPin
        self.plate_pneumatic = Pneumatic("Plate Pneumatic", ipAddress=dio2, networkId=2, pushPin=2, pullPin=3)
    	
	#outputs
	self.knife_output = Digital_Out("Knife Output", ipAddress=dio1, networkId=1, pin=0) #double check correct when knife installed
	
        # Setup your global variables
	Length = input() #this will need to be tied to the UI
	Num_of_sheets = input() #this will need to be tied to the UI
	Roller_speed = 100 
	Roller_accel = 100
	TimingBelt_speed = 900
	TimingBelt_accel = 850
		

    def onStop(self):
        '''
        Called when a stop is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.

        Warning: This logic is happening in a separate thread. EmitStops are allowed in
        this method.
        '''
        self.MachineMotion.emitStop()
	self.knife_output.low() #knife goes down
	#self.roller_pneumatic.release() #this will release the pneumatics and lower the rollers
	#self.roller_pneumatic.pull() #double check 
	self.MachineMotion.emitHome(self.timing_belt_axis) #knife goes to home
       
    def onPause(self):
        '''
        Called when a pause is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.
        
        Warning: This logic is happening in a separate thread. EmitStops are allowed in
        this method.
        '''
        self.MachineMotion.emitStop() 
	
	
    def beforeRun(self):
        '''
        Called before every run of your MachineApp. This is where you might want to reset to a default state.
        '''
	
	#Can I add below?
	'''
	#check if there is a roll
	self.knife_output.low()
	self.roller_pneumatic.pull()
	self.plate_pneumatic.pull()
	self.engine.MachineMotion.emitHome(self.timing_belt_axis)
	'''
	pass
		
       #should I use beforeRun(self) or afterRun(self)? I don't really understand this part
	
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
        return self.MachineMotion

	
		

class Feed_New_Roll(MachineAppState):
	''' Starts with the clamps up to feed roll'''
	
	def __init__(self, engine):
        	super().__init__(engine)

	def onEnter(self):
		#check if there is a roll
		self.knife_output.low()
		self.roller_pneumatic.pull()
		self.plate_pneumatic.pull()
		self.engine.MachineMotion.emitHome(self.timing_belt_axis)
		#wait for input. need to add UI button. When input received, 'Roll Loaded' 
		self.roller_pneumatic.push()
		#if flag set = 1 called First Roll
		#possibly add code to first roll state
		
		self.gotoState('Roll')
	
	def update(self): 
		pass	
	
	
class Home(MachineAppState): 
	'''
	Homes our primary machine motion, and sends a message when complete.
	'''
	def __init__(self, engine):
        	super().__init__(engine)

	def onEnter(self):
		self.knife_output.low()
		self.MachineMotion.waitForMotionCompletion() #is this correct usage?
		self.engine.MachineMotion.emitAbsoluteMove(self.timing_belt_axis,0) #moves timing belt to Home position (0)
		#self.notifier.sendMessage(NotificationLevel.INFO,'Moving to home')
		self.roller_pneumatic.release()
		
		self.gotoState('Roll')
		
	#def onResume(self):
	#	self.gotoState('Initialize')	#I don't remember why this is here
	
	def update(self): 
		pass	
	
			
class Roll(MachineAppState):
    '''
    Activate rollers to roll material
    '''
    def __init__(self, engine):
        super().__init__(engine) 

    def onEnter(self):
	#check sensor to see if there is still a roll
	'''
	If there is a roll then continue, 
	if not,
	self.MachineMotion.emitStop()
	self.gotoState('Feed_New_Roll')
	'''
	#check last cut to see if it was finished
	#if not, create pop up notification to check last cut
	
	'''
	if self.roller_pneumatic.pull() = false:
		self.roller_pneumatic.push()
		self.roller_pneumatic.release()
	elif self.plate_pneumatic.pull() = false:
		self.plate_pneumatic.pull()
	elif self.knife_output.low() = false:
		self.knife_output.low()
	
	'''
	
	self.engine.MachineMotion.emitAbsoluteMove(self.timing_belt_axis,0)
	self.engine.MachineMotion.emitSpeed(Roller_speed)
	self.engine.MachineMotion.emitAcceleration(Roller_accel)
   	self.engine.MachineMotion.emitRelativeMove(self.roller_axis,distance) #Distance will be pulled from Global Variable Length input
	self.engine.MachineMotion.waitForMotionCompletion()
	self.gotoState('Clamp')

    def update(self):
        pass
		
		
class Clamp(MachineAppState):
    def __init__(self, engine):
        super().__init__(engine) 

    def onEnter(self):
	#check sensor to see if there is still a roll
	'''
	If there is a roll then continue, 
	if not,
	self.MachineMotion.emitStop()
	self.gotoState('Feed_New_Roll')
	'''
	#check last cut to see if it was finished
	#if not, create pop up notification to check last cut
	
	'''
	if self.knife_output.low() = false
		self.knife_output.low()
	'''
	
	self.engine.MachineMotion.emitAbsoluteMove(self.timing_belt_axis,0)
   	self.plate_pneumatic.push()
	self.MachineMotion.waitForMotionCompletion() #is this correct?
	self.gotoState('Cut')

    def update(self):
        pass


class Cut(MachineAppState):
    def __init__(self, engine):
        super().__init__(engine) 
		
    def onEnter(self):
   	self.engine.MachineMotion.emitAbsoluteMove(self.timing_belt_axis,0)
	self.knife_output.high() #is this correct to bring knife up?
	self.engine.MachineMotion.emitSpeed(TimingBelt_speed)
	self.engine.MachineMotion.emitAcceleration(TimingBelt_accel)
	self.engine.MachineMotion.emitRelativeMove(self.timing_belt_axis, "positive",1900) 
        self.engine.MachineMotion.waitForMotionCompletion()
	self.knife_output.low()
		
	#Num_Sheets - 1
		
	#if Num_Sheets > 0:
		
		self.gotoState('Home')
		
	#else:
		#self.engine.stop()
	

    def update(self):
        pass

	
