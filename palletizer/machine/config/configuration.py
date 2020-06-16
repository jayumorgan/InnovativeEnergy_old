#!/usr/bin/env python3


import json



def load_machine_config(name):
    with open("./config/machine/" + name) as config:
        data = json.load(config)
        return data


def load_pallet_config(name):
    with open("./config/pallet/" + name) as config:
        data = json.load(config)
        return data

def load_config(name):
    with open("./config/config/"+name) as config:
        return json.load(config)


def output(data):
    print(json.dumps(data, indent=4, sort_keys=True))
