import os
class Environment:
    IS_DEVELOPMENT = not os.path.isdir('/var/lib/cloud9')

env = Environment()