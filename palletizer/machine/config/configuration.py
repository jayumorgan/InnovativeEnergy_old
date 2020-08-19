#!/usr/bin/env python3
import json

import pathlib

FILE_PATH = pathlib.Path(__file__).parent.absolute()

print(FILE_PATH)

PALLET_FILE_PATH = pathlib.Path(__file__).parent.absolute()
PALLET_FILE_PATH = PALLET_FILE_PATH.joinpath("GOOD.json")


def load_config(name, machine):
    filename = pathlib.Path(__file__).parent.absolute()
    filename = filename.joinpath("machine" if machine else "pallet")
    filename = filename.joinpath(name)

    if not machine:
        filename = PALLET_FILE_PATH

    print(filename)

    with open(filename) as config:
        return json.load(config)


def load_selected_config():

    filename = pathlib.Path(__file__).parent.absolute()
    filename = filename.joinpath("current_configuration.json")

    with open(filename) as current_config:

        machine_file = None
        pallet_file = None
        current_config = json.load(current_config)

        try:
            machine_file = current_config["machine"]
            pallet_file = current_config["pallet"]
        except:
            print("current_config not found or not correctly formatted.")
        print("Loading configuration file: {}, {}".format(
            machine_file, pallet_file))
        return {
            "machine": load_config(machine_file, True),
            "pallet": load_config(pallet_file, False)
        }


def output(data):
    print(json.dumps(data, indent=4, sort_keys=True))
