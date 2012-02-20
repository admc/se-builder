builder.views.startup = {};

builder.openSel2File = function(script) {
  // NB Edit interface must be open before we can write into the edit form (jQuery relies on
  // the steps being shown).
  builder.storage.set('selMajorVersion', "2");
  builder.gui.switchView(builder.views.script);
  
  builder.setCurrentScript(script);
  builder.sel2.updateStepsDisplay();

  builder.storage.set('testscriptpath', script.path);
  builder.storage.set('save_required', false);
  
  builder.gui.suite.update();
}

// Attach listeners to the relevant links and buttons.
builder.registerPostLoadHook(function () {
  // jQuery('#startup-start-recording').submit(start_recording); qqDPS
  // jQuery('#startup-record a').click(start_recording);
  // jQuery('#startup-import a').click(import_file);
  // jQuery('#startup-import-sel2 a').click(import_sel2_file);
  // jQuery('#startup-suite-import a').click(import_suite);
  
  jQuery('#startup-start-recording-sel2').submit(function() {
    builder.sel2.startRecording(jQuery('#startup-url').val(), false);
  });
  jQuery('#startup-open-sel2 a').click(function() {
    builder.openSel2File(builder.selenium2.loadScript());
  });
  
  // Populate the input field for the URL to record from.
  builder.storage.addChangeListener('currenturl', function (v) {
    jQuery('#startup-url').val(v);
  });
});

builder.views.startup.show = function() {
  jQuery('#startup, #heading-startup').show();
};

builder.views.startup.hide = function() {
  jQuery('#startup, #heading-startup').hide();
};