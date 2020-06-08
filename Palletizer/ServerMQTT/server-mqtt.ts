// Subscribe to various things...



// import mqtt from "mqtt";
const mqtt = require("mqtt");


const PORT = 1883;
const SERVER_IP = "127.0.0.1";
const MQTT_SERVER = "mqtt://" + SERVER_IP + ":" + PORT; 

const TOPIC = "palletizer/state";


// MQTT example:
// https://www.cloudamqp.com/docs/nodejs_mqtt.html
// 
const OPTIONS = {
    clientId: "server-mqtt"
};


let client = mqtt.connect(MQTT_SERVER, OPTIONS);


client.on("connect", () => {
    console.log(`Connected to MQTT server at ${MQTT_SERVER}...`);
    
    client.subscribe(TOPIC, function() {
        client.on('message', (topic : any, message: any, packet : any) => {
            console.log("Received '" + message + "' on '" + topic + "'");
        });
    });
    
});





