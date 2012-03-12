builder.views.script = {};

builder.views.script.clearResults = function() {
  var script = builder.getScript();
  if (script.steps) { script = script.steps; }
  for (var i = 0; i < script.length; i++) {
    jQuery('#' + script[i].uuid + '-content').css('background-color', '#dddddd');
    jQuery('#' + script[i].uuid + 'error').hide();
    jQuery('#' + script[i].uuid + 'message').hide();  
  }
  jQuery('#edit-clearresults').hide();
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
    builder.rc.stoptest();
  });

  // Clear play results:
  jQuery('#edit-clearresults').click(function() {
    builder.views.script.clearResults();
    jQuery('#edit-clearresults').hide();
  });
  
  // Bind to the testscriptpath value to display the path of the script 
  builder.storage.addChangeListener('testscriptpath', function (path) {
    if (path) {
      if (path.where == "remote") {
        jQuery("#edit-test-script-nopath").hide();
        jQuery("#edit-test-script-path").show().html("Currently editing: " +
          path.customer_name +
          " / " + path.project_name +
          " / " + path.test_script);
      } else {
        jQuery("#edit-test-script-nopath").hide();
        jQuery("#edit-test-script-path").show().html(
          "Currently editing: " + path.path
        );
      }  
    } else {
      jQuery("#edit-test-script-path").hide();
      jQuery("#edit-test-script-nopath").show();
    }
  });
});