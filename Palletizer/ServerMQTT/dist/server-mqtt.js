"use strict";
// Subscribe to various things...
// import mqtt from "mqtt";
var mqtt = require("mqtt");
var PORT = 1886;
var SERVER_URL = "127.0.0.1";
var sub_options = {
    clientId: "server-mqtt"
};
var client = mqtt.connect("mqtt://" + SERVER_URL + ":" + PORT, sub_options);
client.on("connect", function () {
    console.log("Connected...");
});
//# sourceMappingURL=server-mqtt.js.map