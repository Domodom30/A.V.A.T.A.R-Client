"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// module
exports.default = (options) => {
    let speed, volume;
    if (options.file) {
        // 50 = 1.3  normal espeak speed
        speed = 1.3;
        if (options.speed > 50) {
            speed = 1.3 - ((options.speed - 50) * 0.026)
        } else if (options.speed < 50) {
            speed = 1.3 + ((50 - options.speed) * 0.026)
        }
        // 0.1 -> 1
        volume =  options.volume / 100;

    } else {
        speed = 130;
        if (options.speed > 50) {
            speed = 130 + ((options.speed - 50) * 2.6)
        } else if (options.speed < 50) {
            speed = 130 - ((50 - options.speed) * 2.6)
        } 
        volume =  options.volume * 2
    }

    return [
        "-a",
        String(volume),
        "-t",
        String(speed),
        "string" === typeof options.voice ? options.voice : options.voice.name
    ];
    
};
