/** Attaches functionality to menu items. */
builder.gui.menu = {};

builder.gui.menu.addItem = function(menu, title, f) {
  jQuery('#' + menu + '-menu').append(newNode('li', newNode('a', {'click': f}, title)));
};

/** Updates display of the "run suite on RC" option. */
builder.gui.menu.updateRunSuiteOnRC = function() {
  if (builder.suite.areAllScriptsOfVersion(builder.selenium1)) {
    jQuery("#run-suite-onrc-li").show();
  } else {
    jQuery("#run-suite-onrc-li").hide();
  }
};

builder.registerPostLoadHook(function() {
  // Running script on RC: Available in Selenium 1 only.
  jQuery("#run-onrc-li").show();
  /*builder.suite.addScriptChangeListener(function() { qqDPS!!!
    var script = builder.getScript();
    if (script && script.seleniumVersion === builder.selenium1) {
      jQuery("#run-onrc-li").show();
    } else {
      jQuery("#run-onrc-li").hide();
    }
  });*/
  builder.gui.menu.updateRunSuiteOnRC();
  jQuery('#run-onrc').bind('click', function () {
    builder.dialogs.rc.show(jQuery("#dialog-attachment-point"), /*play all*/ false);
  });
  
  // Export button: allows user to export script using Selenium IDE's formatting code.
  jQuery('#script-export').click(
    function() {
      builder.record.stopAll();
      builder.dialogs.exportscript.show(jQuery("#dialog-attachment-point"));
    }
  );
  // Convert button
  jQuery('#script-convert').click(
    function() {
      builder.record.stopAll();
      builder.dialogs.convert.show(jQuery("#dialog-attachment-point"));
    }
  );
  // Discard button: discards unsaved changes in script, if any. Returns to startup interface
  // to let user decide what to do next.
  jQuery('#script-discard').click(
    function () {
      if (!builder.getScript().saveRequired ||
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
  // Record button: Record more of the script
  jQuery('#record').click(function () {
    builder.record.stopAll();
    builder.record.continueRecording();
  });
  // Play button: Play back the script in this browser
  jQuery('#run-locally').click(function () {
    if (builder.record.recording) {
      builder.record.stop();
    }
		
    builder.getScript().seleniumVersion.playback.runTest();
  });
});