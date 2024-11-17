import { spawn } from 'node:child_process';
import * as util from "util";
import { EventEmitter } from 'node:events';

function FFplay(file, opts, player, callback) {
	opts = opts || ["-nodisp", "-autoexit"];
	opts.unshift(file);
	this.proc = spawn(player,opts,{stdio:"ignore"});
	this.ef = function() {
		this.proc.kill();
	}.bind(this);
	process.on("exit",this.ef);
	this.proc.on("exit",function() {
		if(this.running) {
			this.running=false;
			process.removeListener("exit",this.ef);
			if(!this.manualStop) {
				setImmediate(function() { this.emit("stopped"); }.bind(this));
			}
			if (callback) callback(this);
		}
	}.bind(this));
	this.running = true;
}

util.inherits(FFplay,EventEmitter);

FFplay.prototype.paused = false;
FFplay.prototype.running = false;

FFplay.prototype.pause = function(callback) {
	if(!this.paused) {
		this.proc.kill("SIGSTOP");
		this.paused = true;
		this.emit("paused");
		if (callback) callback();
	}
};
FFplay.prototype.resume = function(callback) {
	if(this.paused) {
		this.proc.kill("SIGCONT");
		this.paused = false;
		this.emit("resumed");
		if (callback) callback();
	}
};

FFplay.prototype.stop = function(callback) {
	this.manualStop = true;
	this.proc.kill("SIGKILL");
	if (callback) callback();
};

export { FFplay }; 

