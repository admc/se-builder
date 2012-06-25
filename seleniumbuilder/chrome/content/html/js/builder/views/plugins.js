builder.views.plugins = {};

builder.views.plugins.show = function () {
  jQuery('#plugins').show();
  builder.views.plugins.refresh();
};

builder.views.plugins.hide = function () {
  jQuery('#plugins').hide();
};

builder.registerPostLoadHook(function() {
  jQuery('#plugins-back').click(function() {
    builder.gui.switchView(builder.views.startup);
  });
  jQuery('#plugins-refresh').click(function() {
    builder.views.plugins.refresh();
  });
});

builder.views.plugins.getName = function(info) {
  return info.installedInfo ? info.installedInfo.name : info.repositoryInfo.name;
};

builder.views.plugins.getStatus = function(info) {
  if (info.installState == builder.plugins.INSTALLED) {
    return {
      "DISABLED":   "Disabled",
      "ENABLED":    "Installed",
      "TO_ENABLE":  "Installed, Enabled after Restart",
      "TO_DISABLE": "Installed, Disabled after Restart"
    }[info.enabledState];
  }
  
  return {
    "NOT_INSTALLED" : "Not Installed",
    "TO_INSTALL"    : "Installed after Restart",
    "TO_UNINSTALL"  : "Uninstalled after Restart",
    "TO_UPDATE"    : "Installed, Updated after Restart"
  }[info.installState];
};

builder.views.plugins.getEntryClass = function(info) {
  if (info.installState == builder.plugins.INSTALLED) {
    return {
      "DISABLED":   "disabled",
      "ENABLED":    "installed",
      "TO_ENABLE":  "installed",
      "TO_DISABLE": "disabled"
    }[info.enabledState];
  }
  
  return {
    "NOT_INSTALLED" : "not_installed",
    "TO_INSTALL"    : "installed",
    "TO_UNINSTALL"  : "not_installed",
    "TO_UPDATE"     : "installed"
  }[info.installState];
};

builder.views.plugins.getDescription = function(info) {
  return info.installedInfo ? info.installedInfo.description : info.repositoryInfo.description;
};

builder.views.plugins.makePluginEntry = function(info) {
  var entry = newNode('li', {'class': builder.views.plugins.getEntryClass(info), 'id': info.identifier + '-entry'},
    newNode('div', {'class': 'pluginHeader'},
      newNode('span', {'class': 'pluginName'}, builder.views.plugins.getName(info)),
      newNode('span', {'class': 'pluginStatus', 'id': info.identifier + '-status'}, builder.views.plugins.getStatus(info))
    ),
    newNode('div', {'class': 'pluginDescription'}, builder.views.plugins.getDescription(info)),
    newNode('span', {'id': info.identifier + '-s-install'}, newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-install'  }, "Install")),
    newNode('span', {'id': info.identifier + '-s-cancel-install'}, newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-cancel-install'  }, "Cancel Install")),
    newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-uninstall'}, "Uninstall"),
    newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-cancel-uninstall'}, "Cancel Uninstall"),
    newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-update'   }, "Update"),
    newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-cancel-update'  }, "Cancel Update"),
    newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-enable'   }, "Enable"),
    newNode('a', {'href': '#', 'class': 'button', 'id': info.identifier + '-disable'  }, "Disable")
  );
    
  return entry;
};

builder.views.plugins.updatePluginEntry = function(info) {
  jQuery('#' + info.identifier + '-entry').removeClass().addClass(builder.views.plugins.getEntryClass(info));
  jQuery('#' + info.identifier + '-status').text(builder.views.plugins.getStatus(info));
  
  jQuery('#' + info.identifier + '-install').toggle(info.installState == builder.plugins.NOT_INSTALLED);
  jQuery('#' + info.identifier + '-cancel-install').toggle(info.installState == builder.plugins.TO_INSTALL);
  jQuery('#' + info.identifier + '-uninstall').toggle(info.installState == builder.plugins.INSTALLED);
  jQuery('#' + info.identifier + '-cancel-uninstall').toggle(info.installState == builder.plugins.TO_UNINSTALL);
  jQuery('#' + info.identifier + '-update').toggle(info.installState == builder.plugins.INSTALLED && builder.plugins.isUpdateable(info));
  jQuery('#' + info.identifier + '-cancel-update').toggle(info.installState == builder.plugins.TO_UPDATE);
  jQuery('#' + info.identifier + '-enable').toggle(info.installState == builder.plugins.INSTALLED && (info.enabledState == builder.plugins.DISABLED || info.enabledState == builder.plugins.TO_DISABLE));
  jQuery('#' + info.identifier + '-disable').toggle(info.installState == builder.plugins.INSTALLED && (info.enabledState == builder.plugins.ENABLED || info.enabledState == builder.plugins.TO_ENABLE));
};

builder.views.plugins.wirePluginEntry = function(info) {
  jQuery('#' + info.identifier + '-install').click(function() {
    builder.plugins.setInstallState(info.identifier, builder.plugins.TO_INSTALL);
    info.installState = builder.plugins.TO_INSTALL;
    builder.views.plugins.updatePluginEntry(info);
    builder.plugins.performDownload(info.identifier, info.repositoryInfo.browsers[bridge.browserType()].downloadUrl);
  });  
  
  jQuery('#' + info.identifier + '-cancel-install').click(function() {
    builder.plugins.setInstallState(info.identifier, builder.plugins.NOT_INSTALLED);
    info.installState = builder.plugins.NOT_INSTALLED;
    builder.views.plugins.updatePluginEntry(info);
  });
  
  jQuery('#' + info.identifier + '-uninstall').click(function() {
    builder.plugins.setInstallState(info.identifier, builder.plugins.TO_UNINSTALL);
    info.installState = builder.plugins.TO_UNINSTALL;
    builder.views.plugins.updatePluginEntry(info);
  });
  
  jQuery('#' + info.identifier + '-cancel-uninstall').click(function() {
    builder.plugins.setInstallState(info.identifier, builder.plugins.INSTALLED);
    info.installState = builder.plugins.INSTALLED;
    builder.views.plugins.updatePluginEntry(info);
  });
  
  jQuery('#' + info.identifier + '-update').click(function() {
    builder.plugins.setInstallState(info.identifier, builder.plugins.TO_UPDATE);
    info.installState = builder.plugins.TO_UPDATE;
    builder.views.plugins.updatePluginEntry(info);
  });
  
  jQuery('#' + info.identifier + '-cancel-update').click(function() {
    builder.plugins.setInstallState(info.identifier, builder.plugins.INSTALLED);
    info.installState = builder.plugins.INSTALLED;
    builder.views.plugins.updatePluginEntry(info);
  });
  
  jQuery('#' + info.identifier + '-enable').click(function() {
    var newEnabled = info.enabledState == builder.plugins.DISABLED ? builder.plugins.TO_ENABLE : builder.plugins.ENABLED;
    builder.plugins.setEnabledState(info.identifier, newEnabled);
    info.enabledState = newEnabled;
    builder.views.plugins.updatePluginEntry(info);
  });
  
  jQuery('#' + info.identifier + '-disable').click(function() {
    var newEnabled = info.enabledState == builder.plugins.ENABLED ? builder.plugins.TO_DISABLE : builder.plugins.DISABLED;
    builder.plugins.setEnabledState(info.identifier, newEnabled);
    info.enabledState = newEnabled;
    builder.views.plugins.updatePluginEntry(info);
  });
}

builder.views.plugins.refresh = function() {
  jQuery('#plugins-loading').show();
  jQuery('#plugins-list').html('');
  builder.plugins.getListAsync(function(result, error) {
    jQuery('#plugins-loading').hide();
    for (var i = 0; i < result.length; i++) {
      jQuery('#plugins-list').append(builder.views.plugins.makePluginEntry(result[i]));
      builder.views.plugins.wirePluginEntry(result[i]);
      builder.views.plugins.updatePluginEntry(result[i]);
    }
  });
};