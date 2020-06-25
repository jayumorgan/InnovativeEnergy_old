"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MQTTControl = exports.MQTTSubscriber = void 0;
var mqtt_1 = __importDefault(require("mqtt"));
// Config + Globals.
var PORT = 1883;
var SERVER_IP = "127.0.0.1";
var MQTT_SERVER = "mqtt://" + SERVER_IP + ":" + PORT;
var TOPIC = "palletizer/";
// MQTT example: https://www.cloudamqp.com/docs/nodejs_mqtt.html
function MQTTSubscriber(handle_error, handle_state) {
    var options = {
        clientId: "server-MQTTSubscriber"
    };
    var client = mqtt_1.default.connect(MQTT_SERVER, options);
    client.on("connect", function () {
        client.subscribe(TOPIC + "state", function () {
            console.log("Subscribed to " + TOPIC + "state...");
        });
        client.subscribe(TOPIC + "error", function () {
            console.log("Subscribed to " + TOPIC + "error...");
        });
    });
    client.on("message", function (topic, message_buffer) {
        var message_string = message_buffer.toString();
        var message = JSON.parse(message_string);
        switch (topic) {
            case TOPIC + "state": {
                console.log("State update: ", topic, message);
                handle_state(message);
                break;
            }
            case TOPIC + "error": {
                // Error has a specific type - see /client/src/types/Types
                console.log("Error update: ", topic, message);
                handle_error(message);
                break;
            }
            default: {
                console.log("Unhandled message on topic: ", topic, message);
            }
        }
    });
    return client;
}
exports.MQTTSubscriber = MQTTSubscriber;
// MQTTRelay(console.log, console.log);
function MQTTControl() {
    // Return an object with function in it.
    var options = {
        clientId: "server-MQTTControl"
    };
    var topic = TOPIC + "control";
    var client = mqtt_1.default.connect(MQTT_SERVER, options);
    client.on("connect", function () {
        console.log("Connected to control MQTT server.");
    });
    var stop_command = "STOP";
    var start_command = "START";
    var pause_command = "PAUSE";
    var stop = function () {
        client.publish(topic, stop_command);
    };
    var start = function () {
        client.publish(topic, start_command);
    };
    var pause = function () {
        client.publish(topic, pause_command);
    };
    return { start: start, stop: stop, pause: pause };
}
exports.MQTTControl = MQTTControl;
