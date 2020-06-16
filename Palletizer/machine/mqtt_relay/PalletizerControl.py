#!/usr/bin/env python3


import paho.mqtt.client as mqtt
import json
from threading import Thread
import logging
logging.basicConfig(level=logging.DEBUG,format='(%(threadName)-9s) %(message)s',)

PALLETIZER_TOPIC = "palletizer/"
MQTT_IP = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TIMEOUT = 60


class PalletizerControl:

    def __init__(self, new):
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

        if new:
            self.__publish()

    # For the control client.
    def __connect(self):
        self.control_client = mqtt.Client()
        self.control_client.on_message = self.__on_message
        self.control_client.on_connect = self.__on_connect
        self.control_client = client
        self.control_client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        self.control_client.subscribe(self.status_topic)
        self.control_client.loop_forever()

    def __on_connect(self, client, userdata, flags):    
        print("Control client connected to: " + self.state_topic)

    def __on_message(self, client, userdata, msg):
        message = msg.payload.decode("utf-8")
        self.commands.append(message)
        print("Control client received message: " + message, flush=True)

    def disconnect(self):
        # Disconnect the control client + join thread.
        self.control_client.disconnect()
        self.thread.join()
        # disconnect the state client
        self.state_client.disconnect()
            
    # ---- For the state client (publish)
    def __publish(self):
        data = json.dumps(self.state)

        self.state_client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        pub = self.state_client.publish(self.state_topic, data)

        self.state_client.disconnect()

    def update(self, key, value):
        if self.state[key] != value: #ie. the value needs to be changed.
            self.state[key] = value
            self.__publish()
    
