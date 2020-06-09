#!/usr/bin/env python3

import paho.mqtt.client as mqtt
import json

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
        
