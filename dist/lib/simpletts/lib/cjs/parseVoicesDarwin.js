"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

// module
function parseVoicesDarwin(voices) {
    return voices.map((voice) => {
        voice = voice.split('#')[0].trim();
        return {
           "VoiceName": voice.substring(0,voice.lastIndexOf(' ')).trim(),
           "Language": voice.substring(voice.lastIndexOf(' ')).trim()
        };
    });
}
exports.default = parseVoicesDarwin;
