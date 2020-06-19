#!/usr/bin/env python3
import json

def load_config(name):
    with open("./config/config/"+name) as config:
        return json.load(config)

def load_selected_config():
    with open("./config/current_configuration.json") as current_config:
        file_name = "config.json"
        current_config = json.load(current_config)
        try:
            file_name = current_config["file_name"]
        except:
            print("current_config not found or not correctly formatted.")
        print(f"Loading configuration file: {file_name}")
        return load_config(file_name)

def output(data):
    print(json.dumps(data, indent=4, sort_keys=True))
