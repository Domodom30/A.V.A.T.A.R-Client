"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// deps
// natives
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_child_process_1 = require("node:child_process");
const node_exist_1 = require("fs-extra");
// locals
const parseVoicesEspeak_1 = __importDefault(require("./parseVoicesEspeak"));
const parseVoicesSAPI_1 = __importDefault(require("./parseVoicesSAPI"));
const parseVoicesDarwin_1 = __importDefault(require("./parseVoicesDarwin"));
const readOptionsToEspeakArgs_1 = __importDefault(require("./readOptionsToEspeakArgs"));
const readOptionsToSAPIArgs_1 = __importDefault(require("./readOptionsToSAPIArgs"));
const readOptionsToDarwinArgs_1 = __importDefault(require("./readOptionsToDarwinArgs"));

// consts
const platform = (0, node_os_1.platform)().trim().toLowerCase();

// Only mbrola
const tmpVoices = (0, node_path_1.resolve)(__dirname, '../../../../core/lib/tts', platform, 'tmp');
// special voices, linux (mbrola)
const Jsonvoices = (0, node_path_1.resolve)(__dirname, '../../../../core/lib/tts', platform, 'voices/voices.json');

const CSCRIPT_ARGS = ["//NoLogo", "//B"];
// module
class SimpleTTS {
    // constructor
    constructor(scriptsFolderPath = (0, node_path_1.join)(__dirname, "..", "..", "batchs")) {
        this._forceStop = false;
        this._readPromise = null;
        this._reader = null;
        this._scriptsDirectory = scriptsFolderPath;
        this.defaultVoice = null;
        this.forceEspeak = false;
    }
    getTTSSystem() {
        return platform === 'win32'
        ? "sapi" 
        : platform === 'linux' ? "espeak" : "say";
    }
    getVoices() {
        return new Promise((resolve, reject) => {
            var script;
            if (platform === 'win32') {
                script = "cscript " + CSCRIPT_ARGS.join(" ") + " \"" + (0, node_path_1.join)(this._scriptsDirectory, "listvoices.vbs") + "\"";
            } else if (platform === 'linux') {
                script = "espeak --voices";
            } else if (platform === 'darwin') {
                script = "say -v '?'";
            }

            (0, node_child_process_1.exec)(script, (err, _stdout, stderr) => {
                if (err) {
                    reject(stderr ? new Error(stderr) : err);
                }
                else {
                    const lines = _stdout.trim().replace(/\r/g, "\n").replace(/\n\n/g, "\n").split("\n");
                    if (platform === 'win32') {
                        resolve((0, parseVoicesSAPI_1.default)(lines).map((voice) => {
                            return {
                                "gender": voice.Gender.trim().toLowerCase(),
                                "name": voice.Name.trim().toLowerCase()
                            };
                        }));
                    }
                    else if (platform === 'linux') {
                        let tblVoices = [];
                        if (node_exist_1.existsSync(Jsonvoices)) {
                            const specialVoices = node_exist_1.readJsonSync(Jsonvoices, { throws: true });
                            specialVoices.map((voice) => {
                                tblVoices.push({
                                    "gender": voice.gender,
                                    "name": voice.name,
                                    "language": voice.language
                                });
                            });
                        }

                        (0, parseVoicesEspeak_1.default)(lines).map((voice) => {
                            tblVoices.push({
                                "gender": "F" === voice["Age/Gender"] ? "female" : "male",
                                "name": voice.VoiceName.trim().toLowerCase(),
                                "language": voice.Language.trim().toLowerCase()
                            });
                        });

                        resolve (tblVoices);
                    } else if (platform === 'darwin') {
                        resolve((0, parseVoicesDarwin_1.default)(lines).map((voice) => {
                            return {
                                "name": voice.VoiceName,
                                "language": voice.Language
                            };
                        }));
                    }
                }
            });
        });
    }
    isReading() {
        return null !== this._reader;
    }
    read(_options) {
        this._forceStop = false;
        if ("undefined" === typeof _options) {
            return Promise.reject(new ReferenceError("Missing options parameter"));
        }
        else if ("object" !== typeof _options && "string" !== typeof _options) {
            return Promise.reject(new TypeError("options parameter is not an object or a string"));
        }
        else {
            const options = "string" === typeof _options ? { "text": _options } : _options;
            if ("undefined" === typeof options.text) {
                return Promise.reject(new ReferenceError("Missing text parameter"));
            }
            else if ("string" !== typeof options.text) {
                return Promise.reject(new TypeError("text parameter is not a string"));
            }
            else if ("" === options.text.trim()) {
                return Promise.reject(new Error("text parameter is empty"));
            }
            else if (this.isReading()) {
                return Promise.reject(new Error("Already reading a text"));
            }
            else {
                const IS_SAPI = "sapi" === this.getTTSSystem();
                this._readPromise = Promise.resolve().then(() => {
                    if (this.defaultVoice) {
                        return;
                    }
                    else {
                        if (platform !== 'darwin') {
                            return this.getVoices().then((voices) => {
                                voices.map((voice) => {
                                    if (voice.name === 'default') {
                                        this.defaultVoice = voice.name;
                                    }
                                })
                                if (!this.defaultVoice) this.defaultVoice = voices.length ? voices[0].name : null;
                            });
                        }
                    }
                }).then(() => {
                    
                    if ("object" !== typeof options.voice && "string" !== typeof options.voice && !node_exist_1.existsSync(Jsonvoices)) {
                        options.voice = this.defaultVoice;
                    } else if (platform === 'linux' && node_exist_1.existsSync(Jsonvoices)) {
                        const specialVoices = node_exist_1.readJsonSync(Jsonvoices, { throws: true });
                        let found;
                        specialVoices.map((voice) => {
                            if ("string" !== typeof options.voice && voice.default === true && !found) {
                                options.voice = voice.code;
                                options.file = voice.file;
                                found = true
                            }  else if ("string" === typeof options.voice && options.voice === voice.name && !found) {
                                options.voice = voice.code;
                                options.file = voice.file;
                                found = true
                            } 
                        });
                        if (!options.voice) options.voice = this.defaultVoice;
                    } 

                    options.volume = "undefined" === typeof options.volume ? 100 : Math.round(options.volume);
                    options.volume = 0 > options.volume ? 0 : options.volume;
                    options.volume = 100 < options.volume ? 100 : options.volume;
                    options.speed = "undefined" === typeof options.speed ? 50 : Math.round(options.speed);
                    options.speed = 0 > options.speed ? 0 : options.speed;
                    options.speed = 100 < options.speed ? 100 : options.speed;
                    return this._forceStop ? options : Promise.resolve().then(() => {
                        let args; 
                        if (platform === 'win32') {
                            args = (0, readOptionsToSAPIArgs_1.default)(options)
                        } 
                        if (platform === 'linux') {
                            args = (0, readOptionsToEspeakArgs_1.default)(options);
                            if (options.file) {
                                args.push(options.file);
                                args.push("special");
                                node_exist_1.ensureDirSync(tmpVoices);   
                                args.push(node_path_1.resolve(tmpVoices, 'speak.wav'));
                            } else {
                                args.push(this.getTTSSystem());
                            }
                        } 
                        if (platform === 'darwin') {
                            args = (0, readOptionsToDarwinArgs_1.default)(options);
                        }

                        args.push(options.text);

                        return args;
                    }).then((args) => {
                        return new Promise((resolve, reject) => {
                            var script;
                            if (platform === 'win32') {
                                args = CSCRIPT_ARGS.concat([(0, node_path_1.join)(this._scriptsDirectory, "playtext.vbs")]).concat(args);
                                script = "cscript";
                            } else {
                                script = (0, node_path_1.join)(this._scriptsDirectory, "playtext.sh");
                            }
                            this._reader = (0, node_child_process_1.spawn)(script, args);
                            let err = "";
                            if (this._reader.stderr) {
                                this._reader.stderr.on("data", (data) => {
                                    err += "string" === typeof data ? data : data.toString("ascii");
                                });
                            }
                            this._reader.on("close", (code) => {
                                return code ? reject(new Error(err)) : resolve(options);
                            });
                        });
                    });
                }).then((data) => {
                    this._forceStop = false;
                    this._reader = null;
                    return data;
                }).catch((err) => {
                    this._forceStop = false;
                    this._reader = null;
                    return Promise.reject(err);
                });
                return this._readPromise;
            }
        }
    }
    stopReading() {
        if (this._reader) {
            try {
                this._reader.kill();
                this._reader = null;
            }
            catch (e) {
                return Promise.reject(e);
            }
        }
        else {
            this._forceStop = true;
        }
        return this._readPromise ? this._readPromise.then(() => {
            return Promise.resolve();
        }) : Promise.resolve();
    }
}

exports.default = SimpleTTS;

