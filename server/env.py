import os
class Environment:
    '''
    Holds app-wide global variables.
    '''
    IS_DEVELOPMENT = not os.path.isdir('/var/lib/cloud9')

env = Environment()