// Establish gui namespace.
builder.gui = {};
builder.views = {};

/** The view being displayed. */
builder.gui.currentView = null;

builder.gui.switchView = function(newView) {
  if (builder.gui.currentView != null) {
    builder.gui.currentView.hide();
  }
  builder.gui.currentView = newView;
  builder.gui.currentView.show();
};

builder.registerPostLoadHook(function() {
  // Auto-resize the steps area.
  window.setInterval(function() {
    jQuery('#steplist').css('top', 70 + jQuery('#panels').height());
  }, 150);
  
  // Set the initial value of currenturl - this is necessary so that the startup-url field is
  // populated.
  builder.storage.set('currenturl', window.bridge.getRecordingWindow().document.location.toString());
});