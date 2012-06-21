/** Code for managing plugins */
builder.plugins = {};

// States
builder.plugins.NOT_INSTALLED = "NOT_INSTALLED";
builder.plugins.INSTALLED     = "INSTALLED";
builder.plugins.TO_INSTALL    = "TO_INSTALL";
builder.plugins.TO_UNINSTALL  = "TO_UNINSTALL";
builder.plugins.TO_UPDATE     = "TO_UPDATE";

builder.plugins.DISABLED   = "DISABLED";
builder.plugins.ENABLED    = "ENABLED";
builder.plugins.TO_ENABLE  = "TO_ENABLE";
builder.plugins.TO_DISABLE = "TO_DISABLE";

builder.plugins.ds = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
builder.plugins.ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
builder.plugins.db = null;

/**
 * Will call callback with a list of {identifier, state, enabled, installedInfo, repositoryInfo} of all plugins.
 */
builder.plugins.getListAsync = function(callback) {
  builder.plugins.getRemoteListAsync(function(repoList, error) {
    var installedList = builder.plugins.getInstalledIDs();
    var repoMap = {};
    if (repoList) {
      for (var i = 0; i < repoList.length; i++) {
        repoMap[repoList[i].identifier] = repoList[i];
      }
    }
    var installedMap = {};
    for (var i = 0; i < installedList.length; i++) {
      installedMap[installedList] = true;
    }
    var result = [];
    // Add all installed plugins.
    for (var i = 0; i < installedList.length; i++) {
      var id = installedList[i];
      var line = builder.plugins.getInstalledState(id);
      line.identifier = id;
      line.installedInfo = builder.plugins.getInstalledInfo(id);
      if (repoMap[id]) {
        line.repositoryInfo = repoMap[id];
      }
      result.push(line);
    }
    
    // Add all non-installed plugins.
    for (var i = 0; i < repoList.length; i++) {
      var id = repoList[i].identifier;
      if (installedMap[id]) { continue; }
      result.push({
        "identifier": id,
        "state": builder.plugins.NOT_INSTALLED,
        "enabled": builder.plugins.ENABLED,
        "installedInfo": null,
        "repositoryInfo": repoList[i]
      });
    }
    
    callback(result, error);
  });
};

builder.plugins.isUpdateable = function(info) {
  if (!info.installedInfo || !info.repositoryInfo) {
    return false;
  }
  if (!info.repositoryInfo.browsers[bridge.browserType()]) {
    return false;
  }
  return info.installedInfo.pluginVersion < info.repositoryInfo.browsers[bridge.browserType()].pluginVersion;
};

builder.plugins.createDir = function(f) {
  if (!f.exists() || !f.isDirectory()) {  
    f.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0774);  
  }
}

builder.plugins.isValidID = function(str) {
  return new RegExp("[0-9a-zA-Z_]+", "g").test(str);
};

builder.plugins.getBuilderDir = function() {
  var f = builder.plugins.ds.get("ProfD", Components.interfaces.nsIFile);
  f.append("SeBuilder");
  builder.plugins.createDir(f);
  return f;
};

builder.plugins.getPluginsDir = function() {
  var f = builder.plugins.getBuilderDir();
  f.append("plugins");
  builder.plugins.createDir(f);
  return f;
};

builder.plugins.getInstalledIDs = function() {
  var result = [];
  var f = builder.plugins.getPluginsDir();
  var en = f.directoryEntries;
  while (en.hasMoreElements()) {
    var child = en.getNext();
    if (builder.plugins.isValidID(child.leafName)) {
      result.push(child.leafName);
    }
  }
  return result;
};

builder.plugins.getInstalledInfo = function(id) {
  try {
    var f = builder.plugins.getDirForPlugin(id);
    f.append("header.json");
    if (f.isFile()) {
      return JSON.parse(bridge.readFile(f));
    }
  } catch (e) {
    return null;
  }
};

builder.plugins.getInstalledState = function(id) {
  return {"state": builder.plugins.INSTALLED, "enabled": builder.plugins.ENABLED};
};

builder.plugins.getDirForPlugin = function(id) {
  return builder.plugins.getPluginsDir().append(id);
};

builder.plugins.getZipForPlugin = function(id) {
  return null;
};

/**
 * @return A list of info objects of all plugins in the plugin DB.
 */
builder.plugins.getRemoteListAsync = function(callback) {
  jQuery.ajax({
    type: "GET",
    cache: false,
    dataType: "json",
    url: bridge.pluginRepository(),
    success: function(data) {
      if (data.repositoryVersion > 1) {
        callback(null, "Plugin list data format is too new. Please upgrade Builder.");
      } else {
        var result = [];
        for (var i = 0; i < data.plugins.length; i++) {
          if (data.plugins[i].browsers[bridge.browserType()]) {
            result.push(data.plugins[i]);
          }
        }
        callback(result);
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      callback(null, "Unable to fetch plugins: " + (textStatus ? textStatus : "") + " " + (errorThrown ? errorThrown : ""));
    }
  });
};

builder.plugins.setInstallState = function(id, state) {
  
};

builder.plugins.setEnabledState = function(id, state) {
  
};

builder.plugins.performDownload = function(id) {
  
};

builder.plugins.performInstall = function(id) {
  
};

builder.plugins.performUninstall = function(id) {
  
};

builder.plugins.start = function() {
  Components.utils.import("resource://gre/modules/Services.jsm");
  var dbFile = builder.plugins.getBuilderDir()
  dbFile.append("plugins.sqlite");
  builder.plugins.db = Services.storage.openDatabase(dbFile); // Will also create the file if it does not exist
};

builder.registerPostLoadHook(builder.plugins.start);

builder.plugins.shutdown = function() {
  builder.plugins.db.asyncClose();
};

builder.registerPreShutdownHook(builder.plugins.shutdown);

builder.plugins.getResourcePath = function(id, relativePath) {
  var els = relativePath.split("/");
  var f = builder.plugins.getDirForPlugin(id);
  for (var i = 0; i < els.length; i++) {
    f.append(els[i]);
  }
  return builder.plugins.ios.newFileURI(f).spec;
};