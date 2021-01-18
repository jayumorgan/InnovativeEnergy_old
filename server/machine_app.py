from app import ConfigurationService
import logging

class MachineApp:
    def __init__(self, pType, pConfigurationId):
        self.__logger = logging.getLogger(__name__)
        configurationService = ConfigurationService()
        (foundConfiguration, configuration) = configurationService.getConfiguration(pType, pConfigurationId)

        if not foundConfiguration):
            self.__logger.error('Unable to load specified configuration: type={}, id={}'.format(pType, pConfigurationId))
            return

        self.__logger.info('Loaded configuration. type={}, name={}, id={}'.format(pType, self.__configuration["name"], self.__configuration["id"]))
        self.__configuration = configuration