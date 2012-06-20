/** Code for managing plugins */
builder.plugins = {};

builder.plugins.getPluginsFolder = function() {
  
};

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

builder.plugins.getInstalledIDs = function() {
  return [];
};

builder.plugins.getInstalledInfo = function(id) {
  return [];
};

builder.plugins.getInstalledState = function(id) {
  return {"state": builder.plugins.INSTALLED, "enabled": builder.plugins.ENABLED};
};

builder.plugins.getFolderForID = function(id) {
  return null;
};

builder.plugins.getZipForID = function(id) {
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

builder.plugins.loadAll = function() {
  
};

builder.plugins.shutdownAll = function() {
  
};

builder.plugins.getResourcePath = function(id, relativePath) {
  
};