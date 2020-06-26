#!/usr/bin/env python3

from datetime import datetime as dt
import paho.mqtt.client as mqtt
import json
from threading import Thread, RLock
import logging
logging.basicConfig(level=logging.DEBUG,format='(%(threadName)-9s) %(message)s',)

PALLETIZER_TOPIC = "palletizer/"
MQTT_IP = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TIMEOUT = 60

# Decorator for locking

class PalletizerControl:

    def __init__(self):
        # Setup the state client.
        self.state_client = mqtt.Client()
        self.state_topic = PALLETIZER_TOPIC + "state"
        self.info_topic = PALLETIZER_TOPIC + "information"

        self.state = {
            "status" : "Sleep",
            "cycle" : 0,
            "current_box" : 0,
            "total_box": 0,
            "time": 9,
            "coordinates": []
        }

        self.information = []

        # For requests for state.
        self.req_topic = PALLETIZER_TOPIC + "request"

        self.commands = []
        self.control_client = None
        self.control_topic = PALLETIZER_TOPIC + "control"
        self.control_thread = Thread(target=self.__connect)
        self.control_thread.start()

        self.__lock = RLock()

    def increment_cycle(self):
        self.__lock.acquire()
        self.state["cycle"] += 1
        self.__lock.release()

    def __connect(self):
        self.control_client = mqtt.Client()
        self.control_client.on_message = self.__on_message
        self.control_client.on_connect = self.__on_connect
        self.control_client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        self.control_client.subscribe([(self.control_topic, 0), (self.req_topic, 0)])
        self.control_client.loop_forever()

    def __on_connect(self, client, userdata, flags):    
        print("Control client connected to: " + self.state_topic)

    def __on_message(self,client, userdata, msg):
        topic = msg.topic
        message = msg.payload.decode("utf-8")
        if topic == self.control_topic:
            self.__lock.acquire()
            self.commands.append(message)
            self.__lock.release()
        else:
            # force state update.
            self.update({}, force=True)
            

    def get_command(self):
        self.__lock.acquire()
        command = None if len(self.commands) == 0 else self.commands.pop(0)
        self.__lock.release()
        return command
        
    def disconnect(self):
        self.control_client.disconnect()
        self.thread.join()
        self.state_client.disconnect()
            
    # ---- For the state client (publish)
    def __publish(self, state):
        data = json.dumps(state)

        self.state_client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        pub = self.state_client.publish(self.state_topic, data)
        self.state_client.disconnect()

    def update(self, updates, force=False):
        update = False
        self.__lock.acquire()
        for key, value in updates.items():
            if self.state[key] != value:
                self.state[key] = value
                update = True
        state = self.state
        self.__lock.release()

        if update or force:
            self.__publish(state)

    def update_information(self,Type, Description):
        information = {
            "Type" : Type,
            "Description" : Description,
            "DateString" : dt.now().strftime("%Y/%m/%d %H:%M:%S") 
        }
        self.__lock.acquire()
        self.information.append(information)
        length = len(self.information)
        self.information = self.information[length - 10 : length]
        information = self.information
        self.__lock.release()

        data = json.dumps(information)

        self.state_client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        pub = self.state_client.publish(self.info_topic, data)
        self.state_client.disconnect()

