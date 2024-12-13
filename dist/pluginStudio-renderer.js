let cyPlugins;
let selected;
let plugins;
let tblPlugins = [];
let pluginEditor;
let currentPluginEditor;
let pluginSaved = false;

window.onbeforeunload = async (e) => {
  e.returnValue = false;
  window.electronAPI.quitStudio(pluginSaved)
}


document.getElementById('informations').addEventListener('click', async () => {
  document.getElementById('close-plugins').click()
});


document.getElementById('jsoneditor').addEventListener('click', async () => {
  //document.getElementById('close-plugins').click()
});


document.getElementById('informations-tab').addEventListener('click', async () => {
  if (selected) {
    let savedPlugin = await getSelectedPlugin (selected)
    let plugin = await getPlugin (selected.id())
    setTabInformations(plugin)
    savedPlugin.tab = 'informations';
    setTab('informations');
  }
});


document.getElementById('properties-tab').addEventListener('click', async () => {
  if (selected) {
    let savedPlugin = await getSelectedPlugin (selected)
    let plugin = await getPlugin (selected.id())
    let result = await setTabProperties(plugin)
    if (result === false) savedPlugin = setOldPropertySelectedPlugin()
    savedPlugin.tab = 'properties';
    setTab(savedPlugin.tab);
  }
});


document.getElementById('jsoneditor').addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  let json = pluginEditor.get();
  let id = Object.keys(json.modules)[0];
  var handler = async (e) => {
    e.preventDefault();
    window.electronAPI.showStudioEditorMenu({plugin: id, fullPath: currentPluginEditor.fullPath, property: json})
    window.removeEventListener('contextmenu', handler, false);
  }

  window.addEventListener('contextmenu', handler, false);
  return false;
})


window.electronAPI.propertySaved(async (_event, arg) => {
  let id = Object.keys(arg.property.modules)[0];
  if (arg.saved === true) {
    pluginSaved = true;
    let ele = cyPlugins.$('#'+id)
    let msg = await Lget("pluginStudio", "disabled")
    ele.data('name', (arg.property.modules[id].active === undefined || (arg.property.modules[id].active && arg.property.modules[id].active === true)) ? ele.data('name').replace("\n("+msg+")", "") : (ele.data('name').indexOf(msg) === -1) ? ele.data('name')+"\n("+msg+")" : ele.data('name'))
    let plugin = getPlugin(id);
    setNewPluginProperty(id, arg.property);
    currentPluginEditor = plugin;
    msg = await Lget("pluginStudio", "pluginPropertySaved", id); 
    notification (msg);
  } else {
    msg = await Lget("pluginStudio", "pluginPropertyNoSaved", id);
    notification (msg);
  }
})


window.electronAPI.activePlugin(async (_event, arg) => {

  let msg = await Lget("pluginStudio", "disabled") 
  cyPlugins.$('#'+arg.plugin).data('name', (arg.state) ? arg.name.replace("\n("+msg+")", "") : arg.name + "\n("+msg+")");

  let plugin = getPlugin(arg.plugin)
  plugin.properties.modules[arg.plugin].active = arg.state
  setNewPluginProperty(arg.plugin, plugin.properties)

  if (pluginEditor) {
     let json = pluginEditor.get();
     if (json.modules[arg.plugin]) {
          pluginEditor.destroy();
          pluginEditor = null;
          let container = document.getElementById("jsoneditor");
          pluginEditor = new JSONEditor(container);
          pluginEditor.set(plugin.properties);
          pluginEditor.expandAll();
     }
   }

  let info
  if (arg.state) {
    info = await Lget("pluginStudio", "pluginActivated") 
  } else {
    info = await Lget("pluginStudio", "pluginDesactivated") 
  }
  msg = await Lget("pluginStudio", "plugin", arg.plugin) 
  notification (msg + " " + info)
})


async function refreshPluginsButton () {
  let collection = cyPlugins.filter((element, i) => {
    if (element.hasClass('plugin')) return true;
      return false;
  });
  cyPlugins.remove(collection);

  await addPluginsButton();

  if (pluginEditor) {
    let json = pluginEditor.get();
    if (json.modules[plugin]) {
         pluginEditor.destroy();
         pluginEditor = null;
         currentPluginEditor = null;
    }
  }
}


window.electronAPI.returnDeletePlugin( async (_event, plugin) => {
  await refreshPluginsButton();
  emptyTab();
  let msg = await Lget("pluginStudio", "pluginRemoved", plugin);
  notification (msg);
})


window.electronAPI.refreshPlugin(async (_event, plugin) => {
  let msg = await Lget("pluginStudio", "pluginReloaded", plugin)
  notification (msg)
})


window.electronAPI.documentationError((_event, err) => {
  notification (err)
})


function notification (msg, err) {
  let notif = document.getElementById('notification');
  notif.style.color = (err) ? 'red' : 'rgba(255, 255, 255, 0.9)';
  if (notif.opened === true) notif.opened = false;
  notif.innerHTML = msg;
  notif.opened = true;
}


async function setCY(target) {

  let cy = cytoscape({
    container: document.getElementById(target),
    boxSelectionEnabled: false,
    autounselectify: false,
    zoomingEnabled: false,
    autoungrabify : false,
    selectionType: 'single',
    userZoomingEnabled: false,
    userPanningEnabled: false,
    panningEnabled: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    pixelRatio: 'auto',
    style: cytoscape.stylesheet()
        .selector('node')
        .css({
          'label' : 'data(name)',
          'height': 40,
          'width': 40,
          'background-fit': 'cover',
          'border-color': "rgba(226, 45, 17, 1)",
          'border-width': 4,
          'border-opacity': 0,
          "font-size" : 12,
          "color" : "white",
          "text-wrap": "wrap",
          "text-max-width": 75,
          "text-valign": "bottom",
          "text-margin-y": 5,
          "text-halign": "center",
          'text-outline-width': 0,
          'text-outline-color': "rgba(86, 87, 85, 1)"
        })
    })
    return cy
}



function addCYButton (cy, image, id, name, y, bclass) {
  cy.add(
    { group: "nodes",
      data: { id: id, name: name}
    }
  );
  let s = cy.$('#'+id);
  style = {
      'background-image': "url('"+image+"')"
  };
  s.style(style);
  s.renderedPosition('x', 50);
  s.renderedPosition('y', y);
  cy.$('#'+id).addClass(bclass);
  s.on('tap', function(evt){
    if (selected && selected.id() == evt.target.id()) {
          window.electronAPI.showPluginMenu({id: evt.target.id(), name: evt.target.data('name')})
      } else if (!selected || (selected && selected.id() != evt.target.id())) {
          document.getElementById('close-plugins').click()
          showtab(evt.target);
      }
  });
  s.lock();
}


function getSelectedPlugin(ele) {
  for (i in tblPlugins) {
    if (tblPlugins[i].id === ele.id()) return tblPlugins[i]
  }
}


function getPlugin(id) {
  for (i in plugins) {
    if (plugins[i].id === id) return plugins[i]
  }
}


function deletePlugin (id) {
  for (i in plugins) {
    if (plugins[i].id === id) {
      delete plugins[i];
      return;
    }
  }
}


function setNewPluginProperty(id, property) {
  for (i in plugins) {
    if (plugins[i].id === id) {
      plugins[i].properties = property
      break
    }
  }
}


function setOldPropertySelectedPlugin() {
  let json = pluginEditor.get();
  let id = Object.keys(json.modules)[0];
  let ele = cyPlugins.$('#'+id);
  setSelectedPlugin(ele)
  return getSelectedPlugin(ele)
}


function setSelectedPlugin(ele) {

  if (selected) {
    selected.unselect();
    selected.style ({
      'border-opacity': 0
    });
  }

  ele.select();
  selected = ele;
  ele.style ({
    'border-opacity': 1
  });
}


function unSelectPlugin() {
  if (selected) {
    selected.unselect();
    selected.style ({
      'border-opacity': 0
    });
  }
  selected = null
}


async function showtab (ele) {

  setSelectedPlugin(ele)
  let savedPlugin = await getSelectedPlugin (ele)
  let plugin = await getPlugin (ele.id())

  if (!savedPlugin) {
    tblPlugins.push({id: ele.id(), name: ele.data('name'), tab: 'informations'});
    setTabInformations(plugin)
    setTab('informations')
  } else {
    switch (savedPlugin.tab) {
      case 'informations':
        setTabInformations(plugin)
        setTab(savedPlugin.tab);
      break;
      case 'properties':
        let result = await setTabProperties(plugin)
        if (result === false)
          savedPlugin = setOldPropertySelectedPlugin()
        savedPlugin.tab = 'properties';
        setTab(savedPlugin.tab);
        break;
    }
  }

}


function emptyTab () {

  let tabs = document.getElementsByClassName("plugin-class");
  for (i = 0; i < tabs.length; i++) {
      tabs[i].style.display = "none";
  }
  let link = document.getElementsByClassName("plugins-tab");
  for (i = 0; i < link.length; i++) {
      link[i].className = link[i].className.replace(" active", "");
      link[i].selected = false;
  }
  document.getElementById('empty').style.display = "block";
}


function setTab (selected) {

  let tabs = document.getElementsByClassName("plugin-class");
  for (i = 0; i < tabs.length; i++) {
      tabs[i].style.display = "none";
  }
  let link = document.getElementsByClassName("plugins-tab");
  for (i = 0; i < link.length; i++) {
      link[i].className = link[i].className.replace(" active", "");
      link[i].selected = false;
  }
  document.getElementById(selected).style.display = "block";
  tabs = document.getElementsByClassName("action-tab");
  for (i = 0; i < tabs.length; i++) {
      tabs[i].style.display = "";
  }

  document.getElementById(selected+'-tab').className += " active";
  document.getElementById(selected+'-tab').selected = true;
 
}



async function setTabProperties (plugin) {

    if (!currentPluginEditor || currentPluginEditor.id !== plugin.id) {
        if (pluginEditor) {
          let json = pluginEditor.get();
          let answer = await window.electronAPI.savePluginPropertyFile({id: currentPluginEditor.id, fullPath: currentPluginEditor.fullPath, editor: json, property: currentPluginEditor.properties})
          switch (answer) {
            case 0:
              pluginSaved = true;
              let ele = cyPlugins.$('#'+currentPluginEditor.id);
              msg = await Lget("pluginStudio", "disabled");
              ele.data('name', ((json.modules[currentPluginEditor.id].active !== undefined && json.modules[currentPluginEditor.id].active === false) ? ele.data('name') + "\n("+msg+")" : ele.data('name').replace("\n("+msg+")", "")));
              setNewPluginProperty(currentPluginEditor.id, json);
              let msg = await Lget(["pluginStudio", "pluginPropertySaved", currentPluginEditor.id]);
              notification (msg);
            case 1:
              pluginEditor.destroy();
              pluginEditor = null;
              currentPluginEditor = null;
              break;
            case 2:
              return false;
          }
        }

        let container = document.getElementById("jsoneditor");
        pluginEditor = new JSONEditor(container);
        currentPluginEditor = plugin;
        pluginEditor.set(plugin.properties);
        pluginEditor.expandAll();
        return true;
    }
}


function setTabInformations (plugin) {

    let converter = new showdown.Converter();
    converter.setOption('headerLevelStart', 2);
    converter.setOption('tasklists', true);
    converter.setOption('ghCompatibleHeaderId', true);
    converter.setOption('rawHeaderId', true);
    converter.setOption('literalMidWordAsterisks', true);
    converter.setOption('strikethrough', true);
    converter.setOption('tables', true);
    converter.setOption('ghCodeBlocks', true);
    converter.setOption('tablesHeaderId', true);
    converter.setOption('simpleLineBreaks', true);
    converter.setOption('openLinksInNewWindow', true);
    converter.setOption('backslashEscapesHTMLTags', true);
    converter.setOption('emoji', true);
    converter.setOption('simplifiedAutoLink', true);
    converter.setOption('parseImgDimensions', true);
    converter.setOption('excludeTrailingPunctuationFromURLs', true);

    converter.setFlavor('github');

    let html = converter.makeHtml(plugin.md);
    document.getElementById("markdown").innerHTML = html;

}



async function setLangTargets() {
  document.getElementById('open-plugins').innerHTML = await Lget("pluginStudio", "openClose");
  document.getElementById('close-plugins').innerHTML = await Lget("pluginStudio", "openClose");
  document.getElementById('info-label').innerHTML = await Lget("pluginStudio", "info");
  document.getElementById('properties-label').innerHTML = await Lget("pluginStudio", "properties");
  document.getElementById('plugin-title').innerHTML = await Lget("pluginStudio", "pluginTitle");
  document.getElementById('plugin-subtitle').innerHTML = await Lget("pluginStudio", "pluginSubtitle");
}


async function Lget (top, target, param) {
  if (param) {
      return await window.electronAPI.getMsg([top+"."+target, param])
  } else {
      return await window.electronAPI.getMsg(top+"."+target)
  }
}



async function addPluginsButton () {
  plugins = await window.electronAPI.getPlugins();
  let divSize = document.getElementById('cy-plugins').style.height = document.getElementById('cy-plugins-div').style.height;
  let pos = 35;
  for (let plugin in plugins) {
    addCYButton(cyPlugins, plugins[plugin].image, plugins[plugin].id, plugins[plugin].name, pos, 'plugin');
    pos += 85;
    if (divSize < pos + 35) {
      document.getElementById('cy-plugins').style.height = (pos - 20)+"px";
    }
  }
}


window.electronAPI.onInitApp(async (_event) => {
  setLangTargets();
  cyPlugins = await setCY('cy-plugins');
  addPluginsButton();
})



