builder.views.startup = {};

builder.views.startup.openFile = function(script) {
  // NB Edit interface must be open before we can write into the edit form (jQuery relies on
  // the steps being shown).
  builder.gui.switchView(builder.views.script);
  builder.setScript(script);
  builder.stepdisplay.update();
  builder.suite.setCurrentScriptSaveRequired(false);
  builder.gui.suite.update();
}

builder.views.startup.openSel1File = function() {
  var script = builder.selenium1.adapter.importScript();
  if (script) {
    builder.views.startup.openFile(script);
  }
};

builder.views.startup.openSel2File = function() {
  var script = builder.selenium2.loadScript()
  if (script) {
    builder.views.startup.openFile(script);
  }
};

// Attach listeners to the relevant links and buttons.
builder.registerPostLoadHook(function () {
  jQuery('#startup-open-sel1 a').click(builder.views.startup.openSel1File);
  jQuery('#startup-open-sel2 a').click(builder.views.startup.openSel2File);
  
  // jQuery('#startup-start-recording').submit(start_recording); qqDPS
  // jQuery('#startup-record a').click(start_recording);
  // jQuery('#startup-import a').click(import_file);
  // jQuery('#startup-import-sel2 a').click(import_sel2_file);
  // jQuery('#startup-suite-import a').click(import_suite);
  
  jQuery('#startup-start-recording').submit(function() {
    builder.record.startRecording(jQuery('#startup-url').val(), builder.selenium1);
  });
  jQuery('#startup-start-recording-sel2').submit(function() {
    builder.record.startRecording(jQuery('#startup-url').val(), builder.selenium2);
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