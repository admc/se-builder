builder.suite = {};

builder.suite.scripts = [];
builder.suite.currentScriptIndex = -1;
builder.suite.scriptChangeListeners = [];
builder.suite.suiteSaveRequired = false;
builder.suite.path = null;

builder.suite.getNumberOfScripts = function() {
  return builder.suite.scripts.length;
};

builder.suite.hasScript = function() {
  return builder.suite.currentScriptIndex != -1;
};

builder.suite.getCurrentScript = function() {
  return builder.suite.hasScript()
    ? builder.suite.scripts[builder.suite.currentScriptIndex]
    : null;
};

builder.suite.setCurrentScript = function(script) {
  if (builder.suite.hasScript()) {
    builder.suite.scripts[builder.suite.currentScriptIndex] = script;
  } else {
    builder.suite.addScript(script);
  }
  builder.suite.suiteSaveRequired = true;
  builder.suite.broadcastScriptChange();
};

builder.suite.addScript = function(script) {
  builder.suite.scripts.push(script);
  builder.suite.currentScriptIndex = builder.suite.scripts.length - 1;
  builder.suite.suiteSaveRequired = true;
  builder.suite.broadcastScriptChange();
};

builder.suite.removeScript = function(index) {
  builder.suite.scripts.splice(index, 1);
  if (builder.suite.currentScriptIndex >= index) {
    builder.suite.currentScriptIndex--;
  }
  if (builder.suite.currentScriptIndex == -1 && builder.suite.scripts.length > 0) {
    builder.suite.currentScriptIndex = 0;
  }
  builder.suite.suiteSaveRequired = true;
  builder.suite.broadcastScriptChange();
};

builder.suite.switchToScript = function(index) {
  if (index < builder.suite.scripts.length) {
    builder.suite.currentScriptIndex = index;
    builder.suite.broadcastScriptChange();
  }
};

builder.suite.getSelectedScriptIndex = function() {
  return builder.suite.currentScriptIndex;
};

builder.suite.clearSuite = function() {
  builder.suite.scripts = [];
  builder.suite.currentScriptIndex = -1;
  builder.suite.suiteSaveRequired = false;
  builder.suite.path = null;
  builder.suite.broadcastScriptChange();
};

builder.suite.getScriptNames = function() {
  var names = [];
  for (var i = 0; i < builder.suite.scripts.length; i++) {
    var script = builder.suite.scripts[i];
    if (script.path) {
      names.push(script.path.path);
    } else {
      names.push("[Untitled Script " + (i + 1) + "]");
    }
  }
  return names;
};

builder.suite.areAllScriptsOfVersion = function(seleniumVersion) {
  if (!builder.suite.hasScript()) { return false; }
  for (var i = 0; i < builder.suite.scripts.length; i++) {
    if (builder.suite.scripts[i].seleniumVersion != seleniumVersion) {
      return false;
    }
  }
  return true;
};

builder.suite.getSaveRequired = function() {
  return builder.suite.getSuiteSaveRequired() || builder.suite.getAnyScriptSaveRequired();
};

builder.suite.setCurrentScriptSaveRequired = function(saveRequired) {
  if (builder.suite.hasScript()) {
    builder.suite.getCurrentScript().saveRequired = saveRequired;
  }
  builder.suite.broadcastScriptChange();
};

builder.suite.setScriptSaveRequired = function(script, saveRequired) {
  script.saveRequired = saveRequired;
  builder.suite.broadcastScriptChange();
};

builder.suite.getCurrentScriptSaveRequired = function() {
  if (builder.suite.hasScript()) {
    return builder.suite.getCurrentScript().saveRequired;
  }
  return false;
};

builder.suite.getAnyScriptSaveRequired = function(saveRequired) {
  for (var i = 0; i < builder.suite.scripts.length; i++) {
    if (builder.suite.scripts[i].saveRequired) { return true; }
  }
  return false;
};

builder.suite.setSuiteSaveRequired = function(suiteSaveRequired) {
  builder.suite.suiteSaveRequired = suiteSaveRequired;
  builder.suite.broadcastScriptChange();
};

builder.suite.getSuiteSaveRequired = function() {
  return builder.suite.suiteSaveRequired;
};

builder.suite.broadcastScriptChange = function() {
  for (var i = 0; i < builder.suite.scriptChangeListeners.length; i++) {
    builder.suite.scriptChangeListeners[i]();
  }
};

builder.suite.addScriptChangeListener = function(l) {
  builder.suite.scriptChangeListeners.push(l);
};

builder.suite.removeScriptChangeListener = function(l) {
  if (builder.suite.scriptChangeListeners.indexOf(l) != -1) {
    builder.suite.scriptChangeListeners.splice(builder.suite.scriptChangeListeners.indexOf(l), 1);
  }
};

builder.getScript = builder.suite.getCurrentScript;
builder.setScript = builder.suite.setCurrentScript;