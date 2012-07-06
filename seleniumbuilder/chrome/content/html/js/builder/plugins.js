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

builder.plugins.downloadingCount = 0;
builder.plugins.startupErrors = [];

builder.plugins.MAX_HEADER_VERSION = 1;

/**
 * Will call callback with a list of {identifier, installState, enabledState, installedInfo, repositoryInfo} of all plugins.
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
      installedMap[installedList[i]] = true;
    }
    var result = [];
    // Add all installed plugins.
    for (var i = 0; i < installedList.length; i++) {
      var id = installedList[i];
      var line = builder.plugins.getState(id);
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
        "installState": builder.plugins.NOT_INSTALLED,
        "enabledState": builder.plugins.ENABLED,
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
  return str && str.match(/^[0-9a-zA-Z_]+$/);
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
  var toInstall = {};
  var s = builder.plugins.db.createStatement("SELECT identifier FROM state WHERE installState = '" + builder.plugins.TO_INSTALL + "'");
  while (s.executeStep()) {
    result.push(s.row.identifier);
    toInstall[s.row.identifier] = true;
  }
  var f = builder.plugins.getPluginsDir();
  var en = f.directoryEntries;
  while (en.hasMoreElements()) {
    var child = en.getNext();
    var leafName = child.QueryInterface(Components.interfaces.nsIFile).leafName;
    if (child.QueryInterface(Components.interfaces.nsIFile).isHidden()) {
      continue;
    }
    if (!toInstall[leafName] && builder.plugins.isValidID(leafName)) {
      result.push(leafName);
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

builder.plugins.setInstallState = function(id, installState) {
  var s = builder.plugins.db.createStatement("SELECT * FROM state WHERE identifier = :identifier");
  s.params.identifier = id;
  if (s.executeStep()) {
    s = builder.plugins.db.createStatement("UPDATE state SET installState = :installState WHERE identifier = :identifier");
    s.params.identifier = id;
    s.params.installState = installState; 
    s.executeStep();
  } else {
    s = builder.plugins.db.createStatement("INSERT INTO state VALUES (:identifier, :installState, :enabledState)");
    s.params.identifier = id;
    s.params.installState = installState;
    s.params.enabledState = builder.plugins.ENABLED; 
    s.executeStep();
  }
};

builder.plugins.setEnabledState = function(id, enabledState) {
  var s = builder.plugins.db.createStatement("SELECT * FROM state WHERE identifier = :identifier");
  s.params.identifier = id;
  if (s.executeStep()) {
    s = builder.plugins.db.createStatement("UPDATE state SET enabledState = :enabledState WHERE identifier = :identifier");
    s.params.identifier = id;
    s.params.enabledState = enabledState; 
    s.executeStep();
  } else {
    s = builder.plugins.db.createStatement("INSERT INTO state VALUES (:identifier, :installState, :enabledState)");
    s.params.identifier = id;
    s.params.installState = builder.plugins.INSTALLED;
    s.params.enabledState = enabledState; 
    s.executeStep();
  }
};

/** @return The state of an installed plugin. */
builder.plugins.getState = function(id) {
  var s = builder.plugins.db.createStatement("SELECT * FROM state WHERE identifier = :identifier");
  s.params.identifier = id;
  if (s.executeStep()) { // qqDPS Synchronous API usage, naughty.
    return {"installState": s.row.installState, "enabledState": s.row.enabledState};
  } else {
    // We have no record of it, so keep it as default.
    return {"installState": builder.plugins.INSTALLED, "enabledState": builder.plugins.ENABLED};
  }
};

builder.plugins.pluginExists = function(id) {
  return builder.plugins.getDirForPlugin(id).isDirectory();
};

builder.plugins.getDirForPlugin = function(id) {
  var f = builder.plugins.getPluginsDir();
  f.append(id);
  return f;
};

builder.plugins.getZipForPlugin = function(id) {
  var f = builder.plugins.getBuilderDir();
  f.append("pluginzips");
  builder.plugins.createDir(f);
  f.append(id + ".zip");
  return f;
};

builder.plugins.getExtractForPlugin = function(id) {
  var f = builder.plugins.getBuilderDir();
  f.append("extract");
  builder.plugins.createDir(f);
  f.append(id);
  return f;
};

/**
 * @return A list of info objects of all plugins in the plugin DB.
 */
builder.plugins.getRemoteListAsync = function(callback) {
  jQuery.ajax({
    type: "GET",
    cache: false,
    dataType: "json",
    url: bridge.pluginRepository() + "?" + Math.random(),
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

builder.plugins.performDownload = function(id, url) {
  builder.plugins.downloadingCount++;
  jQuery('#plugins-downloading').show();
  
  var oReq = new XMLHttpRequest();
  oReq.open("GET", url + "?" + Math.random(), true);
  oReq.responseType = "arraybuffer";

  oReq.onload = function (oEvent) {
    var arrayBuffer = oReq.response; // Note: not oReq.responseText
    if (arrayBuffer) {
      var byteArray = new Uint8Array(arrayBuffer);
      var str = "";
      for (var i = 0; i < byteArray.length; i++) {
        str += String.fromCharCode(byteArray[i]);
      }
      var f = builder.plugins.getZipForPlugin(id);
      try { f.remove(true); } catch (e) {} // qqDPS
      f.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0600);
      var stream = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].
                   createInstance(Components.interfaces.nsIFileOutputStream);
      stream.init(f, 0x04 | 0x08 | 0x20, 0600, 0); // readwrite, create, truncate
      stream.write(str, byteArray.length);
      if (stream instanceof Components.interfaces.nsISafeOutputStream) {
        stream.finish();
      } else {
        stream.close();
      }
      builder.plugins.downloadSucceeded(id);
    } else {
      builder.plugins.downloadFailed(id, url + " not found");
    }
  };

  oReq.send(null);
};

builder.plugins.downloadSucceeded = function(id) {
  builder.plugins.downloadingCount--;
  if (builder.plugins.downloadingCount == 0) {
    jQuery('#plugins-downloading').hide();
  }
  builder.views.plugins.refresh();
}

builder.plugins.downloadFailed = function(id, e) {
  alert("Download failed: " + e);
  builder.plugins.setInstallState(id, builder.plugins.NOT_INSTALLED);
  builder.plugins.downloadingCount--;
  if (builder.plugins.downloadingCount == 0) {
    jQuery('#plugins-downloading').hide();
  }
  builder.views.plugins.refresh();
};

builder.plugins.validatePlugin = function(id, f) {
  try {
    if (!f.exists()) { return "Plugin directory at " + f.path + " missing."; }
    if (!f.isDirectory()) { return "Plugin directory at " + f.path + " is not a directory, it's a file."; }
    f.append("header.json");
    if (!f.exists()) {
      return "Plugin header at " + f.path + " missing.";
    }
    if (!f.isFile()) {
      return "Plugin header at " + f.path + " not a file.";
    }
    var fileData = bridge.readFile(f);
    var header = null;
    try {
      header = JSON.parse(fileData);
    } catch (e) {
      return "Header file at " + f.path + " is corrupted, has a syntax error, or is not a JSON file: " + e;
    }
    if (!header.headerVersion) {
      return "Header file at " + f.path + " has no header version."; 
    }
    if (header.headerVersion > builder.plugins.MAX_HEADER_VERSION) {
      return "This version of Builder is too old to use this plugin. Please upgrade to the newest version.";
    }
    if (header.identifier != id) {
      return "The plugin ID in the header (" + header.identifier + ") does not match the expected ID (" + id + ").";
    }
  } catch (e) {
    return "Unable to verify plugin: " + e;
  }
  return null;
};

builder.plugins.performInstall = function(id) {
  try {
    var zipF = builder.plugins.getZipForPlugin(id);
    var installD = builder.plugins.getDirForPlugin(id);
    try { builder.plugins.getExtractForPlugin(id).remove(true); } catch (e) {} // qqDPS
    builder.plugins.createDir(builder.plugins.getExtractForPlugin(id));
    var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                    .createInstance(Components.interfaces.nsIZipReader);
    zipReader.open(zipF);
    var entries = zipReader.findEntries("*");
    while (entries.hasMore()) {
      var path = entries.getNext();
      var e = zipReader.getEntry(path);
      var splitPath = path.split("/");
      var f = builder.plugins.getExtractForPlugin(id);
      if (splitPath[0] != id) { continue; }
      for (var i = 1; i < splitPath.length; i++) {
        f.append(splitPath[i]);
      }
      if (e.isDirectory) {
        builder.plugins.createDir(f);
      } else {
        builder.plugins.createDir(f.parent);
        zipReader.extract(path, f);
      }
    }
  
    var validationError = builder.plugins.validatePlugin(id, builder.plugins.getExtractForPlugin(id));
    if (validationError) {
      builder.plugins.startupErrors.push("Could not install " + id + ": " + validationError);
      builder.plugins.setInstallState(id, builder.plugins.NOT_INSTALLED);
      return;
    }
  
    try { installD.remove(true); } catch (e) {} // qqDPS
    builder.plugins.getExtractForPlugin(id).moveTo(installD.parent, installD.leafName);
    builder.plugins.setInstallState(id, builder.plugins.INSTALLED);
  } catch (e) {
    builder.plugins.startupErrors.push("Could not install " + id + ": " + e);
    builder.plugins.setInstallState(id, builder.plugins.NOT_INSTALLED);
  }
};

builder.plugins.performUninstall = function(id) {
  try {
    builder.plugins.getDirForPlugin(id).remove(true);
    builder.plugins.setInstallState(id, builder.plugins.NOT_INSTALLED);
  } catch (e) {
    builder.plugins.startupErrors.push("Could not uninstall " + id + ": " + e);
  }
};

builder.plugins.start = function() {
  // Start up database connection.
  Components.utils.import("resource://gre/modules/Services.jsm");
  var dbFile = builder.plugins.getBuilderDir()
  dbFile.append("plugins.sqlite");
  builder.plugins.db = Services.storage.openDatabase(dbFile); // Will also create the file if it does not exist
  if (!builder.plugins.db.createStatement("SELECT name FROM sqlite_master WHERE type='table' AND name='state'").executeStep())
  {
    builder.plugins.db.createStatement("CREATE TABLE state (identifier varchar(255), installState varchar(255), enabledState varchar(255))").executeStep();
  }
  
  // Install new plugins.
  var s = builder.plugins.db.createStatement("SELECT identifier FROM state WHERE installState = '" + builder.plugins.TO_INSTALL + "'");
  var to_install = [];
  while (s.executeStep()) {
    to_install.push(s.row.identifier);
  }
  for (var i = 0; i < to_install.length; i++) {
    builder.plugins.performInstall(to_install[i]);
    builder.plugins.setEnabledState(to_install[i], builder.plugins.ENABLED);
  }
  
  // Update plugins
  s = builder.plugins.db.createStatement("SELECT identifier FROM state WHERE installState = '" + builder.plugins.TO_UPDATE + "'");
  var to_update = [];
  while (s.executeStep()) {
    to_update.push(s.row.identifier);
  }
  for (var i = 0; i < to_update.length; i++) {
    builder.plugins.performInstall(to_update[i]);
  }
  
  // Uninstall plugins.
  s = builder.plugins.db.createStatement("SELECT identifier FROM state WHERE installState = '" + builder.plugins.TO_UNINSTALL + "'");
  var to_uninstall = [];
  while (s.executeStep()) {
    to_uninstall.push(s.row.identifier);
  }
  for (var i = 0; i < to_uninstall.length; i++) {
    builder.plugins.performUninstall(to_uninstall[i]);
  }
  
  // Enable and disable plugins.
  builder.plugins.db.createStatement("UPDATE state SET enabledState = '" + builder.plugins.DISABLED + "' WHERE enabledState = '" + builder.plugins.TO_DISABLE + "'").executeStep();
  builder.plugins.db.createStatement("UPDATE state SET enabledState = '" + builder.plugins.ENABLED + "' WHERE enabledState = '" + builder.plugins.TO_ENABLE + "'").executeStep();
  
  // Load plugins
  var installeds = builder.plugins.getInstalledIDs();
  for (var i = 0; i < installeds.length; i++) {
    var state = builder.plugins.getState(installeds[i]);
    if (state.installState == builder.plugins.INSTALLED && state.enabledState == builder.plugins.ENABLED) {
      var info = builder.plugins.getInstalledInfo(installeds[i]);
      var to_load = [];
      for (var j = 0; j < info.load.length; j++) {
        to_load.push(builder.plugins.getResourcePath(installeds[i], info.load[j]));
      }
      builder.loader.loadListOfScripts(to_load);
    }
  }
  
  // Show any startup errors.
  for (var i = 0; i < builder.plugins.startupErrors.length; i++) {
    alert(builder.plugins.startupErrors[i]);
  }
};

builder.registerPostLoadHook(builder.plugins.start);

builder.plugins.shutdown = function() {
  var installeds = builder.plugins.getInstalledIDs();
  for (var i = 0; i < installeds.length; i++) {
    var state = builder.plugins.getState(installeds[i]);
    if (
      (state.installState == builder.plugins.INSTALLED || state.installState == builder.plugins.TO_UNINSTALL)  &&
      (state.enabledState == builder.plugins.ENABLED || state.enabledState == builder.plugins.TO_DISABLE))
    {
      var info = builder.plugins.getInstalledInfo(installeds[i]);
      if (info.shutdownFunction) {
        // Eval is traditionally bad, but we've already let the plugin do whatever it wants!
        eval(info.shutdownFunction + "();");
      }
    }
  }
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