const express = require('express');
const morgan = require('morgan');

const relay = require("./server_mqtt/dist/server-mqtt").default;

const app = express();


// const path = require('path');
const port = 3011;
// const staticPath = path.join(__dirname, `../${folder}`);
// const cors = require('cors');

// app.use(cors());
// app.use(express.static(`${staticPath}`));
app.use(morgan('dev'));

// app.get('/', (req, res) => res.sendFile(`${staticPath}/${index || 'index.html'}`));
app.get("/", (req,res)=> {
    res.send("Call worked..."); 
});


var palletizer_state = {
    status : "N/A",
    cycle: 0, 
    current_box: 0,
    total_box: 0,
    time: 2,
    errors: []
};


app.get("/events", function(req,res) {
    
    let write = (data) => {
        res.write("event: message\n");
        res.write("data: "+ JSON.stringify(data));
        res.write("\n\n");
    }

    let handle_state = (message) => {
        // PArge the message properly
        console.log("We will need a type here", message);
        // palletizer_state = message;
        // let data = {state : palletizer_state};
        write(palletizer_state);
    };

    let handle_error = (message)=>{
        palletizer_state.errors.push(message);
        write(palletizer_state);
    }

    var client = relay(handle_error, handle_state);

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


app.listen(port, () => console.log(`server running on port ${port}`));
