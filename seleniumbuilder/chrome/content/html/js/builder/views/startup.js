builder.views.startup = {};

// Attach listeners to the relevant links and buttons.
builder.registerPostLoadHook(function () {
  jQuery('#startup-open a').click(function() { builder.io.loadUnknownFile(); });
  jQuery('#startup-show-steps-table a').click(builder.gui.stepstable.show);
  
  jQuery('#startup-start-recording-sel1').submit(function() {
    builder.record.startRecording(jQuery('#startup-url').val(), builder.selenium1);
  });
  jQuery('#startup-start-recording-sel2').submit(function() {
    builder.record.startRecording(jQuery('#startup-url').val(), builder.selenium2);
  });
});

// Populate the input field for the URL to record from.
builder.pageState.addListener(function (url, loading) {
  jQuery('#startup-url').val(url);
});

builder.views.startup.show = function() {
  jQuery('#startup, #heading-startup').show();
};

builder.views.startup.hide = function() {
  jQuery('#startup, #heading-startup').hide();
};