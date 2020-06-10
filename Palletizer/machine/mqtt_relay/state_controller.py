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



class StateController:
    def __init__(self, new):
        # intial state of the machine motion.
        self.client = mqtt.Client()
        self.state = {
            "status" : "Sleep",
            "cycle" : 0,
            "current_box" : 0,
            "total_box": 0,
            "time": 0,
            "errors" : []
        }

        if new:
            self.__publish()

    def __publish(self):
        topic = PALLETIZER_TOPIC + "state"
        data = json.dumps(self.state)

        self.client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        pub = self.client.publish(topic, data)

        self.client.disconnect()

    def update(self, key, value):
        self.state[key] = value
        self.__publish()
        


class ControlListener:
    def __init__(self):
        self.command = None
        logging.debug("Starting the control listener.")
        self.thread = Thread(target=self.connect)
        logging.debug("Starting the control listener.")

    def connect(self):
        self.client = mqtt.Client()
        self.status_topic = PALLETIZER_TOPIC + "control"
        self.client.on_message = self.__on_message
        self.client.on_connect = self.__on_connect
        logging.debug("Starting the control client.")
        print("Starting the control client")
        self.client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        self.client.loop_forever()
        
    def __on_connect(self, client,userdata, flags):    
        logging.debug("Connection to the control client")
        print("Control Lister Subscribing to " + self.state_topic)
        self.client.subscribe(self.status_topic)

    def __on_message(self,client, userdata, msg):
        print(msg.topic+" "+str(msg.payload))
        self.command = msg.payload

    def disconnect(self):
        self.client.disconnect()

        
