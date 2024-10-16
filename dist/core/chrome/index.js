let globalOptions = {
  AKA: true,
  listen: true,
  keywordTest: false,
  stopForced: false
};

const values = {
  voice: undefined,
  rate: undefined,
  pitch: undefined,
  volume: undefined,
  text: undefined
}

let filteredVoices;
let SpeechRecognition;
let recognition;
let endSpeak;

function Regonizer () {

    SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = globalOptions.config.speech.locale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function(event) {

      if (!globalOptions.stopForced) {
          // listen mode
          let speechResult = event.results[event.resultIndex][0].transcript.toLowerCase();
          let threashold = parseFloat(event.results[event.resultIndex][0].confidence).toFixed(3);
          debug('speechResult: '+speechResult);
          if (globalOptions.listen === true) {
              // mode AKA
              if (globalOptions.AKA === true) {
                manageAKA(speechResult, threashold);
              } else {
                let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?listen="+encodeURIComponent(speechResult)+"&threashold="+threashold;
                sendToAvatar(url);
              }
          } 
       }
    }

    // Error appears... commented
    /*recognition.onerror = (event) => {
      console.error(`Speech recognition error detected: ${event.error}`);
    }*/

    recognition.onend = function (event) {
        //Fired when the speech recognition service has disconnected.
        if (recognition) recognition.start();
    }

    recognition.onnomatch = function (event) {
        //Fired when the speech recognition service returns a final result with no significant recognition. This may involve some degree of recognition, which doesn't meet or exceed the confidence threshold.
        debug('No match:'+ event);
    }

    // start recognition
    recognition.start();

    // init textToSpeech
    initSpeech();

}


function manageAKA(speechResult, threashold, listenFalse) {

  let isAKA = globalOptions.config.AKA[globalOptions.config.speech.locale].find(AKA => {
    return AKA.toLowerCase() == speechResult.toLowerCase();
  });

  if(isAKA) {
      if (listenFalse && listenFalse == true) {
        globalOptions.AKA = true;
        globalOptions.listen = true;
      }

      let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?AKA=true&threashold="+threashold;
      sendToAvatar(url);
  } else {
      let indexAKA = globalOptions.config.AKA[globalOptions.config.speech.locale].findIndex(AKA => {
        return speechResult.toLowerCase().indexOf(AKA.toLowerCase()+" ") !== -1;
      });

      // indexAKA found
      if(indexAKA !== undefined && indexAKA !== -1 && speechResult.toLowerCase().indexOf(globalOptions.config.AKA[globalOptions.config.speech.locale][indexAKA].toLowerCase()) === 0) {
        speechResult = speechResult.toLowerCase().replace(globalOptions.config.AKA[globalOptions.config.speech.locale][indexAKA].toLowerCase()+" ", "")
          
        if (listenFalse && listenFalse == true) {
          globalOptions.AKA = true;
          globalOptions.listen = true;
        }

        let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?action="+encodeURIComponent(speechResult)+"&threashold="+threashold;
        sendToAvatar(url);
      }
  }

}


async function initSpeech() {

  let initFeatures = detectFeatures();
  if (!initFeatures.speechSynthesis) {
    let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?init=noFeatures";
    return sendToAvatar(url);
  }

  init({ maxTimeout: 5000, interval: 250 })
  .then(async initialized => {

    if (!initialized) {
      let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?init=notInitialized";
      return sendToAvatar(url);
    }

    await populateVoices();
    await initEvents();

    let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?init=true";
    sendToAvatar(url);
  })
  .catch(e => {
    debug('Speech Synthesis: '+e)
    let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?init=noinit";
    return sendToAvatar(url);
  })

}


function getValues () {
  return { ...values }
}


function errorSpeak(msg) {
  let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?errorSpeak="+msg+"&end="+endSpeak;
  sendToAvatar(url);
  debug(e.message);
  endSpeak = null;
}


async function initSpeak (text, end) {

  endSpeak = end ? end : true;
  const { pitch, rate, voice, volume } = getValues();
  try {
    await speak({ text, pitch, rate, voice, volume })
  } catch (e) {
    errorSpeak(e.message);
  } 

}


async function initEvents () {
  debug('init Events')
  const logEvent = e => debug(`event: ${e.type}`)
  const logend = e => {
    let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?endSpeak="+endSpeak;
    sendToAvatar(url);
    endSpeak = null;
  }
  
  on({
    boundary: logEvent,
    start: logEvent,
    end: logend,
    error: e => {
      console.error(e)
      errorSpeak(e.message);
    }
  })

}


async function populateVoices () {
  debug('init voice select')
  const voices = getVoices()
  filteredVoices = voices
}


async function selectVoice (index) {
  if (index < 0 || index > filteredVoices.length - 1) {
    values.voice = undefined
    debug(`no voice found by index ${index}`)
    return
  }

  values.voice = (filteredVoices || [])[index]
  debug(`select voice ${values.voice.name}`)
}


async function initInputs (options) {

  values.volume = options && options.volume ? options.volume / 100 : globalOptions.config.voices.volume / 100
  values.rate =  options && options.speed ? options.speed / 100 : globalOptions.config.voices.speed / 100
  values.pitch =  options && options.pitch ? options.pitch : globalOptions.config.voices.pitch
  const voices = getVoices()
  
  let index;
  if (options.voice) {
    index = voices.findIndex(v => v.name === options.voice)
  } else {
    index = globalOptions.config.voices.current['web-voice'] === 'by default'
    ? voices.findIndex(v => v.default === true)
    : voices.findIndex(v => v.name === globalOptions.config.voices.current['web-voice'])
  }
  index !== -1 ? await selectVoice(index) : await selectVoice(voices.findIndex(v => v.default === true))
  
}


function cleanConsole() {
  console.clear();
}


function start_AKA() {
  if (recognition) recognition.abort();
  globalOptions.AKA = true;
}


function stop_AKA() {
  if (recognition) recognition.abort();
  globalOptions.AKA = false;
}


function stop_listen() {
  if (recognition) recognition.abort();
  globalOptions.listen = false;
}


function start_listen() {
  if (recognition) recognition.abort();
  globalOptions.listen = true;
}


function start_listen_forced() {
  globalOptions.stopForced = false;
  globalOptions.listen = true;
  globalOptions.AKA = true
}

function stop_listen_forced() {
  globalOptions.stopForced = true;
}


function is_listen() {
  return globalOptions.listen;
}


window.onload = function() {
  EventChannel();
}


function EventChannel () {
  let channel = new EventSource('/AvatarClient');
	channel.onmessage = function(ev) {
    ChromeEvents(ev);
	};
  channel.onerror = function(err) {
    debug('Connexion error:'+ err);
  };

}


async function ChromeEvents(ev) {

	ev = JSON.parse(ev.data);
	switch (ev.command) {
    case 'stop':
      stop_listen();
			break;
    case 'start':
      start_listen();
			break;
    case 'stopForced':
      stop_listen_forced();
			break;
    case 'startForced':
      start_listen_forced();
      break;
		case 'stopAKA':
      stop_AKA();
			break;
    case 'startAKA':
      start_AKA();
			break;
		case 'init':
      globalOptions.config = ev.conf.config;
      globalOptions.address = ev.conf.chrome.address;
      globalOptions.port = ev.conf.chrome.port;
      globalOptions.log = ev.conf.chrome.log;
      Regonizer();
			break;
    case 'voices':
      const voices = getVoices();
      const tblVoices = [];
      if (voices) {
        voices.forEach(voice => {
          tblVoices.push({
            default: voice.default,
            lang: voice.lang,
            name: voice.name,
            type: "remote"
          })
        })
      }
      let url = "https://"+globalOptions.address+":"+globalOptions.port+"/AvatarServer?voices="+JSON.stringify(tblVoices);
      sendToAvatar(url);
      break;
    case 'remoteSpeak':
      debug(ev.options);
      await initInputs (ev.options);
      initSpeak (ev.options.text, ev.options.end);
	}
}


function sendToAvatar (url) {
	let xmlhttp = new XMLHttpRequest();
	xmlhttp.open("POST",url);
	xmlhttp.send();
}
