"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var morgan_1 = __importDefault(require("morgan"));
// Router
var router_1 = __importDefault(require("./router"));
//  Config
var PORT = 3011;
// Express app setup.
var app = express_1.default();
app.use(express_1.default.json());
app.use(morgan_1.default('dev'));
app.use(router_1.default);
var server = app.listen(PORT, "localhost", function () {
    var address = server.address();
    var address_string = "http://" + address.address + ":" + address.port;
    console.log("Server running at " + address_string + ".");
});
