"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// module
exports.default = (options) => {
    let speed, volume;
    speed = 180;
    if (options.speed > 50) {
        speed = 180 + ((options.speed - 50) * 2.6)
    } else if (options.speed < 50) {
        speed = 180 - ((50 - options.speed) * 2.6)
    } 
    volume =  options.volume
    
    return [
        "-vol",
        String(volume),
        "-r",
        String(speed),
        "string" === typeof options.voice ? options.voice : options.voice.name
    ];
    
};
