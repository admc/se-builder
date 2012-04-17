builder.views.script = {};

builder.views.script.clearResults = function() {
  var script = builder.getScript();
  for (var i = 0; i < script.steps.length; i++) {
    jQuery('#' + script.steps[i].id + '-content').css('background-color', 'white');
    jQuery('#' + script.steps[i].id + '-error').hide();
    jQuery('#' + script.steps[i].id + '-message').hide();  
  }
  jQuery('#edit-clearresults-span').hide();
};

builder.views.script.show = function() {
  jQuery('#edit-panel, #steplist, #menu').show();
};

builder.views.script.hide = function() {
  jQuery('#edit-panel, #steplist, #menu').hide();
};

builder.registerPostLoadHook(function() {
  // Buttons visible while recording:
  jQuery('#record-stop-button').click(function (e) {
    builder.record.stop();
  });

  jQuery('#record-verify').click(function (e) {
    if (builder.record.verifyExploring) {
      builder.record.stopVerifyExploring();
    } else {
      builder.record.verifyExplore();
    }
  });
  
  // Current URL in heading
  jQuery('#record-url-display').click(function (e) {
    e.preventDefault();
  });

  // A "currently recording at" label in the interface 
  builder.storage.addChangeListener('currenturl', function (url) {
    jQuery('#record-url-display').attr('href', url).text(url);
  });
  
  // Stop playback buttons
  jQuery('#edit-stop-local-playback').click(function() {
    builder.getScript().seleniumVersion.playback.stopTest();
  });
  jQuery('#edit-stop-rc-playback').click(function() {
    builder.getScript().seleniumVersion.rcPlayback.stopTest();
  });

  // Clear play results:
  jQuery('#edit-clearresults').click(function() {
    builder.views.script.clearResults();
    jQuery('#edit-clearresults-span').hide();
  });
  
  // Display the path of the script 
  builder.suite.addScriptChangeListener(function () {
    var path = builder.suite.hasScript() ? builder.getScript().path : null;
    if (path) {
      jQuery("#edit-test-script-nopath").hide();
      jQuery("#edit-test-script-path").show().html(
        "Currently editing: " + path.path
      );
    } else {
      jQuery("#edit-test-script-path").hide();
      jQuery("#edit-test-script-nopath").show();
    }
  });
});