import express from "express";
import morgan from "morgan";
import {MQTTSubscriber, MQTTControl} from "./mqtt/server_mqtt";
import {PalletizerState, PalletizerError} from "./client/src/types/Types";
// For types
import { AddressInfo } from "net";


const PORT = 3011;

const app = express();


app.use(morgan('dev'));

var palletizer_state : PalletizerState = {
    status : "N/A",
    cycle: 0, 
    current_box: 0,
    total_box: 0,
    time: 2,
    errors: [] as PalletizerError[]
};


let control = MQTTControl();

// GET route to accept client control operations (Start, Pause, Stop)
app.get("/control/:operation", (req:express.Request, res:express.Response)=>{
    let operation = req.params.operation.toLowerCase();
    switch(operation) {
        case "start" : {
            control.start();
            break;
        }
        case "pause" : {
            control.pause();
            break;
        }
        case "stop" : {
            control.stop();
            break;
        }
        default : {
            console.log("Uncaught control operation: ", operation);
        }
    }
    res.sendStatus(200);
});



// SSE route to sent information to the client.
app.get("/events", (req: express.Request, res: express.Response)=>{
    
    let write = (data: any) => {
        res.write("event: message\n");
        res.write("data: "+ JSON.stringify(data));
        res.write("\n\n");
    }

    let handle_state = (message: any) => {
        palletizer_state = message;
        write(palletizer_state);
    };

    let handle_error = (message: any)=>{
        let p_error = message as PalletizerError;
        palletizer_state.errors.push(p_error);
        write(palletizer_state);
    };

    var client = MQTTSubscriber(handle_error, handle_state);

    req.on('close', ()=>{
        // End MQTT client and response.
        client.end();
        res.end();
    });
    
    res.writeHead(200,{
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin' : "*",
        'Access-Control-Allow-Headers' : "Origin, X-Requested-With, Content-Type, Accept"
    });
   
    res.flushHeaders();

    res.write('retry: 10000\n\n'); // Retry every 10s if connection is lost.
    // Write the initial data.
    write(palletizer_state);
});




app.get("/", (req: express.Request, res: express.Response)=> {
    res.send("Index worked.");
});



let server = app.listen(PORT, "localhost",()=>{

    let address = server.address() as AddressInfo;
    let address_string = "http://"+address.address+":"+address.port;
    
    console.log(`Server running at ${address_string}.`);
});
