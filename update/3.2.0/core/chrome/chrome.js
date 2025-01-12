import * as path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { default as SSE } from 'sse-emitter';
import { CronJob } from 'cron';
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const chromeFile = fs.readJsonSync(path.resolve(__dirname, '../plugins/chrome/chrome.json'), { throws: false });
if (!chromeFile) {
    throw new Error ("The chrome configuration file is missing!");
}
const chromeProp = chromeFile.modules.chrome;
let https, sse, ChromeServer, timeoutRestart, countRestart = 1;
var browser;

try {
    https = await import('node:https');
} catch (err) {
    throw new Error ("Https support is disabled!: " + err);
}


async function startNavigator () {

    try {
            browser = await puppeteer.launch({
                headless: chromeProp.headless,
                ignoreDefaultArgs: false
            });

            const context = browser.defaultBrowserContext();
            await context.clearPermissionOverrides();
            await context.overridePermissions('https:'+chromeProp.address+':'+chromeProp.port, ['microphone']);
            const page = await browser.newPage();
            await page.goto('https://'+chromeProp.address+':'+chromeProp.port);

            const granted = await page.evaluate(async () => {
                return (await navigator.permissions.query({name: 'microphone'})).state;
            });
            granted === 'granted'
                ? info (L.get(['mainInterface.granted', granted]))
                : error (L.get(['mainInterface.granted', granted]));

            if (chromeProp.log === true) 
                page.on('console', msg => info(L.get(['mainInterface.log', msg.text()])));  

        } catch (err) {
            error(L.get('mainInterface.startNavigatorError'));
        }
}


async function HTTPSServer () { 
    return new Promise((resolve) => {
        try {
            ChromeServer = express();
            ChromeServer.use(helmet());
            ChromeServer.use(express.static(__dirname));

            sse = new SSE({});
            ChromeServer.get('/AvatarClient', sse.bind());
            https.createServer({
                key: fs.readFileSync(path.resolve(__dirname, 'certificates', chromeProp.key)),
                cert: fs.readFileSync(path.resolve(__dirname, 'certificates', chromeProp.cert))
            }, ChromeServer).listen(chromeProp.port);
            resolve( true);
        } catch (err) {
            resolve(err);
        }
    })
}


async function restartChrome (resolve) {
       let d = new Date();
        let s = d.getSeconds()+chromeProp.timeout_ready;
        d.setSeconds(s);
        timeoutRestart = new CronJob(d, async () => {
            countRestart += 1;
            if (countRestart === 10) {
                resolve (L.get('mainInterface.timeoutConnexion'));
            } else {
                await restartChrome(resolve);
            }
        }, null, true);

        appInfoOrange(L.get(['mainInterface.restartConnexion', countRestart]));
        if (browser) browser.close();
        await startNavigator();
        sse.emit('/AvatarClient', {command: "init", conf: {chrome: chromeProp, config: Config}});
}


function initRegonizer () {
    return new Promise((resolve) => {
        let d = new Date();
        let s = d.getSeconds()+chromeProp.timeout_ready;
        d.setSeconds(s);
        let timeoutResponse = new CronJob(d, async () => {
            await restartChrome(resolve);
        }, null, true);

        sse.emit('/AvatarClient', {command: "init", conf: {chrome: chromeProp, config: Config}});

        ChromeServer.post('/AvatarServer', async (req, res) => {
            if (timeoutResponse) timeoutResponse.stop();
            if (timeoutRestart) timeoutRestart.stop();
            timeoutResponse = timeoutRestart = null;
            res.writeHead(200).end();

            if (req.query.action) await Avatar.Listen.manageActions(req.query.action, true);
            if (req.query.listen) await Avatar.Listen.manageActions(req.query.listen, false);
            if (req.query.AKA) await Avatar.Listen.AKA();
            if (req.query.directActionAKA) await Avatar.Listen.directActionAKA(req.query.directActionAKA, req.query.plugin, req.query.options);
            if (req.query.directNlpAKA) await Avatar.Listen.manageActions(req.query.directNlpAKA, true);
            if (req.query.voices) await Avatar.Listen.remoteVoices(JSON.parse(req.query.voices));
            if (req.query.setvoices) Avatar.Interface.setRemoteVoices(JSON.parse(req.query.setvoices));
            if (req.query.endSpeak) await Avatar.Listen.remoteSpeakEnd(req.query.endSpeak);
            if (req.query.errorSpeak) {
                error("Google Chrome error: " + req.query.errorSpeak || "unknow");
                await Avatar.Listen.remoteSpeakEnd(req.query.end);
            }

            if (req.query.init) {
                switch (req.query.init) {
                    case 'noFeatures':
                        appInfoOrange(L.get('mainInterface.noFeatures'));
                        break;
                    case 'notInitialized':
                        appInfoOrange(L.get('mainInterface.notInitialized'));
                        break;
                    case 'noinit':
                        appInfoOrange(L.get('mainInterface.noinit'));
                        break;  
                }
                infoGreen(L.get('mainInterface.readyToListen'));
                resolve(true);
            }
        });
    });
}

async function startAKA () {
    sse.emit('/AvatarClient', {command: "startAKA"});
}

async function stopAKA () {
    sse.emit('/AvatarClient', {command: "stopAKA"});
}

async function startListen (forced) {
    if (forced === true)
        sse.emit('/AvatarClient', {command: "startForced"});
    else
        sse.emit('/AvatarClient', {command: "start"});
}


async function stopListen (forced) {
    if (forced === true) 
        sse.emit('/AvatarClient', {command: "stopForced"});
    else
        sse.emit('/AvatarClient', {command: "stop"});
}

async function getVoices(lang) {
    sse.emit('/AvatarClient', {command: "voices", lang: lang});
}


async function remoteSpeak(options) {
    sse.emit('/AvatarClient', {command: "remoteSpeak", options: options});
}

async function closeBrowser() {
    console.log ('je ferme')
    if (browser) await browser.close();
    console.log('ok fermé')
}

async function init () {

    if (!fs.existsSync(path.resolve(__dirname, 'certificates'))) fs.ensureDirSync(path.resolve(__dirname, 'certificates')); 
    if (!fs.existsSync(path.resolve(__dirname, 'certificates', chromeProp.key)) 
        || !fs.existsSync(path.resolve(__dirname, 'certificates', chromeProp.cert))) {
        infoOrange(L.get('mainInterface.noCertificates'));
        return true;
    }
    if (!chromeProp.key 
        || !chromeProp.cert 
        || !chromeProp.address) {
        infoOrange(L.get('mainInterface.noChromeProperties'));
        return true;
    }

    appInfo(L.get('mainInterface.secureConnect'));
    let secureConnexion = await HTTPSServer()
    if (secureConnexion !== true) return secureConnexion.message;
    appInfo(L.get('mainInterface.startBy'));
    await startNavigator();
    appInfo(L.get('mainInterface.startReconizer')); 
    let result = await initRegonizer();
    return result;
}

export {init, startListen, stopListen, startAKA, stopAKA, getVoices, remoteSpeak, closeBrowser}; 