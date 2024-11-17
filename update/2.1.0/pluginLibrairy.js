import * as path from 'node:path';
import fs from 'fs-extra';
import { default as klawSync } from 'klaw-sync';
import _ from 'underscore';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let Config;


async function readyToShow () {
    let pluginList = await Avatar.Plugin.getList();
    let count = pluginList.length; 
    if (count === 0) return;
    for (let i in pluginList) {
      if (pluginList[i]._script.readyToShow) await pluginList[i]._script.readyToShow();
      if (!--count) return;
    }
}


async function getPluginWidgets () {
      let pluginList = await Avatar.Plugin.getList();
      let pluginWidgets = [], count = pluginList.length; 
      if (count === 0) return pluginWidgets;
      for (let i in pluginList) {
        if (pluginList[i]._script.getWidgetsOnLoad) {
            let widgets = await pluginList[i]._script.getWidgetsOnLoad();
            if (widgets) pluginWidgets.push(widgets);
            if (!--count) return pluginWidgets;
        } else if (!--count) {
            return pluginWidgets;
        }
      }
}


async function refreshPluginWidgetInfo (arg) {
    let script = Avatar.find(arg.plugin);
    if (script && script._script.refreshWidgetInfo)
        return await script._script.refreshWidgetInfo(arg); 
    
    let APIfolder = fs.existsSync(path.resolve(__dirname, 'core/plugins', arg.plugin, 'lib', arg.plugin+'.js'))
    ? path.resolve(__dirname, 'core/plugins', arg.plugin, 'lib', arg.plugin+'.js') : null;  

    await Avatar.Widget.initVar(path.resolve(__dirname, 'core/plugins', arg.plugin, 'assets/widget'), path.resolve(__dirname, 'core/plugins', arg.plugin, 'assets/images/widget'), APIfolder, Config.modules[arg.plugin]);
    return await Avatar.Widget.refreshWidgetInfo(arg);
}


async function getNewValuePluginWidgetById (arg) {
    let script = Avatar.find(arg.plugin);
    if (script && script._script.getNewValueWidgetById)
        return await script._script.getNewValueWidgetById(arg);

    if (fs.existsSync(path.resolve(__dirname, 'core/plugins', arg.plugin, 'lib', arg.plugin+'.js'))) {
        let api = path.resolve(__dirname, 'core/plugins', arg.plugin, 'lib', arg.plugin+'.js');
        let APIPlugin = await import ('file:///'+api);
        let API = await APIPlugin.init();
        await API.initVar(Config.modules[arg.plugin]);
        let info = await API.getPeriphCaract(arg.periphId);
        let value = _.reject(arg.currentValue, (num) => {
            return num.description === info.last_value_text;
        })
        return value;
    } else {
        return arg.currentValue;
    }
}


async function pluginWidgetAction (arg) {
    let script = Avatar.find(arg.plugin);
    return await script._script.widgetAction(arg);
}


function onPluginClose (arg) {
    return new Promise(async (resolve, reject) => {
        let pluginList = await Avatar.Plugin.getList();
        let count = pluginList.length;
        if (count === 0) return resolve();
    
        for (let i in pluginList) {
            if (pluginList[i]._script.onClose) {
                try {
                    let script = Avatar.find(pluginList[i].name);
                    await script._script.onClose((arg[pluginList[i].name] ? arg[pluginList[i].name] : null));
                    if (!--count) resolve();
                } catch (err) {
                    reject (err);
                }
            } else if (!--count) {
                    resolve();
            }
        }
    })
}


async function getWidgetImage (arg) {
    let script = Avatar.find(arg.plugin);
    if (script && script._script.getWidgetImage) return await script._script.getWidgetImage(arg.infos);

    await Avatar.APIFunctions.initVar(path.resolve(__dirname, 'core/plugins', arg.plugin, 'assets/images/widget'));
    return await Avatar.APIFunctions.getImageSync(arg.infos.usage, arg.infos.periph_id, arg.infos.value, arg.infos.values);
}


async function getWidgetInfos (arg) {
    let script = Avatar.find(arg.plugin);
    if (script && script._script.getWidgetInfos) 
        return await script._script.getWidgetInfos(arg.widget);

    let APIfolder = fs.existsSync(path.resolve(__dirname, 'core/plugins', arg.plugin, 'lib', arg.plugin+'.js'))
        ? path.resolve(__dirname, 'core/plugins', arg.plugin, 'lib', arg.plugin+".js") : null;
    
        await Avatar.Widget.initVar(path.resolve(__dirname, 'core/plugins', arg.plugin, 'assets/widget'), path.resolve(__dirname, 'core/plugins', arg.plugin, 'assets/images/widget'), APIfolder, Config.modules[arg.plugin]);
    return await Avatar.Widget.getWidgetInfos(arg.widget);
}


async function reloadPlugin (plugin) {
    let propertyFile = path.resolve (__dirname , 'core/plugins', plugin, plugin+'.prop')
    let property = fs.readJsonSync(propertyFile, { throws: false })
    if (!_.isEqual(Config.modules[plugin], property.modules[plugin]) || (property.cron && !_.isEqual(Config.cron[plugin], property.cron[plugin]))) {
      Config = await Avatar.Config.refreshPluginProp(plugin, propertyFile);
    }

    return Config;
}


async function getPlugins () {

    let plugins = [];
    let folders = klawSync(path.resolve(__dirname, 'core/plugins'), {nofile: true, depthLimit: 0});
    let count = folders.length;
    if (count === 0) return plugins;

    for (let plugin in folders) {
        let folder = folders[plugin].path.substring(folders[plugin].path.lastIndexOf(path.sep) + 1);
        let properties = fs.readJsonSync(folders[plugin].path+'/'+folder+'.prop', { throws: false });
        let name, file;
        if (properties) {
            name = (properties.modules[folder] && properties.modules[folder].name) ? properties.modules[folder].name : folder;
            file = folder+'.prop';
            let disabled = L.get("pluginStudio.disabled");
            name = (properties.modules[folder].active || properties.modules[folder].active === undefined) ? name : name + "\n("+disabled+")";
        } else {
            properties = fs.readJsonSync(folders[plugin].path+'/'+folder+'.json', { throws: false });
            name = folder;
            file = folder+'.json';
        }
        if (properties) {
            let image = (fs.existsSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/images', folder+'.png')))
                ? path.resolve(__dirname, 'core/plugins', folder, 'assets/images', folder+'.png')
                : path.resolve(__dirname, 'assets/images/icons/plugin.png');

            var mdInfos;
            if (fs.existsSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/infos_'+Config.language+'.md'))) {
                mdInfos = fs.readFileSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/infos_'+Config.language+'.md'), 'utf8');
            } else if (fs.existsSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/infos.md'))) {
                mdInfos = fs.readFileSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/infos.md'), 'utf8');
            } else {
                let msg = L.get("pluginStudio.noDescription")
                fs.ensureDirSync(path.resolve(__dirname, 'core/plugins', folder, 'assets'));
                fs.writeFileSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/infos.md'), "# "+name+"\n\n"+msg, 'utf8');
                mdInfos = fs.readFileSync(path.resolve(__dirname, 'core/plugins', folder, 'assets/infos.md'), 'utf8');
            }
            plugins.push({fullPath: folders[plugin].path+'/'+file, id: folder , name: name, image: image, properties: properties, md: mdInfos});
        }
        if (!--count) return plugins;
    }
}


async function activePlugin (plugin, state) {

    let propertyFile = path.resolve (__dirname , 'core/plugins', plugin, plugin+'.prop')
    let property = fs.readJsonSync(propertyFile, { throws: false })
    property.modules[plugin].active = state
    fs.writeJsonSync(propertyFile, property)

    if (!Config.modules[plugin] && state === true) {
        Config = await Avatar.Config.refreshPluginProp(plugin, propertyFile)
        Avatar.Plugin.add(plugin)
    } else if (Config.modules[plugin] && state === false) {
      Avatar.Plugin.removeCache(plugin)
    }

}


async function initVar (config) {
    Config = config;
}


async function init () {
    return {
        'initVar': initVar,
        'getPlugins': getPlugins,
        'reloadPlugin': reloadPlugin,
        'activePlugin': activePlugin,
        'getPluginWidgets': getPluginWidgets,
        'refreshPluginWidgetInfo': refreshPluginWidgetInfo,
        'getNewValuePluginWidgetById': getNewValuePluginWidgetById,
        'pluginWidgetAction': pluginWidgetAction,
        'onPluginClose': onPluginClose,
        'getWidgetImage': getWidgetImage,
        'getWidgetInfos': getWidgetInfos,
        'readyToShow': readyToShow
    }
}


export { init };