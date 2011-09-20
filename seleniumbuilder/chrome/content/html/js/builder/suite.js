builder.suite = new (function () {
  /*
  Note that these are not up-to-date data for the currently selected script.
  Format:
  {
    script: the script object, from builder.getScript()
    testscriptpath: the script's path, from builder.storage.get('testscriptpath')
    save_required: whether the script needs saving, from builder.storage.get('save_required')
  }
  */
  var _scripts = [];
  var selectedScriptIndex = -1;
  builder.storage.set('suitePath', null);
  builder.storage.set('suiteSaveRequired', false);
  
  // Listen for individual script paths being changed, because that means we need to save the
  // suite.
  builder.storage.addChangeListener('testscriptpath', function() {
    builder.storage.set('suiteSaveRequired', true);
  });
  
  /**
   * Loads the contents of the given suite(Info), discarding any previously loaded scripts.
   * @param suiteInfo Suite info object as returned by seleniumadapter.importSuite
   */
  this.setSuite = function(suiteInfo) {
    if (suiteInfo.scripts.length == 0) {
      alert("Suite contains no scripts!");
      return;
    }
    _scripts = [];
    selectedScriptIndex = -1;
    builder.storage.set('suitePath', suiteInfo.suitePath);
    for (var i = 0; i < suiteInfo.scripts.length; i++) {
      this.addScript(suiteInfo.scripts[i].path, suiteInfo.scripts[i]);
    }
    this.switchToScript(0);
    builder.storage.set('suiteSaveRequired', false);
  }
  
  this.addScript = function(thePath, theScript) {
    _scripts.push({
      script: theScript,
      testscriptpath: thePath,
      save_required: false
    });
    builder.storage.set('suiteSaveRequired', true);
    return _scripts.length - 1;
  };
  
  this.addEmptyScript = function(selMajorVersion) {
    selMajorVersion = selMajorVersion || "1";
    this.saveCurrentScript();
    _scripts.push({
      script: null,
      testscriptpath: null,
      save_required: true
    });
    selectedScriptIndex = _scripts.length - 1;
    builder.storage.set('save_required', true);
    builder.storage.set('testscriptpath', null);
    builder.storage.set('selMajorVersion', selMajorVersion)
    if (selMajorVersion == "2") {
      builder.setCurrentScript(new builder.sel2.Sel2Script());
      builder.sel2.updateStepsDisplay();
    }
    builder.interface.suite.update();
    builder.storage.set('suiteSaveRequired', true);
    return selectedScriptIndex;
  }
  
  /**
   * Saves and deselects current script to prepare for loading in new one. Always follow up with
   * addAndSelectCurrentScript!
   */
  this.saveAndDeselectCurrentScript = function() {
    this.saveCurrentScript();
    selectedScriptIndex = -1;
  };
  
  /**
   * Adds the script currently loaded into the editor as a new script and selects it.
   */
  this.addAndSelectCurrentScript = function() {
    var scr;
    if (builder.storage.get('selMajorVersion') == "2") {
      scr = builder.getCurrentScript();
    } else {
      scr = builder.getScript();
    }
    _scripts.push({
      script: scr,
      testscriptpath: builder.storage.get('testscriptpath'),
      save_required: builder.storage.get('save_required')
    });
    this.switchToScript(_scripts.length - 1);
    builder.storage.set('suiteSaveRequired', true);
    return selectedScriptIndex;
  }
  
  this.getSelectedScriptIndex = function() {
    return selectedScriptIndex;
  }
  
  /**
   * Save the information in the current script to the selected script index, or add it as a
   * new script if no script index is selected.
   */
  this.saveCurrentScript = function() {
    if (selectedScriptIndex == -1) {
      this.addAndSelectCurrentScript();
    } else {
      // Update the current script's info:
      if (builder.storage.get('selMajorVersion') == "2") {
        _scripts[selectedScriptIndex].script = builder.getCurrentScript();
        _scripts[selectedScriptIndex].testscriptpath = builder.storage.get('testscriptpath');
        _scripts[selectedScriptIndex].save_required = builder.storage.get('save_required');
      } else {
        _scripts[selectedScriptIndex].script = builder.getScript();
        _scripts[selectedScriptIndex].testscriptpath = builder.storage.get('testscriptpath');
        _scripts[selectedScriptIndex].save_required = builder.storage.get('save_required');
      }
    }
  }
  
  /** @return The number of scripts in the suite. */
  this.getNumberOfScripts = function() {
    return _scripts.length;
  };
  
  /** @return An array of the names of the loaded scripts. */
  this.getScriptNames = function() {
    var names = [];
    for (var i = 0; i < _scripts.length; i++) {
      var script = _scripts[i];
      var path = i == selectedScriptIndex ? builder.storage.get('testscriptpath', null) : script.testscriptpath;
      if (path) {
        if (path.where == "remote") {
          names.push(path.test_script);
        } else {
          names.push(path.path);
        }
      } else {
        names.push("[Untitled Script]");
      }
    }
    return names;
  };
  
  /** @return An array of script entries, saving the current script if needed. */
  this.getScriptEntries = function() {
    this.saveCurrentScript();
    return _scripts;
  }
  
  this.getSaveRequired = function() {
    if (_scripts.length > 1) {
      return this.getSuiteSaveRequired() || this.getScriptSaveRequired();
    } else {
      return builder.storage.get('save_required', false);
    }
  };
  
  /** @return whether any of the scripts in the suite need saving. */
  this.getScriptSaveRequired = function() {
    if (builder.storage.get('save_required', false)) {
      return true;
    }
    for (var i = 0; i < _scripts.length; i++) {
      // Don't look at the saved script information for the currently-selected script, as it
      // may be out of date.
      if (i != selectedScriptIndex && _scripts[i].save_required) {
        return true;
      }
    }
    return false;
  };
  
  this.getSuiteSaveRequired = function() {
    return builder.storage.get('suiteSaveRequired');
  };
  
  /** @return Whether export is allowed. */
  this.canExport = function() {
    // Have all the scripts been saved?
    for (var i = 0; i < _scripts.length; i++) {
      var path =
          i == selectedScriptIndex
          ? builder.storage.get('testscriptpath')
          : _scripts[i].testscriptpath;
      if (!path)                      { return false; }
      if (path.where != "local")      { return false; }
      if (path.format.name != "HTML") { return false; }
    }
    
    return true;
  };
  
  /**
   * @param index The script index to switch to.
   */
  this.switchToScript = function(index) {
    if (selectedScriptIndex != -1) {
      this.saveCurrentScript();
    }
    // Because switching to a different script in the suite will trigger a change event for
    // testscriptpath, but this shouldn't cause suiteSaveRequired to be set to true, we
    // preserve its original value and reinstate it afterwards.
    var suiteSaveReallyRequired = builder.storage.get('suiteSaveRequired');
    // Now swap in this script.
    selectedScriptIndex = index;
    if (_scripts[index].script.seleniumVersion == "2") {
      builder.openSel2File(_scripts[index].script);
    } else {
      builder.openScript(_scripts[index].testscriptpath, _scripts[index].script);
    }
    builder.storage.set('save_required', _scripts[index].save_required);
    builder.storage.set('suiteSaveRequired', suiteSaveReallyRequired);
    return index;
  };
  
  /**
   * Delete a script. BREAKS if there is only one or zero!
   * @return The index of the script now selected.
   */
  this.deleteScript = function(index) {
    _scripts.splice(index, 1);
    if (selectedScriptIndex == index) {
      index = index == 0 ? 0 : index - 1;
      selectedScriptIndex = -1;
      this.switchToScript(index);
    }
    builder.storage.set('suiteSaveRequired', true);
    return selectedScriptIndex;
  };
  
  /**
   * Clears the suite from memory.
   */
  this.clearSuite = function() {
    _scripts.splice(0, _scripts.length);
    selectedScriptIndex = -1;
    builder.storage.set('suitePath', null);
    builder.storage.set('suiteSaveRequired', false);
    builder.interface.suite.update();
  };
})();