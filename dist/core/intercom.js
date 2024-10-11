import { spawn } from 'node:child_process';
import * as util from "util";
import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function AudioRecorder (options, logger) {
    this._options = Object.assign({
        program: 'sox',             
        device: null,            
        driver: null,         
  
        bits: 16,			
        channels: 1,				        // Channel count.
        encoding: 'signed-integer',	// Encoding type. (only for `rec` and `sox`)
        format: 'S16_LE',           // Format type. (only for `arecord`)
        rate: 16000,                // Sample rate.
        type: 'wav',			          // File type.
  
        // Following options only available when using `rec` or `sox`.
        silence: 2,                 // Duration of silence in seconds before it stops recording.
        thresholdStart: 0.5,        // Silence threshold to start recording.
        thresholdStop: 0.5,         // Silence threshold to stop recording.
        keepSilence: true           // Keep the silence in the recording.
    }, options);

    this._logger = logger;
    this._childProcess = null;

    this._command = {
        arguments: [
            // Show no progress
            '-q',
            // Channel count
            '-c', this._options.channels.toString(),
            // Sample rate
            '-r', this._options.rate.toString(),
            // Format type
            '-t', this._options.type
        ],
        options: {
            encoding: 'binary'
        }
    };
  
    switch (this._options.program) {
    default:
    case 'sox':
        this._command.arguments.unshift(
            '-d'
        );
    case 'rec':
        // Add sample size and encoding type.
        this._command.arguments.push(
            // Show no error messages
            //   Use the `close` event to listen for an exit code.
            '-V0',
            // Endian
            //   -L = little
            //   -B = big
            //   -X = swap
            '-L',
            // Bit rate
            '-b', this._options.bits.toString(),
            // Encoding type
            '-e', this._options.encoding,
            // Pipe
            '-'
        );

        if (this._options.silence) {
            this._command.arguments.push(
                // Effect
                'silence'
            );

            // Keep the silence of the recording.
            if (this._options.keepSilence) {
                this._command.arguments.push(
                // Keep silence in results
                '-l'
                );
            }

            // Stop recording after duration has passed below threshold.
            this._command.arguments.push(
                // Enable above-periods
                '1',
                // Duration
                '0.1',
                // Starting threshold
                this._options.thresholdStart.toFixed(1).concat('%'),
                // Enable below-periods
                '1',
                // Duration
                this._options.silence.toFixed(1),
                // Stopping threshold
                this._options.thresholdStop.toFixed(1).concat('%')
            );
        }

        // Setup environment variables.
        if (this._options.device) {
            process.env.AUDIODEV=this._options.device;
            
        }
        if (this._options.driver) {
            process.env.AUDIODRIVER=this._options.driver;
        }
        break;

    case 'arecord':
        if (this._options.device) {
        this._command.arguments.unshift('-D', this._options.device);
        }
        this._command.arguments.push(
        // Format type
        '-f', 'S16_LE'
        );
        break;
    }

    if (this._logger) {
        appInfo(L.get(['intercom.command', this._options.program, this._command.arguments]));
    }

    return this;
}

util.inherits(AudioRecorder, EventEmitter);

AudioRecorder.prototype.start = function() {
   
    if (this._childProcess) {
        if (this._logger) {
            warn(L.get('intercom.active'));
        }
        this._childProcess.kill();
      }
      
    let audiorecoder = path.join(__dirname, 'lib/sox', process.platform, this._options.program)
    // Create new child process and give the recording commands.
    this._childProcess = spawn(audiorecoder, this._command.arguments);

    // Store this in `self` so it can be accessed in the callback.
    let self = this;
    this._childProcess.on('close', (exitCode) => {
        self.emit('close', exitCode);
    });
    this._childProcess.on('error', (error) => {
        self.emit('error', error);
    });

    if (this._logger) {
        info(L.get('intercom.start'));
    }

    return this;

};

AudioRecorder.prototype.stop = function() {

    if (!this._childProcess) {
        if (this._logger) {
            warn(L.get('intercom.stopError'));
        }
        return this;
      }
  
      this._childProcess.kill();
      this._childProcess = null;
  
      if (this._logger) {
        info(L.get('intercom.stop'));
      }
  
      return this;

}


AudioRecorder.prototype.stream = function() {

    if (!this._childProcess) {
        return null;
    }

    return this._childProcess.stdout;
}

export { AudioRecorder }; 