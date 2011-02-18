/**
 * The seleniumBuilder singleton provides a bridge into privileged javascript for the recorder code.
 *
 * seleniumBuilder.boot is the Javascript function that is called to start up the recorder, so it's
 * a good place to start. boot is responsible for creating the recorder window, containing
 * recorder.html. Both of these are in the plugin. recorder.html then loads load.js from server-
 * side, which then loads the rest of the code.
 *
 * It provides low-level access to the bits of the browser that we need. The chrome URL that we
 * load then imports bucket-loads of javascript so that we can update the code without needing to
 * re-roll this xpi.
 *
 * Interestingly enough, when the javascript in chrome://seleniumbuilder/content/test.html calls
 * seleniumBuilder.content(), it receives a wrappedJSObject, but when javascript that's included
 * from outside calls the same function, the resulting object is not wrapped.
 *
 * Note that this object is generally referred to as "window.bridge" by other code. This value is
 * set in recorder.html.
 */
var seleniumBuilder = new(function () {
  var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

  /** True from the click of the button to calling .boot in the window. */
  var booting = false;
  /** True from calling .boot in the window to calling .shutdown. */
  var booted = false;
  /**
   * True after one monitoring heartbeat fails. If the next fails - shutdown, otherwise set back
   * to false.
   */
  var dying = false;
  /** The tab node that is highlighted green (can be used to get a reference to the content). */
  var recordingTab = null;
  /** The window we're recording in, if different from the one in the recordingTab. */
  var recordingWindow = null;
  /** The window that contains the recorder. */
  var recorderWindow = null;
  /** The setInterval result that is monitoring the liveness of the recorderWindow. */
  var monitorInterval = null;
  /** Document load listeners, mapped from window to listener. */
  var docLoadListeners = {};

  /** @return true if text ends in suffix */
  function endsWith(text, suffix) {
    return text.substr(text.length - suffix.length) == suffix;
  }
  
  /** Reads in a given file. */
  function readFile(file) {
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

  // If we are on <customer>.go-test.it, tell the page that we exist. This way, the frontend site
  // can be aware of whether the recorder is running.
  window.addEventListener("load", function () {
    document.getElementById("appcontent").addEventListener("DOMContentLoaded", function (event) {			
      var doc = event.originalTarget;
      if (doc.location &&
        doc.location.href.indexOf("http") == 0 &&
        doc.location.host &&
        endsWith(doc.location.host, "." + seleniumBuilder.serverDomainName()) &&
        doc.wrappedJSObject.haveSeleniumBuilder)
      {
        doc.wrappedJSObject.haveSeleniumBuilder(seleniumBuilder);
      }
    }, true);
  }, false);

  return {
    /**
     * Starts a new recorder instance associated with the current content tab.
     * @param script The location of the GTI script to load into the instance
     */
    boot: function (script) {
      if (!script) { script = null; }

      if (recorderWindow) {
        // The recorder is already open in this window.
        seleniumBuilder.focusWindow(script);
      } else if (content.document.location.href.indexOf("chrome://seleniumbuilder/content/recorder.html") == 0) {
        // Already within the recorder (note href is the only property that is guaranteed
        // to be present on location).
        // We can't use the local seleniumBuilder instance as it is the wrong window
        if (content.opener.wrappedJSObject.seleniumBuilder) {
          content.opener.wrappedJSObject.seleniumBuilder.focusWindow();
        }
        return;
      } else if (booting) {
        return;
      } else {
        // Load the recorder:
        // recorder.html must be loaded from a chrome url to ensure that the same-origin
        // policy stays out of the way.
        booting = true;
        recorderWindow = window.open(
            "chrome://seleniumbuilder/content/recorder.html",
            "seleniumbuilder", "width=550,height=600,toolbar=no,location=no,directories=no,status=yes,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes");
        
        // Save the tab the user has currently open: it's the one we'll record from.
        recordingTab = getBrowser().mCurrentTab;

        // Make it obvious which tab is recording by turning it green!
        recordingTab.style.setProperty("background-color", "#ccffcc", "important");

        // If the user closes the recording tab and we know what URL we were on, we just
        // reopen the tab. (The code for lastSeenUrl is in step.js.)
        getBrowser().mTabContainer.addEventListener("TabClose", function (event) {
          if (event.target == recordingTab) {
            if (recorderWindow.wrappedJSObject.lastSeenUrl()) {
              recordingTab = getBrowser().addTab(recorderWindow.wrappedJSObject.lastSeenUrl());
              recordingTab.style.setProperty("background-color", "#33CC33", "important");
              seleniumBuilder.focusWindow();
            } else {
              seleniumBuilder.shutdown();
            }
          }
        }, false);

        // Set up a monitor interval to first boot the recorder window and then ensure its
        // upness. If an exception occurs twice in a row, shut down the recorder.
        monitorInterval = setInterval(function () {
          try {
            // This is boot() in recorder.html, not boot() here!
            recorderWindow.wrappedJSObject.boot(seleniumBuilder, script);
            booted = true;
            dying = false;
            script = null;
          } catch (e) {
            if (dying) {
              seleniumBuilder.shutdown();
            } else if (booted) {
              dying = true;
            }
          }
        }, 500);
        
        // Install a listener with the browser to be notified when a new document is
        // loaded.
        try {
          var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(
              Components.interfaces.nsIObserverService);
          var observer = {
            observe: function (win) {
              if (docLoadListeners[win]) {
                docLoadListeners[win]();
              }
            }
          };
          observerService.addObserver(observer, "content-document-global-created", false);
        } catch (e) {
          dump(e);
        }
      }
    },
    
    /**
     * Add a listener to be notified when the document in win changes. There can only be one
     * listener per window. (Though the code can be easily improved using arrays and splicing
     * if this becomes a problem.
     */ 
    addDocLoadListener: function(win, l) {
      docLoadListeners[win] = l;
    },
    
    /** Remove document load listener again. */
    removeDocLoadListener: function(win) {
      delete docLoadListeners[win];
    },

    /**
     * @return The XPCNativeWrapper around the Window from which this
     *     instance of the recorder was started.
     */
    content: function () {
      if (recordingWindow) { return recordingWindow; }
      return getBrowser().getBrowserForTab(recordingTab).contentWindow;
    },
		
		firstRun: function () {
			try {
				var first = prefManager.getBoolPref("extensions.seleniumbuilder.firstrun");
				return false;
			}
			catch(err) {
				prefManager.setBoolPref("extensions.seleniumbuilder.firstrun", false);
				return true;
			}
    },

    /** 
     * @return the window that contains the recorder 
     */
    window: function () {
      return recorderWindow;
    },

    /**
     * @return the browser window that contains the content
     */
    browser: function () {
      return window;
    },

    /**
     * @return the browser tab associated with the content
     */
    tab: function () {
      return recordingTab;
    },

    /**
     * Opens the tab that we are recording and focuses the recorder window over the top.
     * @param script If set, load in this script
     */
    focusWindow: function (script) {
      seleniumBuilder.focusContent();
      recorderWindow.focus();
      if (script) {
        recorderWindow.wrappedJSObject.openScript(script);
      }
    },

    /**
     * Shows the tab in which we are recording, over the top of the recorder window
     */
    focusContent: function () {
      if (recordingWindow) {
        recordingWindow.focus();
        return;
      }
      getBrowser().selectedTab = recordingTab;
      window.focus();
    },

    /**
     * Close the recorder window nicely.
     */
    shutdown: function () {
      recordingTab.style.setProperty("background-color", null, null);
      if (recorderWindow) {
        recorderWindow.close();
      }
      recorderWindow = null;
      booting = false;
      booted = false;
      dying = false;
      clearInterval(monitorInterval);
    },
    
    /**
     * Change the recording window to a custom one.
     */
    setCustomRecordingWindow: function(newWindow) {
      recordingWindow = newWindow;
    },
    
    /** @return Whether a server domain name has been set. */
    hasServer: function() {
      return prefManager.prefHasUserValue("extensions.seleniumbuilder.domainname");
    },

    /** @return The domain name of the server to connect to. */
    serverDomainName: function () {
      return prefManager.getCharPref("extensions.seleniumbuilder.domainname");
    },

    /**
     * The URL to load the recorder Javascript from. Either a chrome URL or a http URL.
     */
    recorderURL: function () {
      return prefManager.getCharPref("extensions.seleniumbuilder.recorderurl");
    },
    
    /**
     * Loads the given URL either from the file system if supplies a chrome:// URL, or using
     * AJAX if supplied any other kind of URL. Must pass in a ref to jQuery. Uses
     * same params format as a jQuery.ajax call.
     */
    load: function(jQuery, args) {
      var url = args.url;
      var prefix = "chrome://seleniumbuilder/";
      if (url.match("^" + prefix)) {
        var data = "";
        // Get rid of the random number get-string meant to discourage caching.
        if (url.match("[?]")) {
          url = url.split("?")[0];
        }
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
                 data = readFile(file);
               } catch (e) {
                 args.error(e);
                 return;
            }
            args.success(data);
          });
        } catch (e) {
          // We're on Firefox < 4, so we can use nsIExtensionManager.
             var em = Components.classes["@mozilla.org/extensions/manager;1"].
                  getService(Components.interfaces.nsIExtensionManager);
             file = em.getInstallLocation(MY_ID).getItemFile(MY_ID, path);
             var data = null;
          try {
               data = readFile(file);
          } catch (e) {
            args.error(e);
            return;
          }
          window.setTimeout(function() { args.success(data); }, 1000); // Pretend this took time.
        }
      } else {
        jQuery.ajax(args);
      }
    },

    rcHostPort: function() {
      return prefManager.getCharPref("extensions.seleniumbuilder.rc.hostport");
    },
    setRcHostPort: function(hostport) {
      prefManager.setCharPref("extensions.seleniumbuilder.rc.hostport", hostport);
    },
    rcBrowserString: function() {
      return prefManager.getCharPref("extensions.seleniumbuilder.rc.browserstring");
    },
    setRcBrowserString: function(browserstring) {
      prefManager.setCharPref("extensions.seleniumbuilder.rc.browserstring", browserstring);
    },
  };
})();