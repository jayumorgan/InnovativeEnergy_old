#!/usr/bin/env python3
import json


import pathlib

FILE_PATH = str(pathlib.Path(__file__).parent.absolute()) + "/"

print(FILE_PATH)


def load_config(name, machine):
    filename = FILE_PATH + ("machine/" if machine else "pallet/") + name
    with open(filename) as config:
        return json.load(config)

def load_selected_config():
    with open(FILE_PATH + "current_configuration.json") as current_config:
        
        machine_file = None
        pallet_file = None
        current_config = json.load(current_config)
        print(current_config)

        
        try:
            machine_file = current_config["machine"]
            pallet_file = current_config["pallet"]
        except:
            print("current_config not found or not correctly formatted.")
        print("Loading configuration file: {}, {}".format(machine_file, pallet_file))
        return {
            "machine" : load_config(machine_file, True),
            "pallet" : load_config(pallet_file, False)
            }

def output(data):
    print(json.dumps(data, indent=4, sort_keys=True))
