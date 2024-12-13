import { default as octonode } from './lib/octonode/octonode.js';
import fs from 'fs-extra';
import {download} from 'electron-dl';
import * as path from 'node:path';

import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let Config;

const checkUpdate = (win) => {

    return new Promise(async (resolve) => { 

        const client = octonode.client();
        if (!client) return resolve(false);
        const repo = client.repo(Config.repository);
        if (!repo) return resolve(false);
        
        repo.contents('update/newVersion.txt', async (err, data) => {

            if (err || !data || !data.download_url) return resolve(false);

            const outputZip = path.resolve(__dirname, 'tmp/download');
            fs.ensureDirSync(outputZip);

            try {
                await download(win, data.download_url, {
                    directory: outputZip,
                    showBadge: false,
                    showProgressBar: false,
                    filename: 'newVersion.txt',
                    overwrite: true
                })

                const newVersionFile = path.resolve(__dirname, 'tmp/download/newVersion.txt');
                const newVersion = fs.readFileSync(newVersionFile, 'utf8');
                fs.removeSync(newVersionFile);

                let newSplitVersion  = newVersion.split('.');
                const currentVersion = Config.version.split('.');

                if (parseInt(currentVersion[0]) < parseInt(newSplitVersion[0])) {
                    return resolve(newVersion.trim());
                } else if (parseInt(currentVersion[0]) <= parseInt(newSplitVersion[0]) && parseInt(currentVersion[1]) < parseInt(newSplitVersion[1])) {
                    return resolve(newVersion.trim());
                } else if (parseInt(currentVersion[0]) <= parseInt(newSplitVersion[0]) && parseInt(currentVersion[1]) < parseInt(newSplitVersion[1]) && parseInt(currentVersion[2]) < parseInt(newSplitVersion[2])) {
                    return resolve(newVersion.trim());
                }

                resolve(false);
                
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

