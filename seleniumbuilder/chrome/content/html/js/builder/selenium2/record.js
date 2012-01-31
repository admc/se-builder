builder.sel2.recording = false;
builder.sel2.recorder = null;
builder.sel2.pageLoadListener = null;
builder.sel2.assertExploring = false;
builder.sel2.assertExplorer = null;

/**
 * Code to interface with recorder.js.
*/
builder.sel2.recordStep = function(type, params) {
  var pNames = builder.sel2.paramNames[type];
  if (!pNames) { return; }
  try {
    var newStep = new builder.sel2.Sel2Step(type);
    // The Selenium 1 step has 0-2 parameters, which are always called "locator" and "option",
    // independently of whether they actually *are* locators/not locators.
    for (var param_n = 0; param_n < pNames.length; param_n++) {
      var sel2_param_name = pNames[param_n];
      var sel1_param_name = ["locator", "option"][param_n];
      if (sel2_param_name.startsWith("locator")) {
        newStep[sel2_param_name] = builder.sel2.extractSel2Locator(params);
      } else {
        newStep[sel2_param_name] = extractSel2Value(params, type, sel1_param_name, sel2_param_name);
      }
    }
  } catch (e) {
    alert(e);
  }
  builder.getCurrentScript().addStep(newStep);
  builder.sel2.updateStepsDisplay();
  builder.storage.set('save_required', true);
};

builder.sel2.recordAssertion = function(type, params) {
  switch (type) {
    case "assertVisible": {
      builder.getCurrentScript().addStep(new builder.sel2.Sel2Step("verifyElementPresent", builder.sel2.extractSel2Locator(params)));
      builder.sel2.updateStepsDisplay();
      break;
    }
    case "assertTextPresent": {
      builder.getCurrentScript().addStep(new builder.sel2.Sel2Step("verifyTextPresent", params.pattern));
      builder.sel2.updateStepsDisplay();
      break;
    }
    case "assertSelectedValues":
      // qqDPS not yet implemented
      break;
    case "assertValue": {
      builder.getCurrentScript().addStep(new builder.sel2.Sel2Step("verifyElementValue", builder.sel2.extractSel2Locator(params), params["equal to"]));
      builder.sel2.updateStepsDisplay();
      break;
    }
  }
  builder.storage.set('save_required', true);
};

function extractSel2Value(params, type, sel1_param_name, sel2_param_name) {
  if (type == "clickElementWithOffset") {
    return params["coordString"];
  }
  return params["text"] || "";
}

/** Takes a params object and turns it into a well-behaved Sel 2 locator. */
builder.sel2.extractSel2Locator = function(params) {
  var locatorData = {"alternatives": {}};
  for (var i = 0; i < builder.loc_type_1_2.length; i++) {
    var l_1_2 = builder.loc_type_1_2[i];
    if (params[l_1_2[0]]) {
      locatorData.alternatives[l_1_2[1]] = params[l_1_2[0]];
      if (params["_default"] == l_1_2[0]) {
        locatorData.type = l_1_2[1];
        locatorData.value = params[l_1_2[0]];
      }
    }
  }
  
  return locatorData;
}

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

builder.sel2.assertExplore = function() {
  builder.sel2.assertExploring = true;
  builder.sel2.stopRecording();
  jQuery('#record-panel').show();
  window.bridge.focusRecordingTab();
  builder.sel2.assertExplorer = new builder.AssertExplorer(
    window.bridge.getRecordingWindow(),
    function() {},
    function(method, params) {
      builder.sel2.recordAssertion(method, params);
      setTimeout(function() { builder.sel2.stopAssertExploring(); }, 1);
      window.bridge.focusRecorderWindow();
    },
    /*for_choosing_locator*/
    false
  );
};

builder.sel2.stopAssertExploring = function() {
  builder.sel2.assertExploring = false;
  builder.sel2.assertExplorer.destroy();
  builder.sel2.assertExplorer = null;
  builder.sel2.continueRecording();
};

builder.sel2.stopRecording = function() {
  jQuery('#record-panel').hide();
  builder.sel2.recorder.destroy();
  builder.sel2.recorder = null;
  builder.storage.removeChangeListener('pageloading', builder.sel2.pageLoadListener);
  builder.sel2.recording = false;
};

builder.sel2.continueRecording = function() {
  jQuery('#record-panel').show();
  builder.sel2.recorder = new builder.sel2.Recorder(window.bridge.getRecordingWindow(), builder.sel2.recordStep);
  var isLoading = false;
  builder.sel2.pageLoadListener = function(pageloading) {
    if (pageloading) {
      isLoading = true;
      jQuery('#heading-record').addClass('is-on');
    } else {
      jQuery('#heading-record').removeClass('is-on');
      if (isLoading) {
        builder.sel2.recorder.destroy();
        builder.sel2.recorder = new builder.sel2.Recorder(window.bridge.getRecordingWindow(), builder.sel2.recordStep);
      }
      isLoading = false;
    }
  };
  builder.storage.addChangeListener('pageloading', builder.sel2.pageLoadListener);
};

builder.sel2.startRecording = function(urlText, useCurrentScript) {
  builder.storage.set('selMajorVersion', "2");
  var anchorIndex = urlText.indexOf('#');
  if (anchorIndex != -1) {
    urlText = urlText.substring(0, anchorIndex);
  }
  var url = new builder.Url(urlText);

  if (!url.hostname()) {
    alert("The URL is not valid and cannot be loaded.");
    jQuery("#startup-url").focus();
    return;
  }
  // Delete cookies for given URL.
  deleteURLCookies(url.href());
  builder.storage.set('save_required', true);
  builder.storage.set('baseurl', url.server());

  // Now load the page - both to ensure we're on the right page when we start recording
  // and to ensure that we get a clean page free of cookie influence.
  // Don't show the record interface until the new page has loaded.
  var isLoading = false;
  builder.sel2.pageLoadListener = function(pageloading) {
    if (pageloading) {
      isLoading = true;
      jQuery('#heading-record').addClass('is-on');
    } else {
      jQuery('#heading-record').removeClass('is-on');
      if (isLoading) {
        builder.sel2.recording = true;    
        builder.gui.switchView(builder.views.script);
        if (!useCurrentScript) {
          builder.setCurrentScript(new builder.sel2.Sel2Script());
        }
        builder.getCurrentScript().addStep(new builder.sel2.Sel2Step("get", url.href()));
        builder.sel2.updateStepsDisplay();
        builder.storage.removeChangeListener('pageloading', builder.sel2.pageLoadListener);
        builder.sel2.continueRecording();
      }
      isLoading = false;
    }
  };
  builder.storage.addChangeListener('pageloading', builder.sel2.pageLoadListener);
  window.bridge.getRecordingWindow().location = url.href();
};