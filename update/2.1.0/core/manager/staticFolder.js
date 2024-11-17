import {default as express } from 'express';
import _ from 'underscore';

let folders = [];

function setStaticFolder(folder, callback) {

  if (!_.contains(folders, folder)) {
	  appClient.use(express.static(folder));
    folders.push(folder);
  }
  if (callback) callback();

}


async function initStatic() {
  Avatar.static = {
    'set' : setStaticFolder
  }
}

export { initStatic }