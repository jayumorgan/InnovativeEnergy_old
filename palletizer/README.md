# Deploy to machine

* run deploy.erl (deploy:deploy())
* scp the deploy directory to the MachineMotion.




# MQTT Setup:

## Start Server
* `/usr/local/sbin/mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf`

## CLI
* pub `mosquitto_pub -t topic/state -m "Hello World"`
* sub `mosquitto_sub -t topic/state`


## Topics
* `palletizer/state` - state of the palletizer + errors (machine -> server -(SSE)> client)
* `palletizer/control` - start, pause, stop commands (client -(GET)> server -> machine)
