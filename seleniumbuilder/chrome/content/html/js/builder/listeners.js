builder.registerPostLoadHook(function() {
  // Attach a listener to the recorder tab that tells us when the page is being loaded. This
  // allows for waitForPageToLoad events to be generated, for recorders to be attached to
  // newly opened pages, and for local playback to notice when it can go to the next step.
  builder.loadlistener.attach(
      /* root window */ window.bridge.getRecordingWindow(),
      /* window */ window.bridge.getRecordingWindow(),
      /* load */ function(url) {
        dump("!!!PL");
        builder.storage.set('currenturl', url);
        builder.storage.set('pageloading', false);
      },
      /* unload */ function() {
        dump("!!!PU");
        builder.storage.set('pageloading', true);
      }
  );
});

/**
 * Listens for new windows being created while recording is going on and offers the option to
 * switch recording to them.
 */
builder.PopupWindowObserver = function() {};
builder.PopupWindowObserver.prototype = {
  observe: function(aSubject, aTopic, aData) {
    /*if (typeof builder == 'undefined') { return; } 
    if (aTopic == "domwindowopened") {
      aSubject.addEventListener("DOMContentLoaded", function (event) {
        var newWindow = event.target.defaultView;
        // Only do this in record mode as otherwise we'll get those popups while playing back or
        // just navigating.
        if (builder.interface.getCurrentInterface() == 'record') {
          // Ignore about windows and chrome windows.
          if ((newWindow.location.href.indexOf("about:") == -1) &&
              (newWindow.location.href.indexOf("chrome://") == -1))
          {
            window.focus();
            if (confirm("We detected a new popup, would you like to \ngenerate commands to select it?")) {
              builder.interface.record_action('waitForPopUp', { windowID:"null", timeout: 3000 });
              builder.interface.record_action('selectWindow', { windowID: newWindow.name }); 
              // Set the focus to the popup window
              builder.setRecordWindow(newWindow);
              aSubject.content.focus();
            }
          }
        }
      }, true);
    } else {
      // If a window has closed.
      if (aSubject.content && aSubject.content.wrappedJSObject.location.href.indexOf("about:") == -1) {
        window.focus();
        if (builder.interface.getCurrentInterface() == 'record') {
          if (confirm("We detected a popup has closed, would you like to \ngenerate commands to close it?")) {
            builder.interface.record_action('close', { });
            builder.interface.record_action('selectWindow', { windowID: "null"});
            builder.setRecordWindow(null);
          }
        }
      }
    }*/
  }
};

var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
ww.registerNotification(new builder.PopupWindowObserver());