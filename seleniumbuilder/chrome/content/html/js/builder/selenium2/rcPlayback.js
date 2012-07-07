/** Playback system for remote webdriver. */
builder.selenium2.rcPlayback = {};

builder.selenium2.rcPlayback.getHostPort = function() {
  return bridge.prefManager.getCharPref("extensions.seleniumbuilder.remote.hostport");
};

builder.selenium2.rcPlayback.setHostPort = function(hostPort) {
  bridge.prefManager.setCharPref("extensions.seleniumbuilder.remote.hostport", hostPort);
};

builder.selenium2.rcPlayback.getBrowserString = function() {
  return bridge.prefManager.getCharPref("extensions.seleniumbuilder.remote.browserstring");
};

builder.selenium2.rcPlayback.setBrowserString = function(browserstring) {
  bridge.prefManager.setCharPref("extensions.seleniumbuilder.remote.browserstring", browserstring);
};

builder.selenium2.rcPlayback.hostPort = null;
builder.selenium2.rcPlayback.browserstring = null;
builder.selenium2.rcPlayback.sessionID = null;
builder.selenium2.rcPlayback.currentStepIndex = -1;
builder.selenium2.rcPlayback.script = null;

builder.selenium2.rcPlayback.run = function(hostPort, browserstring, postRunCallback) {
  jQuery('#steps-top')[0].scrollIntoView(false);
  jQuery('#edit-editing').hide();
  jQuery('#edit-rc-playing').show();
  jQuery('#edit-rc-stopping').hide();
  builder.selenium2.rcPlayback.requestStop = false;
  builder.selenium2.rcPlayback.result = { success: false };
  builder.selenium2.rcPlayback.hostPort = hostPort;
  builder.selenium2.rcPlayback.browserstring = browserstring;
  builder.selenium2.rcPlayback.currentStepIndex = -1;
  builder.selenium2.rcPlayback.script = builder.getScript();
  builder.views.script.clearResults();
  jQuery('#edit-clearresults-span').show();
  builder.selenium2.rcPlayback.sessionID = null;
  builder.selenium2.rcPlayback.post(
    "",
    JSON.stringify({"desiredCapabilities":{"platform":"ANY","browserName":"firefox","version":""}}), // qqDPS
    builder.selenium2.rcPlayback.startJob);
};

/**
 * Selenium server appends a series of null characters to its JSON responses - here we cut 'em off.
 */
builder.selenium2.rcPlayback.fixServerResponse = function(t) {
  var i = 0;
  for (; i < t.length; i++) {
    if (t.charCodeAt(i) == 0) {
      break;
    }
  }
  
  return t.substring(0, i);
};

builder.selenium2.rcPlayback.startJob = function(responseText) {
  var response = JSON.parse(responseText + "");
  alert(JSON.stringify(response));
  builder.selenium2.rcPlayback.result.success = true;
  //builder.selenium2.rcPlayback.playNextStep(null);
};

builder.selenium2.rcPlayback.post = function(path, msg, callback) {
  var url = null;
  if (builder.selenium2.rcPlayback.sessionID) {
    url = "http://" + builder.selenium2.rcPlayback.hostPort + "/wd/hub/session/" + builder.selenium2.rcPlayback.sessionID + "/" + path;
  } else {
    url = "http://" + builder.selenium2.rcPlayback.hostPort + "/wd/hub/session";
  }
  jQuery.ajax({
    // Because the server appends null characters to its output, we want to disable automatic
    // JSON parsing in jQuery.
    dataType: "html",
    // But because the server crashes if we don't accept application/json, we explicitly set it to.
    headers: { 
      "Accept" : "application/json, image/png",
      "Content-Type": "text/plain; charset=utf-8"
    },
    type: "POST",
    url: url,
    data: msg,
    // Automatically chop off the null characters from the response.
    success: function(t) { callback(builder.selenium2.rcPlayback.fixServerResponse(t)); },
    error: builder.selenium2.rcPlayback.xhrfailed
  });
};

builder.selenium2.rcPlayback.xhrfailed = function(xhr, textStatus, errorThrown) {
  var err = "Server connection error: " + errorThrown;
  if (builder.selenium2.rcPlayback.currentStepIndex === -1) {
    // If we can't connect to the server right at the start, just attach the error message to the
    // first step.
    builder.selenium2.rcPlayback.currentStepIndex = 0;
  }
  jQuery("#" + builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex].id + '-content').css('background-color', '#ff3333');
  jQuery("#" + builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex].id + "-error").html(err).show();
  builder.selenium2.rcPlayback.result.success = false;
  builder.selenium2.rcPlayback.result.errormessage = err;
  jQuery('#edit-editing').show();
  jQuery('#edit-rc-playing').hide();
  jQuery('#edit-rc-stopping').hide();
  
  if (builder.selenium2.rcPlayback.postRunCallback) {
    builder.selenium2.rcPlayback.postRunCallback(builder.selenium2.rcPlayback.result);
  }
};