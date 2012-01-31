builder.gui.menu = {};

builder.gui.menu.updateRunSuiteOnRC = function() {
  if (builder.suite.hasSelenium2Scripts() || builder.storage.get('selMajorVersion')) {
    jQuery("#run-suite-onrc-li").hide();
  } else {
    jQuery("#run-suite-onrc-li").show();
  }
};

builder.registerPostLoadHook(function() {
  jQuery("#run-onrc-li").show();
  builder.storage.addChangeListener('selMajorVersion', function(selMajorVersion) {
    if (selMajorVersion == "1") {
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
  jQuery('#edit-discard').click(
    function () {
      if (builder.storage.get('save_required', false) == false ||
          confirm("If you continue, you will lose all your recent changes."))
      {
        builder.gui.switchView(builder.views.startup);
        builder.storage.set('selMajorVersion', "1"); // By default.
        builder.storage.set('testscriptpath', null);
        builder.storage.set('save_required', false);
        jQuery('#steps').html('');
        // Clear any error messages.
        jQuery('#error-panel').hide();
      }
    }
  );
  // Record button: Record more of the script
  jQuery('#record').click(function () {
    if (builder.storage.get('selMajorVersion') == "2") {
      builder.sel2.continueRecording();
    } else {
      // The user knows this may fail now.
      jQuery('#error-panel').hide();
      // qqDPS
    }
  });
  // Play button: Play back the script in this browser
  jQuery('#run-locally').click(function () {
    if (builder.storage.get('selMajorVersion') == "2") {
      builder.sel2.playback.runTest();
    } else {
      builder.local.runtest();
    }
  });
});