import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
import * as path from 'node:path';
import { default as SimpleTTS } from '../lib/simpletts/lib/cjs/main.cjs';
const vbsFolders = path.resolve(__dirname, "lib", "tts", process.platform, "scripts");
const TTS = new SimpleTTS(vbsFolders);


async function getVoices() {
  return new Promise((resolve) => {
    resolve ([]);
    TTS.getVoices().then((voices) => {
      resolve(voices);
    })
    .catch(() => {
      resolve ([]);
    });
  });
}


function randomeTTS(elem) {
  let tab = Object.values(elem);
  let randomIndex = Math.floor(Math.random() * tab.length);
  return tab.splice(randomIndex, 1)[0];
}


async function speak(tts, callback, end, voice, volume, speed, pitch, test) {

    if (!tts) {
        error('Speak error:', L.get('mainInterface.ttsError'));
        if (callback) callback();
        return;
    }

    if (typeof tts === 'object') tts = randomeTTS(tts);

    tts = tts.replace(/[\n]/gi, "" ).replace(/[\r]/gi, "" );
    if (tts.indexOf('|') !== -1)
        tts = tts.split('|')[Math.floor(Math.random() * tts.split('|').length)];

    if (await Avatar.Listen.isStopped() === false) {
      infoOrange(L.get('mainInterface.stopListenSpeak'));
      await Avatar.Listen.stop();
    }
    setTimeout(async () => {
        end = end !== undefined ? end : true;
        if (Config.speech.server_speak === true) {
          let next = callback ? true : false;
          if (next === true) Avatar.serverSpeakCallback = callback;
          return Avatar.HTTP.socket.emit('server_speak', tts, next, end, null, Config.speech.module);
        }

        let options = {text: tts};
        if (voice)
          options.voice = voice;
        else if (!test && Config.voices.current[Config.voices.type] && Config.voices.current[Config.voices.type].toLowerCase() !== "by default")
          options.voice = Config.voices.current[Config.voices.type];

        if (volume)
          options.volume = volume;
        else if (Config.voices.volume)
          options.volume = Config.voices.volume;

        if (speed)
          options.speed = speed;
        else if (Config.voices.speed)
          options.speed = Config.voices.speed;

        if (pitch)
          options.pitch = pitch;
        else if (Config.voices.pitch)
          options.pitch = Config.voices.pitch;

        switch (Config.voices.type) {
        case 'local-voice':
          TTS.read(options)
          .catch((err) => {
              throw new Error ('Speak error:', err);
          })
          .finally(async () => {
            infoGreen(L.get('mainInterface.startListenSpeak'));
            if (end === true) await Avatar.Listen.start();
            if (callback) return callback();
          });
          break;
        default:
          options.end = end;
          options.callback = callback;
          await Avatar.Listen.remoteSpeak(options);
        }
    }, Config.speech.timeout * 1000);

}


function initSpeak () {
  Avatar.speak = speak;
  Avatar.getVoices = getVoices;
  Avatar.setConfig = setConfig;
}

function setConfig (conf) {
  Config = conf;
}


export { initSpeak}; 