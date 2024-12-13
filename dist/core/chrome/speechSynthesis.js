const scope = typeof globalThis === 'undefined' ? window : globalThis;

const initScope = async ({ speechSynthesis } = {}) => {
  const speechSynthClass = Object.assign({
    getVoices: () => [{}],
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    speak: () => {}
  }, speechSynthesis)

  scope.SpeechSynthesisUtterance = createUtteranceClass()
  scope.speechSynthesis = speechSynthClass

  return await init()
}

const createUtteranceClass = () => {
  const c = class SpeechSynthesisUtterance {
    constructor (text) {
      this.text = text
      this.onend = null
      this.onstart = null
      this.onerror = null
    }

    addEventListener () {}
  }

  c.prototype.onend = null

  return c
}


const internal = {
    status: 'created'
};
  
const patches = {};


function debug (txt) {
  if (globalOptions.log) console.log(txt)
}
  

function detectFeatures () {
    const features = {}
    ;[
      'speechSynthesis',
      'speechSynthesisUtterance',
      'speechSynthesisVoice',
      'speechSynthesisEvent',
      'speechSynthesisErrorEvent'
    ].forEach(feature => {
      features[feature] = detect(feature);
    });
  
    features.onvoiceschanged = hasProperty(features.speechSynthesis, 'onvoiceschanged');
  
    const hasUtterance = hasProperty(features.speechSynthesisUtterance, 'prototype');
  
    utteranceEvents.forEach(event => {
      const name = `on${event}`;
      features[name] = hasUtterance && hasProperty(features.speechSynthesisUtterance.prototype, name);
    });
  
    return features
};

/** @private **/
const hasProperty = (target = {}, prop) => Object.hasOwnProperty.call(target, prop) || prop in target || !!target[prop];

/**
 * Common prefixes for browsers that tend to implement their custom names for
 * certain parts of their API.
 * @private
 **/
const prefixes = ['webKit', 'moz', 'ms', 'o'];

/**
 * Make the first character of a String uppercase
 * @private
 **/
const capital = s => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;


/**
 * Find a feature in global scope by checking for various combinations and
 * variations of the base-name
 * @param {String} baseName name of the component to look for, must begin with
 *   lowercase char
 * @return {Object|undefined} The component from global scope, if found
 * @private
 **/
const detect = baseName => {
    const capitalBaseName = capital(baseName);
    const baseNameWithPrefixes = prefixes.map(p => `${p}${capitalBaseName}`);
    const found = [baseName, capitalBaseName]
      .concat(baseNameWithPrefixes)
      .find(inGlobalScope);
  
    return scope[found]
};
  
/**
 * Returns, if a given name exists in global scope
 * @private
 * @param name
 * @return {boolean}
 */
const inGlobalScope = name => scope[name];


speechStatus = () => ({ ...internal });


function init ({ maxTimeout = 5000, interval = 250, quiet, maxLengthExceeded } = {}) {
    return new Promise((resolve, reject) => {
      if (internal.initialized) { return resolve(false) }
      reset();
      logStatus('init speech: start');
      let timer;
      let voicesChangedListener;
      let completeCalled = false;
  
      internal.maxLengthExceeded = maxLengthExceeded || 'warn';
  
      const fail = (errorMessage) => {
        logStatus(`init speech: failed (${errorMessage})`);
        clearInterval(timer);
        internal.initialized = false;
  
        // we have the option to fail quiet here
        return quiet
          ? resolve(false)
          : reject(new Error(`init speech: ${errorMessage}`))
      };
  
      const complete = () => {
        // avoid race-conditions between listeners and timeout
        if (completeCalled) { return }
        logStatus('init speech: complete');
  
        // set flags immediately
        completeCalled = true;
        internal.initialized = true;
  
        // cleanup events and timer
        clearInterval(timer);
        speechSynthesis.onvoiceschanged = null;
  
        if (voicesChangedListener) {
          speechSynthesis.removeEventListener('voiceschanged', voicesChangedListener);
        }
  
        // all done
        return resolve(true)
      };
  
      // before initializing we force-detect all required browser features
      const features = detectFeatures();
      const hasAllFeatures = !!features.speechSynthesis && !!features.speechSynthesisUtterance;
  
      if (!hasAllFeatures) {
        return fail('browser misses features')
      }
  
      // assign all detected features to our internal definitions
      Object.keys(features).forEach(feature => {
        internal[feature] = features[feature];
      });
  
      // start initializing
      const { speechSynthesis } = internal;
      const voicesLoaded = () => {
        const voices = speechSynthesis.getVoices() || [];
        if (voices.length > 0) {
          internal.voices = voices;
  
          // if we find a default voice, set it as default
          //internal.defaultVoice = voices.find(v => v.default);

          // otherwise let's stick to the first one we can find by locale
          if (!internal.defaultVoice) {
            //const language = (globalOptions.config.speech.locale || scope.navigator || {}).language || '';
            const language = globalOptions.config.speech.locale;
            const filtered = filterVoices({ language });
            if (filtered.length > 0) {
              logStatus(`voices loaded: ${filtered.length}`);
              internal.defaultVoice = filtered[0];
            }
          }
  
          // otherwise let's use the first element in the array
          if (!internal.defaultVoice) {
            internal.defaultVoice = voices[0];
          }
  
          return true
        }
        return false
      };
  
      logStatus('init speech: voices');
  
      // best case: detect if voices can be loaded directly
      if (voicesLoaded()) { return complete() }
  
      // last possible fallback method: run a timer until max. timeout and reload
      const loadViaTimeout = () => {
        logStatus('init speech: voices (timer)');
        let timeout = 0;
        timer = setInterval(() => {
          if (voicesLoaded()) {
            return complete()
          }
  
          if (timeout > maxTimeout) {
            return fail('browser has no voices (timeout)')
          }
  
          timeout += interval;
        }, interval);
      };
  
      // detect if voices can be loaded after onveoiceschanged,
      // but only if the browser supports this event
      if (features.onvoiceschanged) {
        logStatus('init speech: voices (onvoiceschanged)');
  
        speechSynthesis.onvoiceschanged = () => {
          if (voicesLoaded()) { return complete() }
  
          // xxx: some browsers (like chrome on android still have not all
          // voices loaded at this point, whichs is why we need to enter
          // the timeout-based method here.
          return loadViaTimeout()
        };
  
        // xxx: there is an edge-case where browser provide onvoiceschanged,
        // but they never load the voices, so init would never complete
        // in such case we need to fail after maxTimeout
        setTimeout(() => {
          if (voicesLoaded()) {
            return complete()
          }
          return fail('browser has no voices (timeout)')
        }, maxTimeout);
      } else {
        // this is a very problematic case, since we don't really know, whether
        // this event will fire at all, so we need to setup both a listener AND
        // run the timeout and make sure on of them "wins"
        // affected browsers may be: MacOS Safari
        if (hasProperty(speechSynthesis, 'addEventListener')) {
          logStatus('init speech: voices (addEventListener)');
  
          voicesChangedListener = () => {
            if (voicesLoaded()) { return complete() }
          };
  
          speechSynthesis.addEventListener('voiceschanged', voicesChangedListener);
        }
  
        // for all browser not supporting onveoiceschanged we start a timer
        // until we reach a certain timeout and try to get the voices
        loadViaTimeout();
      }
    })
};


function filterVoices ({ name, language, localService, voiceURI }) {
    const voices = internal.voices || [];
    const hasName = typeof name !== 'undefined';
    const hasVoiceURI = typeof voiceURI !== 'undefined';
    const hasLocalService = typeof localService !== 'undefined';
    const hasLang = typeof language !== 'undefined';
    const langCode = hasLang && language;

    return voices.filter(v => {
      if (
        (hasName && v.name.includes(name)) ||
        (hasVoiceURI && v.voiceURI.includes(voiceURI)) ||
        (hasLocalService && v.localService === localService)
      ) {
        return true
      }
  
      if (hasLang) {
        const compareLang = v.lang;
        return compareLang && (
          compareLang === langCode ||
          compareLang.indexOf(`${langCode}-`) > -1 ||
          compareLang.indexOf(`${langCode}_`) > -1
        )
      }
      return false
    })
  };
  
  /**
   * Updates the internal status
   * @private
   * @param {String} s the current status to set
   */
  const logStatus = s => {
    debug(s);
    internal.status = s;
  };


  /**
 * Placed as first line in functions that require `EasySpeech.init` before they
 * can run.
 * @param {boolean=} force set to true to force-skip check
 * @private
 */
const ensureInit = ({ force } = {}) => {
    if (!force && !internal.initialized) {
      throw new Error('EasySpeech: not initialized. Run EasySpeech.init() first')
    }
  };

/*******************************************************************************
 *
 * AVAILABLE ONLY AFTER INIT
 *
 ******************************************************************************/

/**
 * Returns all available voices.
 *
 * @condition `EasySpeech.init` must have been called and resolved to `true`
 * @return {Array<SpeechSynthesisVoice>}
 */
function getVoices (ev) {
    if (internal.initialized) {
      ensureInit();
      if (ev) {
        if (ev.lang) {
          const language = ev.lang;
          return filterVoices({ language });
        }
        if (ev.name) {
          const name = ev.name;
          return filterVoices({ name });
        }
      } 
      
      const language = globalOptions.config.speech.locale;
      return filterVoices({ language });

    } else
        return [];
};


/**
 * Attaches global/default handlers to every utterance instance. The handlers
 * will run in parallel to any additional handlers, attached when calling
 * `EasySpeech.speak`
 *
 * @condition `EasySpeech.init` must have been called and resolved to `true`
 *
 * @param {Object} handlers
 * @param {function=} handlers.boundary - optional, event handler
 * @param {function=} handlers.end - optional, event handler
 * @param {function=} handlers.error - optional, event handler
 * @param {function=} handlers.mark - optional, event handler
 * @param {function=} handlers.pause - optional, event handler
 * @param {function=} handlers.resume - optional, event handler
 * @param {function=} handlers.start - optional, event handler
 *
 * @return {Object} a shallow copy of the Object, containing all global handlers
 */
function on(handlers) {
  ensureInit();

  utteranceEvents.forEach(name => {
    const handler = handlers[name];
    if (validate.handler(handler)) {
      internal.handlers[name] = handler;
    }
  });

  return { ...internal.handlers }
};


/**
 * We use these keys to search for these events in handler objects and defaults
 * @private
 */
const utteranceEvents = [
    'boundary',
    'end',
    'error',
    'mark',
    'pause',
    'resume',
    'start'
];


/**
 * Internal validation of passed parameters
 * @private
 */
const validate = {
    isNumber: n => typeof n === 'number' && !Number.isNaN(n),
    pitch: p => validate.isNumber(p) && p >= 0 && p <= 2,
    volume: v => validate.isNumber(v) && v >= 0 && v <= 1,
    rate: r => validate.isNumber(r) && r >= 0.1 && r <= 10,
    text: t => typeof t === 'string',
    handler: h => typeof h === 'function',
    // we prefer duck typing here, mostly because there are cases where
    // SpeechSynthesisVoice is not defined on global scope but is supported
    // when using getVoices().
    voice: v => v && v.lang && v.name && v.voiceURI
};



/**
 * Sets defaults for utterances. Invalid values will be ignored without error
 * or warning.
 *
 * @see https://wicg.github.io/speech-api/#utterance-attributes
 * @param {object=} options - Optional object containing values to set values
 * @param {object=} options.voice - Optional `SpeechSynthesisVoice` instance or
 *  `SpeechSynthesisVoice`-like Object
 * @param {number=} options.pitch - Optional pitch value >= 0 and <= 2
 * @param {number=} options.rate - Optional rate value >= 0.1 and <= 10
 * @param {number=} options.volume - Optional volume value >= 0 and <= 1
 *
 * @return {object} a shallow copy of the current defaults
 */
function defaults (options) {
    ensureInit();
  
    if (options) {
      internal.defaults = internal.defaults || {}
  
      ;['voice', 'pitch', 'rate', 'volume'].forEach(name => {
        const value = options[name];
        const isValid = validate[name];
  
        if (isValid(value)) {
          internal.defaults[name] = value;
        }
      });
    }
  
    return { ...internal.defaults }
};



/**
 * Determines the current voice and makes sure, there is always a voice returned
 * @private
 * @param voice
 * @return {*|SpeechSynthesisVoice|{}}
 */
const getCurrentVoice = voice => voice ||
  internal.defaults?.voice ||
  internal.defaultVoice ||
  internal.voices?.[0];

/**
 * Creates a new `SpeechSynthesisUtterance` instance
 * @private
 * @param text
 */
const createUtterance = text => {
  const UtteranceClass = internal.speechSynthesisUtterance;
  return new UtteranceClass(text)
};



/**
 * Speaks a voice by given parameters, constructs utterance by best possible
 * combinations of parameters and defaults.
 *
 * If the given utterance parameters are missing or invalid, defaults will be
 * used as fallback.
 *
 * @example
 * const voice = EasySpeech.voices()[10] // get a voice you like
 *
 * EasySpeech.speak({
 *   text: 'Hello, world',
 *   voice: voice,
 *   pitch: 1.2,  // a little bit higher
 *   rate: 1.7, // a little bit faster
 *   boundary: event => console.debug('word boundary reached', event.charIndex),
 *   error: e => notify(e)
 * })
 *
 * @param {object} options - required options
 * @param {string} text - required text to speak
 * @param {object=} voice - optional `SpeechSynthesisVoice` instance or
 *   structural similar object (if `SpeechSynthesisUtterance` is not supported)
 * @param {number=} options.pitch - Optional pitch value >= 0 and <= 2
 * @param {number=} options.rate - Optional rate value >= 0.1 and <= 10
 * @param {number=} options.volume - Optional volume value >= 0 and <= 1
 * @param {boolean=} options.force - Optional set to true to force speaking, no matter the internal state
 * @param {boolean=} options.infiniteResume - Optional, force or prevent internal resumeInfinity pattern
 * @param {boolean=} options.noStop - Optional, if true will not stop current voices
 * @param {object=} handlers - optional additional local handlers, can be
 *   directly added as top-level properties of the options
 * @param {function=} handlers.boundary - optional, event handler
 * @param {function=} handlers.end - optional, event handler
 * @param {function=} handlers.error - optional, event handler
 * @param {function=} handlers.mark - optional, event handler
 * @param {function=} handlers.pause - optional, event handler
 * @param {function=} handlers.resume - optional, event handler
 * @param {function=} handlers.start - optional, event handler
 *
 * @return {Promise<SpeechSynthesisEvent|SpeechSynthesisErrorEvent>}
 * @fulfill {SpeechSynthesisEvent} Resolves to the `end` event
 * @reject {SpeechSynthesisEvent} rejects using the `error` event
 */
function speak ({ text, voice, pitch, rate, volume, force, infiniteResume, noStop, ...handlers }) {
    ensureInit({ force });
  
    if (!validate.text(text)) {
      throw new Error('Speech: at least some valid text is required to speak')
    }
  
    if ((new TextEncoder().encode(text)).length > 4096) {
      const message = 'EasySpeech: text exceeds max length of 4096 bytes, which will not work with some voices.';
      switch (internal.maxLengthExceeded) {
        case 'none':
          break
        case 'error':
          throw new Error(message)
        case 'warn':
        default:
          debug(message);
      }
    }
  
    const getValue = options => {
      const [name, value] = Object.entries(options)[0];
  
      if (validate[name](value)) {
        return value
      }
  
      return internal.defaults?.[name]
    };
  
    return new Promise((resolve, reject) => {
      logStatus('init speak');
  
      const utterance = createUtterance(text);
      const currentVoice = getCurrentVoice(voice);
      
      if (currentVoice) {
        utterance.voice = currentVoice;
        utterance.lang = currentVoice.lang;
        utterance.voiceURI = currentVoice.voiceURI;
      }
  
      utterance.text = text;
      utterance.pitch = getValue({ pitch });
      utterance.rate = getValue({ rate });
      utterance.volume = getValue({ volume });
  
      const isMsNatural =
        utterance.voice &&
        utterance.voice.name &&
        utterance.voice.name
          .toLocaleLowerCase()
          .includes('(natural)');
      debugUtterance(utterance, { isMsNatural });
  
      utteranceEvents.forEach(name => {
        const fn = handlers[name];
  
        if (validate.handler(fn)) {
          utterance.addEventListener(name, fn);
        }
  
        if (internal.handlers?.[name]) {
          utterance.addEventListener(name, internal.handlers[name]);
        }
      });
  
      // always attached are start, end and error listener
      utterance.addEventListener('start', () => {
        patches.paused = false;
        patches.speaking = true;
  
        const defaultResumeInfinity = (
          !isMsNatural &&
          !patches.isFirefox &&
          !patches.isSafari &&
          patches.isAndroid !== true
        );
        
        const useResumeInfinity = typeof infiniteResume === 'boolean'
          ? infiniteResume
          : defaultResumeInfinity;
  
        if (useResumeInfinity) {
          resumeInfinity(utterance);
        }
      });
  
      utterance.addEventListener('end', endEvent => {
        logStatus('speak complete');
        patches.paused = false;
        patches.speaking = false;
        clearTimeout(timeoutResumeInfinity);
        resolve(endEvent);
      });
  
      utterance.addEventListener('error', (errorEvent = {}) => {
        logStatus(`speak failed: ${errorEvent.message}`);
        patches.paused = false;
        patches.speaking = false;
        clearTimeout(timeoutResumeInfinity);
        reject(errorEvent);
      });
  
      // make sure we have no mem-leak
      clearTimeout(timeoutResumeInfinity);
  
      // do not cancel currently playing voice, if noStop option is true explicitly.
      if (!(noStop === true)) {
        internal.speechSynthesis.cancel();
      }
  
      setTimeout(() => internal.speechSynthesis.speak(utterance), 10);
    })
  };
  
  /** @private **/
  const debugUtterance = ({ voice, pitch, rate, volume }, { isMsNatural = false } = {}) => {
    debug(`utterance: voice=${voice?.name} volume=${volume} rate=${rate} pitch=${pitch} isMsNatural=${isMsNatural}`);
  };


  
/**
 * Timer variable to clear interval
 * @private
 */
let timeoutResumeInfinity;

/**
 * Fixes long texts in some browsers
 * @private
 * @param target
 */
function resumeInfinity (target) {
  if (!target && timeoutResumeInfinity) {
    debug('force-clear timeout');
    return scope.clearTimeout(timeoutResumeInfinity)
  }

  const { paused, speaking } = internal.speechSynthesis;
  const isSpeaking = speaking || patches.speaking;
  const isPaused = paused || patches.paused;
  debug(`resumeInfinity isSpeaking=${isSpeaking} isPaused=${isPaused}`);

  if (isSpeaking && !isPaused) {
    internal.speechSynthesis.pause();
    internal.speechSynthesis.resume();
  }
  timeoutResumeInfinity = scope.setTimeout(function () {
    resumeInfinity(target);
  }, 5000);
}



function reset () {
    Object.assign(internal, {
      status: 'reset',
      initialized: false,
      speechSynthesis: null,
      speechSynthesisUtterance: null,
      speechSynthesisVoice: null,
      speechSynthesisEvent: null,
      speechSynthesisErrorEvent: null,
      voices: null,
      defaultVoice: null,
      defaults: {
        pitch: 1,
        rate: 1,
        volume: 1,
        voice: null
      },
      handlers: {}
    });
};