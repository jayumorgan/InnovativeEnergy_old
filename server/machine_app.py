#/usr/bin/python3

from env import env
import logging
import time
from internal.base_machine_app import MachineAppState, BaseMachineAppEngine
#new aka different from original get clairification 
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
            'Roll' 					: Roll(self),
			'Clamp'    			    : Clamp(self),
            'Cut'          		    : Cut(self),
			'Home'                  : HomingState(self), #home state rollers need to be down
			
			#'Move_Ballscrew'        : BallScrewState(self),
            #'Initial_Stretch'       : InitialStretchState(self),
            #'Regrip1'               : Regrip1State(self),
            #'Droop_Stretch'         : DroopStretchState(self),
            #'Pre_Vehicle_Arrives'   : PreVehicleArrivesState(self),            
            #'Vehicle_Arrives'       : VehicleArrivesState(self),
            #'Remove_Material'       : RemoveMaterialState(self),
            
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
        mm_IP = '192.168.7.2' #does this need to be in quotes or should I make it a float?
		self.MachineMotion = MachineMotion('192.168.7.2') #would this be the IP number？
        
		
		'''
		self.MachineMotion.configAxis(1, 8, 250) #is this axis, speed, ???
        self.MachineMotion.configAxis(2, 8, 250)
        self.MachineMotion.configAxis(3, 8, 250)
        self.MachineMotion.configAxisDirection(1, 'positive')
        self.MachineMotion.configAxisDirection(2, 'positive')
        self.MachineMotion.configAxisDirection(3, 'positive')
        self.MachineMotion.registerInput('push_button_1', 1, 1)  # Register an input with the provided name #I do not understand this
		'''

       
    
        # Setup your global variables
		'''
		What would be global variables???? Length? Number of sheets? time? Are the below global variables?
		'''
		
		# Timing Belts 
        self.timing_belt_axis = 1
        self.MachineMotion.configAxis(self.timing_belt_axis, 8, 150/5)
        self.MachineMotion.configAxisDirection(self.timing_belt_axis, 'positive')
		
		
		#pneumatics
		
		dio1 = mm_IP
        dio2 = mm_IP
		
		self.roller_pneumatic = Pneumatic("Roller Pneumatic", ipAddress=dio2, networkId=2, pushPin=2, pullPin=3) #I will need to find actual pin numbers
        
		self.plate_pneumatic = Pneumatic("Plate Pneumatic", ipAddress=dio2, networkId=2, pushPin=0, pullPin=1)
		
		self.knife_pneumatic = Pneumatic("Knife Pneumatic", ipAddress=dio1, networkId=1, pushPin=0, pullPin=1)
		
		 # for now all IO are on the same MM, but in the future may need to have iomonitor on each mm with an IO
		 
        self.iomonitor = IOMonitor(self.MachineMotion)
        self.iomonitor.startMonitoring("roller_down_cmb", False, 1, 1) #unsure of the false/true but guess numbers after refer to push/pull pins
		self.iomonitor.startMonitoring("roller_down_fbk", True, 1, 0)
		self.iomonitor.startMonitoring("roller_up_cmb", False, 1, 0)
		self.iomonitor.startMonitoring("roller_up_fbk", True, 1, 1)

		
		self.iomonitor.startMonitoring("plate_down_cmb", False, 1, 3)
		self.iomonitor.startMonitoring("plate_down_fbk", True, 1, 2)
		self.iomonitor.startMonitoring("plate_up_cmb", False, 1, 2)
		self.iomonitor.startMonitoring("plate_up_fbk", True, 1, 3)
		
		self.iomonitor.startMonitoring("knife_out_cmb", False, 1, 3)#don't actually know the pins yet
		self.iomonitor.startMonitoring("knife_out_fbk", True, 1, 2)
		self.iomonitor.startMonitoring("knife_in_cmb", False, 1, 2)
		self.iomonitor.startMonitoring("knife_in_fbk", True, 1, 3)
		
		
		
			#what is the difference between the fbk and cmd in example code
		'''	
        self.iomonitor.startMonitoring("return_roller_down_fbk", True, 1, 0)
        self.iomonitor.startMonitoring("return_roller_up_cmd", False, 1, 0)
        self.iomonitor.startMonitoring("return_roller_up_fbk", True, 1, 1)
        self.iomonitor.startMonitoring("mobile_release_cmd", False, 1, 3)
        self.iomonitor.startMonitoring("mobile_released_fbk", True, 1, 2)
        self.iomonitor.startMonitoring("mobile_clamp_cmd", False, 1, 2)
        self.iomonitor.startMonitoring("mobile_clamped_fbk", True, 1, 3)
        self.iomonitor.startMonitoring("fixed_clamp_cmd", False, 2, 1)
        self.iomonitor.startMonitoring("fixed_clamped_fbk", True, 2, 0)
        self.iomonitor.startMonitoring("fixed_release_cmd", False, 2, 0)
        self.iomonitor.startMonitoring("fixed_released_fbk", True, 2, 1)
        self.iomonitor.startMonitoring("hot_wire_cmd", False, 2, 3)
        self.iomonitor.startMonitoring("air_nozzle_cmd", False, 3, 1)
        self.iomonitor.startMonitoring("air_master_cmd", False, 3, 0)
		'''
		
		

    def onStop(self):
        '''
        Called when a stop is requested from the REST API. 99% of the time, you will
        simply call 'emitStop' on all of your machine motions in this methiod.

        Warning: This logic is happening in a separate thread. EmitStops are allowed in
        this method.
        '''
        self.MachineMotion.emitStop()
       
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


#Need some sort of code to tie into UI to take in inputs
#Length = input()
#Num_Sheets = input()		
		
class Home(MachineAppState): #explain this line. what does machineappstate come from
	'''
	Homes our primary machine motion, and sends a message when complete.
	'''
	def onEnter(self):
		self.engine.MachineMotion.emitHomeAll() #Need explaination 
		self.notifier.sendMessage(NotificationLevel.INFO,'Moving to home')
		self.gotoState('Feed_New_Roll')
		
	def onResume(self):
		self.gotoState('Home')

class Feed_New_Roll(MachineAppState):
	''' Starts with the clamps up to feed roll'''
	#do I need def __init__
	
	def onEnter(self):
		#set rollers up
		#pause wait for input. when input received 
		#set rollers down
		
		self.gotoState('Roll')
	
	def update(self): #not sure what this is for
		pass	
			
			
class Roll(MachineAppState):
    '''
    Activate rollers to roll material
    '''
    def __init__(self, engine):
        super().__init__(engine) #what is super? is it important?

    def onEnter(self):
   		machinemotion.emitRelativeMove(axis,distance) #will need to find out axis and create input variable for distance
		self.gotoState('Clamp')

    def update(self):
        pass
		
		
class Clamp(MachineAppState):
	def __init__(self, engine):
        super().__init__(engine) 

    def onEnter(self):
   		#clamp goes down
		self.gotoState('Cut')

    def update(self):
        pass


class Cut(MachineAppState):
	def __init__(self, engine):
        super().__init__(engine) 
		
    def onEnter(self):
   		#activate pneumatic knife to go out
		#timing belt move
		
		#Num_Sheets - 1
		
		#if Num_Sheets > 0:
		
		self.gotoState('Home')
		
		#else:
			#stop

    def update(self):
        pass

	
