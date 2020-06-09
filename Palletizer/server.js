const express = require('express');

const relay = require("./server_mqtt/dist/server-mqtt").default;

const app = express();
// const path = require('path');
const port = 3011;
// const staticPath = path.join(__dirname, `../${folder}`);
// const cors = require('cors');

// app.use(cors());
// app.use(express.static(`${staticPath}`));


// app.get('/', (req, res) => res.sendFile(`${staticPath}/${index || 'index.html'}`));
app.get("/", (req,res)=> {
    res.send("Call worked..."); 
});


var palletizer_state = {"test_state": 0};
var palletizer_errors = [];

// Start the mqtt relay.
// When an event comes in -- push it to the relay...


app.get("/events", async function(req,res) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive'
    });
   
    res.flushHeaders();

    res.write('retry: 10000\n\n'); // Retry every 10s if connection is lost.

    // Convert json to string and sent to client.
    let write = (message) => {
        res.write(JSON.stringify(message));
    }
    // res.json(palletizer_state);
    write(palletizer_state);
    
    let handle_state = (message) => {
        palletizer_state = message;
        write(palletizer_state);
    };

    let handle_error = (message)=>{
        palletizer_errors.push(message);
        write(palletizer_erros);
    }
    
    relay(handle_error, handle_state);
    // while (true) {
    //   await new Promise(resolve => setTimeout(resolve, 1000));
    //   console.log('Emit', ++count);
    //   // Emit an SSE that contains the current 'count' as a string
    //   res.write(`data: ${count}\n\n`);
    // }
});


app.listen(port, () => console.log(`server running on port ${port}`));
