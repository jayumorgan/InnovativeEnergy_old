import mqtt from "mqtt";

// Config + Globals.
const PORT = 1883;
const SERVER_IP = "127.0.0.1";
const MQTT_SERVER = "mqtt://" + SERVER_IP + ":" + PORT; 
const TOPIC = "palletizer/";

// MQTT example: https://www.cloudamqp.com/docs/nodejs_mqtt.html
function MQTTRelay(handle_error: any, handle_state: any){

    let options = {
        clientId: "server-MQTTRelay"
    };

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.on("connect", ()=>{
        // for state updates...
        client.subscribe(TOPIC + "state", ()=>{
            console.log("Subscribed to " + TOPIC + "state...");
        })

        // for errors
        client.subscribe(TOPIC + "error", ()=>{
            console.log("Subscribed to" + TOPIC + "error...");
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
                console.log("Error update: ", topic, message);
                handle_error(message);
                break;
            }
            default : {
                console.log("Unhandled message on topic: ", topic, message);
            }
        }

    });
}

MQTTRelay(console.log, console.log);

export default MQTTRelay;

