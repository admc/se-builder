// Establish bridge namespace.
var bridge = {};
/** The tab node that is highlighted green (can be used to get a reference to the content). */
bridge.recordingTab = null;
/** The window we're recording in, if different from the one in the recordingTab. */
bridge.customRecordingWindow = null;
/** The window that contains the recorder. */
bridge.recorderWindow = null;
/** Document load listeners, mapped from window to listener. */
bridge.docLoadListeners = {};

/** Set an alternate window to record in that's not the window of the recordingTab. */
bridge.setCustomRecordingWindow = function(newWindow) {
  bridge.customRecordingWindow = newWindow;
};

/** @return The content window we're recording in. */
bridge.getRecordingWindow = function() {
  if (bridge.customRecordingWindow) { return customRecordingWindow; }
  return getBrowser().getBrowserForTab(bridge.recordingTab).contentWindow;
};

/** Moves the content window we're recording into the foreground. */
bridge.focusRecordingTab = function() {
  if (bridge.customRecordingWindow) {
    bridge.customRecordingWindow.focus();
    return;
  }
  getBrowser().selectedTab = bridge.recordingTab;
  window.focus();
};

/** Moves the Selenium Builder window into the foreground. */
bridge.focusRecorderWindow = function() {
  bridge.focusRecordingTab();
  bridge.recorderWindow.focus();
};

/** @return The main browser window we're recording in. */
bridge.getBrowser = function() {
  return window;
};

/** Shuts down SeBuilder. */
bridge.shutdown = function() {
  if (bridge.recordingTab) {
    bridge.recordingTab.style.setProperty("background-color", null, null);
  }
  if (bridge.recorderWindow) {
    recorderWindow.close();
  }
  recorderWindow = null;
};

/**
 * Add a listener to be notified when the document in win changes. There can only be one
 * listener per window. (Though the code can be easily improved using arrays and splicing
 * if this becomes a problem.)
 */ 
bridge.addDocLoadListener = function(win, l) {
  bridge.docLoadListeners[win] = l;
};

bridge.removeDocLoadListener = function(win, l) {
  delete bridge.docLoadListeners[win];
};

bridge.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

bridge.rcHostPort = function() {
  return bridge.prefManager.getCharPref("extensions.seleniumbuilder.rc.hostport");
};

bridge.setRcHostPort = function(hostport) {
  bridge.prefManager.setCharPref("extensions.seleniumbuilder.rc.hostport", hostport);
};

bridge.rcBrowserString = function() {
  return bridge.prefManager.getCharPref("extensions.seleniumbuilder.rc.browserstring");
};

bridge.setRcBrowserString = function(browserstring) {
  bridge.prefManager.setCharPref("extensions.seleniumbuilder.rc.browserstring", browserstring);
};

bridge.boot = function() {
  // Save the tab the user has currently open: it's the one we'll record from.
  bridge.recordingTab = getBrowser().mCurrentTab;

  // Make it obvious which tab is recording by turning it green!
  bridge.recordingTab.style.setProperty("background-color", "#ccffcc", "important");
  
  bridge.recorderWindow = window.open("chrome://seleniumbuilder/content/html/gui.html", "seleniumbuilder", "width=550,height=600,toolbar=no,location=no,directories=no,status=yes,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes");
    
  // Install a listener with the browser to be notified when a new document is loaded.
  try {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(
        Components.interfaces.nsIObserverService);
    var observer = {
      observe: function (win) {
        if (bridge.docLoadListeners[win]) {
          bridge.docLoadListeners[win]();
        }
      }
    };
    observerService.addObserver(observer, "content-document-global-created", false);
  } catch (e) {
    dump(e);
  }
  
  bridge.booter = setInterval(function() {
    if (bridge.recorderWindow.wrappedJSObject.boot) {
      bridge.recorderWindow.wrappedJSObject.boot(bridge);
      clearInterval(bridge.booter);
    }
  }, 100);
};

/**
 * Loads the given URL from the file system given a chrome:// URL.
 */
bridge.loadFile = function(url, success, error) {
  var data = "";
  // Get rid of the random number get-string meant to discourage caching.
  if (url.match("[?]")) {
    url = url.split("?")[0];
  }
  var prefix = "chrome://seleniumbuilder/";
  var path = "chrome/" + url.substring(prefix.length);
  var MY_ID = "seleniumbuilder@saucelabs.com";
  var file = null;
  try {
    // We may be on FF 4 or later
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID(MY_ID, function(addon) {
      file = addon.getResourceURI(path).QueryInterface(Components.interfaces.nsIFileURL).file;
      var data = null;
      try {
        data = bridge.readFile(file);
      } catch (e) {
        error(e);
        return;
      }
      success(data);
    });
  } catch (e) {
    // We're on Firefox < 4, so we can use nsIExtensionManager.
    var em = Components.classes["@mozilla.org/extensions/manager;1"].
        getService(Components.interfaces.nsIExtensionManager);
    file = em.getInstallLocation(MY_ID).getItemFile(MY_ID, path);
    var data = null;
    try {
      data = bridge.readFile(file);
    } catch (e) {
      error(e);
      return;
    }
    window.setTimeout(function() { success(data); }, 1000); // Pretend this took time.
  }
};

bridge.readFile = function(file) {
  var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
              createInstance(Components.interfaces.nsIFileInputStream);
  var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
              createInstance(Components.interfaces.nsIConverterInputStream);
  fstream.init(file, -1, 0, 0);
  cstream.init(fstream, "UTF-8", 0, 0); // you can use another encoding here if you wish

  var str = {};
  var read = 0;
  var data = "";
  do { 
    read = cstream.readString(0xffffffff, str); // read as much as we can and put it in str.value
    data += str.value;
  } while (read != 0);
  cstream.close(); // this closes fstream
  return data;
}