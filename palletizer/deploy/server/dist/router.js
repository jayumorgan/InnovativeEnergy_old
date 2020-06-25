"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Express
var express_1 = __importDefault(require("express"));
// import morgan from "morgan";
// File Handling
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
// Configuration
var CONFIG_ROOT = path_1.default.join(__dirname, '..', '..', 'machine', 'config');
var CURRENT_CONFIG_PATH = path_1.default.join(CONFIG_ROOT.toString(), 'current_configuration.json');
var CONFIG_PATH = path_1.default.join(CONFIG_ROOT.toString(), 'config');
var MACHINE_PATH = path_1.default.join(CONFIG_ROOT.toString(), "machine");
var PALLET_PATH = path_1.default.join(CONFIG_ROOT.toString(), "pallet");
var BUILD_PATH = path_1.default.join(__dirname, "..", "client", "build");
var PORT = 3011;
;
console.log(CONFIG_PATH);
function get_configurations(callback) {
    fs_1.default.readFile(CURRENT_CONFIG_PATH, { encoding: 'utf-8' }, function (err, data) {
        if (err) {
            console.log("Error (get_selected_config) server.ts: ", err);
            callback(null);
        }
        else {
            var _a = JSON.parse(data), machine_1 = _a.machine, pallet_1 = _a.pallet;
            var options = {
                withFileTypes: true
            };
            var machine_configs = fs_1.default.readdirSync(MACHINE_PATH, options);
            var pallet_configs = fs_1.default.readdirSync(PALLET_PATH, options);
            var m_configs_1 = [];
            var p_configs_1 = [];
            var m_selected_1 = 0;
            var p_selected_1 = 0;
            machine_configs.forEach(function (item, index) {
                item = item;
                if (item.isFile() && path_1.default.extname(item.name) === ".json") {
                    m_configs_1.push(item.name);
                    if (machine_1 && item.name === machine_1) {
                        m_selected_1 = index;
                    }
                }
            });
            pallet_configs.forEach(function (item, index) {
                item = item;
                if (item.isFile() && path_1.default.extname(item.name) === ".json") {
                    p_configs_1.push(item.name);
                    if (pallet_1 && item.name === pallet_1) {
                        p_selected_1 = index;
                    }
                }
            });
            var config_data = {
                machine_configs: m_configs_1,
                pallet_configs: p_configs_1,
                machine_index: m_selected_1,
                pallet_index: p_selected_1
            };
            callback(config_data);
        }
    });
}
// On selected
function set_selected_config(file_name, config_type, callback) {
    fs_1.default.readFile(CURRENT_CONFIG_PATH, { encoding: 'utf-8' }, function (err, data) {
        if (err) {
            console.log("Error (set_selected_config) server.ts: ", err);
            callback(false);
        }
        else {
            var cf = JSON.parse(data);
            if (config_type) {
                cf[config_type] = file_name;
                fs_1.default.writeFile(CURRENT_CONFIG_PATH, JSON.stringify(data, null, "\t"), function () {
                    callback(true);
                });
            }
            else {
                callback(false);
            }
        }
    });
}
var router = express_1.default.Router();
router.use(express_1.default.json());
router.post("/configs/new", function (req, res) {
    res.sendStatus(200);
    var _a = req.body, filename = _a.filename, data = _a.data, machine = _a.machine;
    var file_path = path_1.default.join((machine ? MACHINE_PATH : PALLET_PATH).toString(), filename);
    fs_1.default.writeFile(file_path, JSON.stringify(data, null, "\t"), function () {
        console.log("Wrote file: " + file_path);
    });
});
router.post("/configs/set", function (req, res) {
    var file_name = req.body.file_name;
    var config_type = req.body.config_type;
    set_selected_config(file_name, config_type, function (success) {
        res.sendStatus(success ? 200 : 500);
    });
});
// Serve the static configuration files.
router.use("/machine", express_1.default.static(MACHINE_PATH));
router.use("/pallet", express_1.default.static(PALLET_PATH));
// List current configurations.
router.get("/configs", function (req, res) {
    get_configurations(function (c) {
        res.json(c);
    });
});
router.get("/", function (req, res) {
    res.send("Index worked.");
});
router.get("/palletizer", function (req, res) {
    res.sendFile(path_1.default.join(BUILD_PATH.toString(), "index.html").toString());
});
router.use(express_1.default.static(BUILD_PATH));
// app.use(router);
exports.default = router;
