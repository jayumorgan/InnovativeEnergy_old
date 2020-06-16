#!/usr/bin/env python3


import paho.mqtt.client as mqtt
import json
from threading import Thread, RLock
import logging
logging.basicConfig(level=logging.DEBUG,format='(%(threadName)-9s) %(message)s',)

PALLETIZER_TOPIC = "palletizer/"
MQTT_IP = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TIMEOUT = 60



class PalletizerControl:

    def __init__(self):
        # Setup the state client.
        self.state_client = mqtt.Client()
        self.state_topic = PALLETIZER_TOPIC + "state"

        self.state = {
            "status" : "Sleep",
            "cycle" : 0,
            "current_box" : 0,
            "total_box": 0,
            "time": 0,
        }


        self.commands = []
        self.control_client = None
        self.control_topic = PALLETIZER_TOPIC + "control"
        self.control_thread = Thread(target=self.__connect)
        self.control_thread.start()

        self.__lock = RLock()


        
    # ------ For the control client.
    def __connect(self):
        self.control_client = mqtt.Client()
        self.control_client.on_message = self.__on_message
        self.control_client.on_connect = self.__on_connect
        self.control_client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        self.control_client.subscribe(self.control_topic)
        self.control_client.loop_forever()

    def __on_connect(self, client, userdata, flags):    
        print("Control client connected to: " + self.state_topic)

    def __on_message(self, client, userdata, msg):
        message = msg.payload.decode("utf-8")
        print("Control client received message: " + message, flush=True)
        self.__lock.acquire()
        self.commands.append(message)
        self.__lock.release()

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

    def update(self, updates):
        update = False
        self.__lock.acquire()
        for key, value in updates.items():
            if self.state[key] != value:
                self.state[key] = value
                update = True
        state = self.state
        self.__lock.release()

        if update:
            self.__publish(state)
    
