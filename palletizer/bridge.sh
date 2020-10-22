#!/bin/sh
ip addr flush dev eth0
ip addr flush dev eth2
brctl addbr bridge0
brctl addif bridge0 eth0 eth2
ip link set dev bridge0 up
ifconfig bridge0 192.168.0.2

ip link add name br0 type bridge
ip link set br0 up
ip link set eth0 up
ip link set eth1 up
ip link set eth0 master br0
ip link set eth1 master br0

# ip link add name br0 type bridge
# ip link set br0 up
# ip link set enp10s0 up
# ip link set enp10s0 master br0
