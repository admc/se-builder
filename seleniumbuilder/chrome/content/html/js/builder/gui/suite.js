builder.gui.suite = {};

builder.gui.suite.create_script_li = function(name, index, isSelected) {
  if (isSelected) {
    return newNode('li', { class: 'currentScript' }, name);
  } else {
    return newNode('li',
      newNode('a', {
          id: 'suite-script-' + index,
          href: '#suite-script-' + index,
          click: function() { builder.suite.switchToScript(index); }
        },
        name)
    );
  }
};

builder.gui.suite.showButtons = function() {
  jQuery('#edit-suite-buttons').show();
};

builder.gui.suite.hideButtons = function() {
  jQuery('#edit-suite-buttons').hide();
};

builder.gui.suite.update = function() {
  if (builder.suite.getNumberOfScripts() > 1) {
    jQuery('#suite-panel, #multiscript-0, #multiscript-1, #multiscript-2').show();
    jQuery('#script-discard-li').hide();
    
    jQuery('#scriptlist').html('');
    var scriptNames = builder.suite.getScriptNames();
    var selectedScriptIndex = builder.suite.getSelectedScriptIndex();
    for (var i = 0; i < scriptNames.length; i++) {
      jQuery('#scriptlist').append(builder.gui.suite.create_script_li(scriptNames[i], i,
          i == selectedScriptIndex));
    }
  } else {
    jQuery('#suite-panel, #multiscript-0, #multiscript-1, #multiscript-2').hide();
    jQuery('#script-discard-li').show();
  }
};

builder.registerPostLoadHook(function() {
  jQuery('#edit-suite-stop-playback').click(function() {
    builder.dialogs.runall.stoprun();
  });
  
  jQuery('#suite-removescript').click(function() {
    builder.suite.deleteScript(builder.suite.getSelectedScriptIndex());
    builder.gui.menu.updateRunSuiteOnRC();
  });
  
  jQuery('#suite-addscript').click(function() {
    var script = builder.seleniumadapter.importScript();
    if (script) {
      // Save the current script and unselect it to make sure that when we overwrite its
      // info in the GUI by opening the new script, we don't overwrite its info in
      // builder.suite.
      builder.suite.saveAndDeselectCurrentScript();
      builder.openScript(script.path, script);
      builder.suite.addAndSelectCurrentScript();
      builder.gui.menu.updateRunSuiteOnRC();
    }
  });
  
  jQuery('#suite-importscript-sel2').click(function() {
    var script = builder.loadSel2Script();
    if (script) {
      // Save the current script and unselect it to make sure that when we overwrite its
      // info in the GUI by opening the new script, we don't overwrite its info in
      // builder.suite.
      builder.suite.saveAndDeselectCurrentScript();
      builder.openScript(null, builder.convertSel2To1(script));
      builder.suite.addAndSelectCurrentScript();
      builder.gui.menu.updateRunSuiteOnRC();
    }
  });
  
  jQuery('#suite-addscript-sel2').click(function() {
    var script = builder.sel2.loadScript();
    if (script) {
      // Save the current script and unselect it to make sure that when we overwrite its
      // info in the GUI by opening the new script, we don't overwrite its info in
      // builder.suite.
      builder.suite.saveAndDeselectCurrentScript();
      builder.openSel2File(script);
      builder.suite.addAndSelectCurrentScript();
      builder.gui.menu.updateRunSuiteOnRC();
    }
  });
  
  jQuery('#suite-recordscript').click(function() {
    builder.dialogs.record.show(jQuery('#dialog-attachment-point'));
  });
  
  jQuery('#run-suite-onrc').bind('click', function () {
    builder.dialogs.rc.show(jQuery("#dialog-attachment-point"), /*play all*/ true);
  });
  
  jQuery('#run-suite-locally').bind('click', function () {
    builder.dialogs.runall.runLocally(jQuery("#dialog-attachment-point"));
  });

  // Discard button: discards unsaved changes in suite, if any. Returns to startup interface
  // to let user decide what to do next.
  jQuery('#script-discard').click(
    function () {
      if (!builder.suite.getSaveRequired() ||
          confirm("If you continue, you will lose all your recent changes."))
      {
        builder.suite.clearSuite();
        builder.gui.switchView(builder.views.startup);
        builder.storage.set('testscriptpath', null);
        builder.storage.set('save_required', false);
        jQuery('#steps').html('');
        // Clear any error messages.
        jQuery('#error-panel').hide();
      }
    }
  );
  
  jQuery('#suite-save').click(
    function() {
      if (builder.suite.canExport()) {
        var path = builder.seleniumadapter.exportSuite(builder.suite.getScriptEntries());
        if (path) {
          builder.storage.set('suitePath', path);
          builder.storage.set('suiteSaveRequired', false);
          builder.gui.suite.update();
        }
      } else {
        alert("Can't save suite. Please save all test scripts to disk as HTML first.");
      }
    }
  );
  
  builder.storage.addChangeListener('suitePath', function(suitePath) {
    jQuery('#edit-suite-path').html("Suite: " + (suitePath ? suitePath : '[Untitled Suite]'));
  });
  
  builder.storage.addChangeListener('suiteSaveRequired', function(suiteSaveRequired) {
    if (suiteSaveRequired) {
      if (builder.suite.canExport()) {
        jQuery('#suite-cannotsave').hide();
        jQuery('#suite-saverequired').show();
      } else {
        jQuery('#suite-cannotsave').show();
        jQuery('#suite-saverequired').hide();
      }
    } else {
      jQuery('#suite-cannotsave').hide();
      jQuery('#suite-saverequired').hide();
    }
  });
  
  builder.gui.suite.update();
});