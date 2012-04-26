builder.io = {};

builder.io.loadFile = function(path) {
  var file = null;
  if (path == null) {
    file = showFilePicker(window, "Select a File", 
                          Components.interfaces.nsIFilePicker.modeOpen,
                          Format.TEST_CASE_DIRECTORY_PREF,
                          function(fp) { return fp.file; });
  } else {
    file = FileUtils.getFile(path);
  }
  return file;
};

builder.io.readFile = function(file) {
  var sis = FileUtils.openFileInputStream(file);
  var data = FileUtils.getUnicodeConverter('UTF-8').ConvertToUnicode(sis.read(sis.available()));
  sis.close();
  return data;
}

/** Displays a dialog to load a script and add it to the current suite. */
builder.io.loadNewScriptForSuite = function(path) {
  var file = builder.io.loadFile(path);
  if (!file) { return null; }
  
  for (var i = 0; i < builder.seleniumVersions.length; i++) {
    var seleniumVersion = builder.seleniumVersions[i];
    try {
      var script = seleniumVersion.io.parseScript(file);
      if (script) {
        return script;
      }
    } catch (e) {
      // Ignore!
    }
  }
  
  alert("Unable to read file, sorry.");
  return null;
}

/** Displays a dialog to load a file (a script or suite) and attempts to interpret it and load it in. */
builder.io.loadUnknownFile = function(path) {
  var file = builder.io.loadFile(path);
  if (!file) { return; }
  
  for (var i = 0; i < builder.seleniumVersions.length; i++) {
    var seleniumVersion = builder.seleniumVersions[i];
    
    try {
      var script = seleniumVersion.io.parseScript(file);
      if (script) {
        builder.gui.switchView(builder.views.script);
        builder.setScript(script);
        builder.stepdisplay.update();
        builder.suite.setCurrentScriptSaveRequired(false);
        builder.gui.suite.update();
        return;
      }
    } catch (e) {
      // Ignore!
    }
    try {
      var suite = seleniumVersion.io.parseSuite(file);
      if (suite) {
        builder.gui.switchView(builder.views.script);
        builder.suite.setSuite(suite.scripts, suite.path);
        builder.stepdisplay.update();
        builder.suite.setCurrentScriptSaveRequired(false);
        builder.gui.suite.update();
        return;
      }
    } catch (e) {
      // Ignore!
    }
  }
  
  alert("Unable to read file, sorry.");
};