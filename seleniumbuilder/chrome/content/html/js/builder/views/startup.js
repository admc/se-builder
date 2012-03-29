builder.views.startup = {};

builder.openSel2File = function(script) {
  // NB Edit interface must be open before we can write into the edit form (jQuery relies on
  // the steps being shown).
  builder.gui.switchView(builder.views.script);
  
  builder.setScript(script);
  builder.stepdisplay.update();

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
  
  jQuery('#startup-start-recording').submit(function() {
    builder.record.startRecording(jQuery('#startup-url').val(), false, builder.selenium1);
  });
  jQuery('#startup-start-recording-sel2').submit(function() {
    builder.record.startRecording(jQuery('#startup-url').val(), false, builder.selenium2);
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