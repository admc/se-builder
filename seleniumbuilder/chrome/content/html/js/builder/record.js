builder.record = {};

builder.record.verifyExploring = false;
builder.record.verifyExplorer = null;

builder.record.recording = false;
builder.record.recorder = null;
builder.record.pageLoadListener = null;
builder.record.selenium1WaitsListener = null;
builder.record.selenium1WaitsListenerNoticedLoading = false;

builder.record.verifyExplore = function() {
  builder.record.verifyExploring = true;
  builder.record.stop();
  jQuery('#record-panel').show();
  window.bridge.focusRecordingTab();
  builder.record.verifyExplorer = new builder.VerifyExplorer(
    window.bridge.getRecordingWindow(),
    builder.getScript().seleniumVersion,
    function(step) {
      builder.getScript().addStep(step);
      builder.stepdisplay.update();
      // Don't immediately stop: this would cause the listener that prevents the click from
      // actually activating the selected element to be detached prematurely.
      setTimeout(function() { builder.record.stopVerifyExploring(); }, 1);
      window.bridge.focusRecorderWindow();
    }
  );
};

builder.record.stopVerifyExploring = function() {
  builder.record.verifyExploring = false;
  builder.record.verifyExplorer.destroy();
  builder.record.verifyExplorer = null;
  builder.record.continueRecording();
};

/** Deletes all browser cookies for the domain of the given URL. */
function deleteURLCookies(url) {
  var domain = "." + builder.getDomainName(url).split("//")[1];
  var man = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
  var en = man.enumerator;
  var cookies = [];
  while (en.hasMoreElements()) {
    cookies.push(en.getNext());
  }
  for (var i = 0; i < cookies.length; i++) {
    var c = cookies[i];
    // Explain to the cookie that it's a cookie...
    c.QueryInterface(Components.interfaces.nsICookie);
    if (endsWith(domain, c.host)) {
      man.remove(c.host, c.name, c.path, false);
    }
  }
}

/** Whether a ends with b. */
function endsWith(a, b) {
  if (a.length < b.length) { return false; }
  return a.substring(a.length - b.length) == b;
}

builder.record.recordStep = function(step) {
  builder.getScript().addStep(step);
  builder.stepdisplay.update();
};

builder.record.stop = function() {
  jQuery('#record-panel').hide();
  builder.record.recorder.destroy();
  builder.record.recorder = null;
  builder.storage.removeChangeListener('pageloading', builder.record.pageLoadListener);
  if (builder.record.selenium1WaitsListener) {
    builder.storage.removeChangeListener('pageloading', builder.record.selenium1WaitsListener);
    builder.record.selenium1WaitsListener = null;
  }
  builder.record.recording = false;
};

builder.record.continueRecording = function() {
  jQuery('#record-panel').show();
  if (builder.getScript().seleniumVersion == builder.selenium1) {
    builder.record.recorder = new builder.selenium1.Recorder(window.bridge.getRecordingWindow(), builder.record.recordStep);
  } else {
    builder.record.recorder = new builder.selenium2.Recorder(window.bridge.getRecordingWindow(), builder.record.recordStep);
  }
  var isLoading = false;
  builder.record.pageLoadListener = function(pageloading) {
    if (pageloading) {
      isLoading = true;
      jQuery('#heading-record').addClass('is-on');
    } else {
      jQuery('#heading-record').removeClass('is-on');
      if (isLoading) {
        builder.record.recorder.destroy();
        var script = builder.getScript();
        if (builder.getScript().seleniumVersion == builder.selenium1) {
          // If we've navigated to this location manually, the URL has not yet been set, so we do
          // this now.
          var ls = script.getLastStep();
          if (ls && ls.type == builder.selenium1.stepTypes.open && (ls.url || "") == "") {
            ls.url = window.bridge.getRecordingWindow().location + "";
            builder.stepdisplay.update();
          }
          
          builder.record.recorder = new builder.selenium1.Recorder(window.bridge.getRecordingWindow(), builder.record.recordStep);
        } else {
          // If we've navigated to this location manually, the URL has not yet been set, so we do
          // this now.
          var ls = script.getLastStep();
          if (ls && ls.type == builder.selenium2.stepTypes.get && (ls.url || "") == "") {
            ls.url = window.bridge.getRecordingWindow().location + "";
            builder.stepdisplay.update();
          }
          builder.record.recorder = new builder.selenium2.Recorder(window.bridge.getRecordingWindow(), builder.record.recordStep);
        }
      }
      isLoading = false;
    }
  };
  builder.storage.addChangeListener('pageloading', builder.record.pageLoadListener);
  
  if (builder.getScript().seleniumVersion == builder.selenium1) {
    builder.record.selenium1WaitsListenerNoticedLoading = false;
    builder.record.selenium1WaitsListener = function(pageloading) {
      if (pageloading && !builder.record.selenium1WaitsListenerNoticedLoading) {
        builder.record.selenium1WaitsListenerNoticedLoading = true;
        return;
      }
      if (builder.record.selenium1WaitsListenerNoticedLoading) {
        builder.record.recordStep(new builder.Step(builder.selenium1.stepTypes.waitForPageToLoad, "60000"));
        builder.record.selenium1WaitsListenerNoticedLoading = false;
        return;
      }
    };
    
    builder.storage.addChangeListener('pageloading', builder.record.selenium1WaitsListener);
  }
};

builder.record.startRecording = function(urlText, seleniumVersion) {
  var anchorIndex = urlText.indexOf('#');
  if (anchorIndex != -1) {
    urlText = urlText.substring(0, anchorIndex);
  }
  var url = new builder.Url(urlText);

  if (!url.hostname() || urlText.substring(0, 6) == 'about:') {
    alert("The URL is not valid and cannot be loaded.");
    jQuery("#startup-url").focus();
    return;
  }
  // Delete cookies for given URL.
  deleteURLCookies(url.href());
  builder.storage.set('baseurl', url.server());

  // Now load the page - both to ensure we're on the right page when we start recording
  // and to ensure that we get a clean page free of cookie influence.
  // Don't show the record interface until the new page has loaded.
  var isLoading = false;
  builder.record.pageLoadListener = function(pageloading) {
    if (pageloading) {
      isLoading = true;
      jQuery('#heading-record').addClass('is-on');
    } else {
      jQuery('#heading-record').removeClass('is-on');
      if (isLoading) {
        builder.record.recording = true;    
        builder.gui.switchView(builder.views.script);
        builder.suite.addScript(new builder.Script(seleniumVersion));
        if (seleniumVersion == builder.selenium1) {
          builder.getScript().addStep(new builder.Step(builder.selenium1.stepTypes.open, url.href()));
          builder.record.recordStep(new builder.Step(builder.selenium1.stepTypes.waitForPageToLoad, "60000"));
        } else {
          builder.getScript().addStep(new builder.Step(builder.selenium2.stepTypes.get, url.href()));
        }
        builder.stepdisplay.update();
        builder.storage.removeChangeListener('pageloading', builder.record.pageLoadListener);
        builder.record.continueRecording();
      }
      isLoading = false;
    }
  };
  builder.storage.addChangeListener('pageloading', builder.record.pageLoadListener);
  window.bridge.getRecordingWindow().location = url.href();
};