import mqtt from "mqtt";

// Config + Globals.
const PORT = 9001;
const SERVER_IP = window.location.hostname;
const MQTT_SERVER = "ws://" + SERVER_IP + ":" + PORT; 
const TOPIC = "palletizer/";

// MQTT example: https://www.cloudamqp.com/docs/nodejs_mqtt.html

function MQTTSubscriber(handle_information: any, handle_state: any) : mqtt.MqttClient {

    let options = {
        clientId: "server-MQTTSubscriber",
    };

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.on("error", (e:Error)=>{
        console.log(e);
    });

    client.on("connect", ()=>{
        client.subscribe(TOPIC + "state", ()=>{
            // console.log("Subscribed to " + TOPIC + "state...");
        });

        client.subscribe(TOPIC + "information", ()=>{
            // console.log("Subscribed to " + TOPIC + "error...");
        });

    });

    client.on("message", (topic : string, message_buffer : Buffer)=> {

        let message_string : string = message_buffer.toString();
        let message : any = JSON.parse(message_string);

        switch(topic) {
            case TOPIC + "state" : {
                handle_state(message);
                break;
            }
            case TOPIC + "information" : {
                handle_information(message);
                break;
            }
            default : {
                console.log("Unhandled message on topic: ", topic, message);
            }
        }
    });

    return client;
}

function MQTTControl() {

    let options = {
        clientId: "server-MQTTControl"
    };

    let topic = TOPIC + "control";

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.on("connect",()=> {
       // console.log("Connected to MQTT control server."); 
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


function MQTTEstop() {

    let options = {
        clientId: "server-MQTTEstop"
    };

    let topic = "estop/trigger/request";

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.on("connect", ()=> {
       // console.log("Connected to estop client"); 
    });
    
    client.publish(topic, "Command is irrelevant");

}



function RequestState() {

    let options = {
        clientId: "server-MQTTRequester",
    };

    let topic = TOPIC + "request";

    let client : mqtt.MqttClient = mqtt.connect(MQTT_SERVER, options);

    client.publish(topic, "g");
}



export {MQTTSubscriber, MQTTControl, RequestState, MQTTEstop};
