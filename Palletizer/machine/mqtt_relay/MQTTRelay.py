import paho.mqtt.client as mqtt
import json
# from time import sleep
# https://pypi.org/project/paho-mqtt/#connect-reconnect-disconnect

PALLETIZER_TOPIC = "palletizer/"
MQTT_IP = "127.0.0.1"
MQTT_PORT = 1883
MQTT_TIMEOUT = 60


# Run in separate thread, or make this non-blocking...
class MQTTSubscriber:
    def __init__(self, *args):
        print(args)
        self.status_topic = PALLETIZER_TOPIC
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect_async(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        self.client.loop_forever()

    def on_connect(self,client, userdata, flags, rc):
        print("Connected with result code "+str(rc))
        client.subscribe(self.status_topic)

    def on_message(self, client, userdata, msg):
        print(msg.topic+" "+str(msg.payload))
        
    def disconnect(self):
        self.client.disconnect()


        
class MQTTPublisher:
    def __init__(self):
        self.client = mqtt.Client()
        self.status_topic = PALLETIZER_TOPIC + "state"
        self.error_topix = PALLETIZER_TOPIC + "error"

    def publish_state(self, data):
        data = json.dumps(data)
        self.client.connect(MQTT_IP, MQTT_PORT, MQTT_TIMEOUT)
        
        pub = self.client.publish(self.status_topic, data)

        self.client.disconnect()

    def publish_error(self, error):
        print("Fill in details...")
        

if __name__ == "__main__":
    pass
    # publisher = MQTTPublisher()
    # publisher.publish(10,10,10,10)
