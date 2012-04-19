builder.gui.menu = {};

builder.gui.menu.updateRunSuiteOnRC = function() {
  if (builder.suite.areAllScriptsOfVersion(builder.selenium1)) {
    jQuery("#run-suite-onrc-li").show();
  } else {
    jQuery("#run-suite-onrc-li").hide();
  }
};

builder.registerPostLoadHook(function() {
  jQuery("#run-onrc-li").show();
  builder.suite.addScriptChangeListener(function() {
    var script = builder.getScript();
    if (script && script.seleniumVersion == builder.selenium1) {
      jQuery("#run-onrc-li").show();
    } else {
      jQuery("#run-onrc-li").hide();
    }
  });
  builder.gui.menu.updateRunSuiteOnRC();
  jQuery('#run-onrc').bind('click', function () {
    builder.dialogs.rc.show(jQuery("#dialog-attachment-point"), /*play all*/ false);
  });
  // Export button: allows user to export script using Selenium IDE's formatting code.
  jQuery('#script-export').click(
    function() {
      builder.dialogs.exportscript.show(jQuery("#dialog-attachment-point"));
    }
  );
  jQuery('#edit-test-script-nopath-save').click(
    function() {
      builder.dialogs.exportscript.show(jQuery("#dialog-attachment-point"));
    }
  );
  // Discard button: discards unsaved changes in script, if any. Returns to startup interface
  // to let user decide what to do next.
  jQuery('#script-discard').click(
    function () {
      if (!builder.getScript().saveRequired ||
          confirm("If you continue, you will lose all your recent changes."))
      {
        builder.gui.switchView(builder.views.startup);
        builder.suite.clearSuite();        
        jQuery('#steps').html('');
        // Clear any error messages.
        jQuery('#error-panel').hide();
      }
    }
  );
  // Record button: Record more of the script
  jQuery('#record').click(function () {
    builder.record.continueRecording();
  });
  // Play button: Play back the script in this browser
  jQuery('#run-locally').click(function () {
    if(builder.record.recording == true)
		builder.record.stop();
		
    builder.getScript().seleniumVersion.playback.runTest();
  });
});