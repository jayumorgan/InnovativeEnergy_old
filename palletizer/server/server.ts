// Express
import express from "express";
import morgan from "morgan";

// Router
import router, {start_machine} from "./router";

// Types
import { AddressInfo } from "net";

// Config
const PORT = 3011;

// Express app setup.
const app = express();
app.use(express.json());
app.use(morgan('dev'));

app.use(router);

let server = app.listen(PORT, ()=>{

    let address = server.address() as AddressInfo;
    let address_string = "http://"+address.address+":"+address.port;
    start_machine();
    
    console.log(`Server running at ${address_string}.`);
});
