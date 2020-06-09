import mqtt from "mqtt";

// Config + Globals.
const PORT = 1883;
const SERVER_IP = "127.0.0.1";
const MQTT_SERVER = "mqtt://" + SERVER_IP + ":" + PORT; 
const TOPIC = "palletizer/";

// MQTT example: https://www.cloudamqp.com/docs/nodejs_mqtt.html

function MQTTSubscriber(handle_error: any, handle_state: any) : mqtt.MqttClient {

    let options = {
        clientId: "server-MQTTSubscriber"
    };

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.on("connect", ()=>{

        client.subscribe(TOPIC + "state", ()=>{
            console.log("Subscribed to " + TOPIC + "state...");
        });

        client.subscribe(TOPIC + "error", ()=>{
            console.log("Subscribed to " + TOPIC + "error...");
        });

    });

    client.on("message", (topic : string, message_buffer : Buffer)=> {

        let message_string : string = message_buffer.toString();
        let message : any = JSON.parse(message_string);

        switch(topic) {
                
            case TOPIC + "state" : {
                console.log("State update: ", topic, message);
                handle_state(message);
                break;
            }
                
            case TOPIC + "error" : {
                // Error has a specific type - see /client/src/types/Types
                console.log("Error update: ", topic, message);
                handle_error(message);
                break;
            }
                
            default : {
                console.log("Unhandled message on topic: ", topic, message);
            }
        }

    });
    return client;
}

// MQTTRelay(console.log, console.log);


function MQTTControl() {
// Return an object with function in it.
    let options = {
        clientId: "server-MQTTControl"
    };
    let topic = TOPIC + "control";

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.on("connect",()=> {
       console.log("Connected to control MQTT server."); 
    });

    let stop_command = "STOP";
    let start_command = "START";
    let pause_command = "PAUSE";
    
    let stop = () => {
        client.publish(topic, stop_command);
    };

    let start = () => {
        client.publish(topic, start_command);
    };

    let pause = () => {
        client.publish(topic, pause_command);
    };
    
    return {start, stop, pause};
}





export {MQTTSubscriber, MQTTControl};
