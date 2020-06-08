# MQTT Setup:

## Start Server
* /usr/local/sbin/mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf

## CLI
* pub `mosquitto_pub -t topic/state -m "Hello World"`
* sub `mosquitto_sub -t topic/state`
