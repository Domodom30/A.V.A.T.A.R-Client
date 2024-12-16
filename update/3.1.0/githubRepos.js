import { default as octonode } from './lib/octonode/octonode.js';
import fs from 'fs-extra';
import {download} from 'electron-dl';
import * as path from 'node:path';

import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let Config;


const checkUpdateVersions = (currentVersion, newVersions) => {
    return new Promise(async (resolve) => {
        newVersions.forEach(newVersion => {

            let splitNewVersion = newVersion.split('.');
            
            if (parseInt(currentVersion[0]) < parseInt(splitNewVersion[0])) {
                return resolve(newVersion.trim());
            } else if (parseInt(currentVersion[0]) <= parseInt(splitNewVersion[0]) && parseInt(currentVersion[1]) < parseInt(splitNewVersion[1])) {
                return resolve(newVersion.trim());
            } else if (parseInt(currentVersion[0]) <= parseInt(splitNewVersion[0]) && parseInt(currentVersion[1]) <= parseInt(splitNewVersion[1]) && parseInt(currentVersion[2]) < parseInt(splitNewVersion[2])) {
                return resolve(newVersion.trim());
            }
        });

        return resolve(false);
    });    
}


const checkUpdate = (win) => {

    return new Promise(async (resolve) => { 

        const client = octonode.client();
        if (!client) return resolve(false);
        const repo = client.repo(Config.repository);
        if (!repo) return resolve(false);
        
        repo.contents('update/updateVersion.json', async (err, data) => {

            if (err || !data || !data.download_url) return resolve(false);

            const outputZip = path.resolve(__dirname, 'tmp/download');
            fs.ensureDirSync(outputZip);

            try {
                await download(win, data.download_url, {
                    directory: outputZip,
                    showBadge: false,
                    showProgressBar: false,
                    filename: 'updateVersion.json',
                    overwrite: true
                })

                const newVersionFile = path.resolve(__dirname, 'tmp/download/updateVersion.json');
                const newVersion = fs.readJsonSync(newVersionFile, { throws: true });
                const currentVersion = Config.version.split('.');
                resolve (await checkUpdateVersions (currentVersion, newVersion.versions));
            } catch (err) {
                error(L.get(["github.newVersion", err]));
                resolve(false);
            }
        })
    })
}

async function init(conf) {
    Config = conf;
    return {
        'checkUpdate': checkUpdate
    }
}
  
// Exports
export { init };

