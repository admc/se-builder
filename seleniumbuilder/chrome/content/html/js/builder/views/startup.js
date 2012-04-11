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

builder.views.startup.loadFile = function(version) {
  var script = version.loadScript();
  if (script) {
    builder.views.startup.openFile(script);
  }
};

builder.views.startup.convertFile = function(srcVersion, targetVersion) {
  var script = srcVersion.loadScript();
  if (script) {
    if (!builder.versionconverter.canConvert(script, targetVersion)) {
      var iList = builder.versionconverter.nonConvertibleStepNames(script, targetVersion);
      var inconvertibles = "";
      for (var i = 0; i < iList.length; i++) {
        inconvertibles += iList[i] + " ";
      }
      alert("This script cannot be converted. The following steps are not convertible:\n" + inconvertibles);
      return;
    }
    script = builder.versionconverter.convertScript(script, targetVersion);
    builder.views.startup.openFile(script);
    builder.suite.setCurrentScriptSaveRequired(true);
  }
};

builder.views.startup.openSel1Suite = function() {
  var suite = builder.selenium1.loadSuite();
  if (suite) {
    builder.gui.switchView(builder.views.script);
    builder.suite.setSuite(suite.scripts, suite.path);
    builder.stepdisplay.update();
    builder.suite.setCurrentScriptSaveRequired(false);
    builder.gui.suite.update();
  }
};

// Attach listeners to the relevant links and buttons.
builder.registerPostLoadHook(function () {
  jQuery('#startup-open-sel1 a').click(function() { builder.views.startup.loadFile(builder.selenium1); });
  jQuery('#startup-open-sel2 a').click(function() { builder.views.startup.loadFile(builder.selenium2); });
  jQuery('#startup-convert-sel2-1 a').click(function() { builder.views.startup.convertFile(builder.selenium2, builder.selenium1); });
  jQuery('#startup-convert-sel1-2 a').click(function() { builder.views.startup.convertFile(builder.selenium1, builder.selenium2); });
  jQuery('#startup-open-suite-sel1 a').click(builder.views.startup.openSel1Suite);
  jQuery('#startup-show-steps-table a').click(builder.gui.stepstable.show);
  
  jQuery('#startup-start-recording-sel1').submit(function() {
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