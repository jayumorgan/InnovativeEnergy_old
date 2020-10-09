#!/bin/sh
#mosquitto_sub -h 192.168.7.2 -p 1883 -t '#' -v
mosquitto_sub -t '#' -v
# mosquitto_sub -h 192.168.0.2 -p 1883 -t 'estop/#' -v
