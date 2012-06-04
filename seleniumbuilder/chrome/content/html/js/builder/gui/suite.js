/** Suite GUI code, mostly for managing the suite menu. */
builder.gui.suite = {};

/** Creates a menu entry for switching to a script. */
builder.gui.suite.create_script_li = function(name, index, isSelected) {
  if (isSelected) {
    return newNode('li', { 'class': 'currentScript' },
      newNode('a', {
          id: 'suite-script-' + index,
          href: '#suite-script-' + index,
          click: function() {}
        },
        name)
    );
  } else {
    return newNode('li',
      newNode('a', {
          id: 'suite-script-' + index,
          href: '#suite-script-' + index,
          click: function() {
            builder.record.stopAll();
            builder.suite.switchToScript(index);
            builder.stepdisplay.update();
          }
        },
        name)
    );
  }
};

/** Updates display of the suite menu. */
builder.gui.suite.update = function() {
  if (builder.suite.getNumberOfScripts() > 1) {
    jQuery('#suite-panel, .suite-menu-item').show();
    jQuery('#script-discard-li').hide();
    
    jQuery('#scriptlist').html('');
    var scriptNames = builder.suite.getScriptNames();
    var selectedScriptIndex = builder.suite.getSelectedScriptIndex();
    for (var i = 0; i < scriptNames.length; i++) {
      jQuery('#scriptlist').append(builder.gui.suite.create_script_li(scriptNames[i], i,
          i === selectedScriptIndex));
    }
    
    if (builder.suite.path) {
      jQuery('#suite-save-as').show();
    } else {
      jQuery('#suite-save-as').hide();
    }
  } else {
    jQuery('#suite-panel, .suite-menu-item').hide();
    jQuery('#script-discard-li').show();
  }
};

/** @return Whether the suite can be exported. */
builder.gui.suite.canExport = function() {
  return builder.gui.suite.allSelenium1() && builder.gui.suite.allSavedAsHTML();
};

/** @return Whether all scripts have been saved in HTML format. */
builder.gui.suite.allSavedAsHTML = function() {
  for (var i = 0; i < builder.suite.scripts.length; i++) {
    if (!builder.suite.scripts[i].path) { return false; }
    if (builder.suite.scripts[i].path.format.name !== "HTML") { return false; }
  }
  return true;
};

/** @return Whether all scripts are Selenium 1. */
builder.gui.suite.allSelenium1 = function() {
  for (var i = 0; i < builder.suite.scripts.length; i++) {
    if (builder.suite.scripts[i].seleniumVersion !== builder.selenium1) { return false; }
  }
  return true;
};

// Setup menus.
builder.registerPostLoadHook(function() {
  // Remove script from suite.
  jQuery('#suite-removescript').click(function() {
    builder.record.stopAll();
    builder.suite.removeScript(builder.suite.getSelectedScriptIndex());
    builder.gui.menu.updateRunSuiteOnRC();
    builder.stepdisplay.update();
  });
  
  // Add script from file.
  jQuery('#suite-addscript').click(function() {
    builder.record.stopAll();
    var script = builder.io.loadNewScriptForSuite();
    if (script) {
      // Save the current script and unselect it to make sure that when we overwrite its
      // info in the GUI by opening the new script, we don't overwrite its info in
      // builder.suite.
      builder.suite.addScript(script);
      builder.gui.menu.updateRunSuiteOnRC();
      builder.stepdisplay.update();
    }
  });
  
  
  // Record new script.
  jQuery('#suite-recordscript').click(function() {
    builder.record.stopAll();
    builder.dialogs.record.show(jQuery('#dialog-attachment-point'));
  });
  
  // Play suite on RC.
  jQuery('#run-suite-onrc').bind('click', function () {
    builder.record.stopAll();
    builder.dialogs.rc.show(jQuery("#dialog-attachment-point"), /*play all*/ true);
  });
  
  // Play suite locally.
  jQuery('#run-suite-locally').bind('click', function () {
    builder.record.stopAll();
    builder.dialogs.runall.runLocally(jQuery("#dialog-attachment-point"));
  });

  // Discard button: discards unsaved changes in suite, if any. Returns to startup interface
  // to let user decide what to do next.
  jQuery('#suite-discard').click(
    function () {
      if (!builder.suite.getSaveRequired() ||
          confirm("If you continue, you will lose all your recent changes."))
      {
        builder.record.stopAll();
        builder.gui.switchView(builder.views.startup);
        builder.suite.clearSuite();
        // Clear any error messages.
        jQuery('#error-panel').hide();
      }
    }
  );
  
  // Save the suite as a Selenium 1 HTML file.
  jQuery('#suite-save').click(
    function() {
      if (builder.gui.suite.canExport()) {
        builder.record.stopAll();
        var path = builder.selenium1.adapter.exportSuite(builder.suite.scripts, builder.suite.path);
        if (path) {
          builder.suite.path = path;
          builder.suite.setSuiteSaveRequired(false);
          builder.gui.suite.update();
        }
      } else {
        alert("Can't save suite. Please save all test scripts to disk as HTML first.");
      }
    }
  );
  
  jQuery('#suite-save-as').click(
    function() {
      if (builder.gui.suite.canExport()) {
        var path = builder.selenium1.adapter.exportSuite(builder.suite.scripts);
        if (path) {
          builder.suite.path = path;
          builder.suite.setSuiteSaveRequired(false);
          builder.gui.suite.update();
        }
      } else {
        if (!builder.gui.suite.allSelenium1()) {
          alert("Can't save suite: All scripts in the suite must be Selenium 1 scripts.");
        } else {
          alert("Can't save suite. Please save all test scripts to disk as HTML first.");
        }
      }
    }
  );
  
  // Depending on what the state of the scripts is, different options are available.
  builder.suite.addScriptChangeListener(function() {
    jQuery('#edit-suite-path').html("Suite: " + (builder.suite.path ? builder.suite.path : '[Untitled Suite]'));
    if (builder.suite.getSuiteSaveRequired()) {
      if (builder.gui.suite.canExport()) {
        jQuery('#suite-saverequired').show();
        jQuery('#suite-cannotsave-unsavedscripts').hide();
        jQuery('#suite-cannotsave-notallsel1').hide();
      } else {
        if (builder.gui.suite.allSelenium1()) {
          jQuery('#suite-cannotsave-notallsel1').hide();
          if (builder.gui.suite.allSavedAsHTML()) {
            jQuery('#suite-cannotsave-unsavedscripts').hide();
          } else {
            jQuery('#suite-cannotsave-unsavedscripts').show();
          }
        } else {
          jQuery('#suite-cannotsave-notallsel1').show();
        }
        jQuery('#suite-saverequired').hide();
      }
    } else {
      jQuery('#suite-cannotsave-unsavedscripts').hide();
      jQuery('#suite-cannotsave-notallsel1').hide();
      jQuery('#suite-saverequired').hide();
    }
  });
  
  builder.gui.suite.update();
  
  builder.suite.addScriptChangeListener(function() { builder.gui.suite.update(); });
});