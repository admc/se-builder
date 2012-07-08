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
builder.selenium2.rcPlayback.currentStep = null;
builder.selenium2.rcPlayback.script = null;
builder.selenium2.rcPlayback.requestStop = false;
builder.selenium2.rcPlayback.playResult = null;
builder.selenium2.rcPlayback.vars = {};

builder.selenium2.rcPlayback.run = function(hostPort, browserstring, postRunCallback) {
  jQuery('#steps-top')[0].scrollIntoView(false);
  jQuery('#edit-rc-playing').show();
  jQuery('#edit-rc-stopping').hide();
  builder.selenium2.rcPlayback.requestStop = false;
  builder.selenium2.rcPlayback.playResult = { success: false };
  builder.selenium2.rcPlayback.hostPort = hostPort;
  builder.selenium2.rcPlayback.browserstring = browserstring;
  builder.selenium2.rcPlayback.currentStepIndex = -1;
  builder.selenium2.rcPlayback.currentStep = null;
  builder.selenium2.rcPlayback.script = builder.getScript();
  builder.selenium2.rcPlayback.vars = {};
  builder.views.script.clearResults();
  jQuery('#edit-clearresults-span').show();
  builder.selenium2.rcPlayback.sessionID = null;
  builder.selenium2.rcPlayback.send(
    "POST",
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

builder.selenium2.rcPlayback.parseServerResponse = function(t) {
  t = builder.selenium2.rcPlayback.fixServerResponse(t);
  if (t.length == 0) {
    return {};
  } else {
    // The response may be some JSON, or it may also be a HTML page.
    try {
      return JSON.parse(t);
    } catch (e) {
      return {};
    }
  }
};

builder.selenium2.rcPlayback.startJob = function(response) {
  builder.selenium2.rcPlayback.sessionID = response.sessionId;
  builder.selenium2.rcPlayback.playResult.success = true;
  builder.selenium2.rcPlayback.playNextStep();
};

builder.selenium2.rcPlayback.playNextStep = function() {
  builder.selenium2.rcPlayback.currentStepIndex++;
  if (!builder.selenium2.rcPlayback.requestStop &&
    builder.selenium2.rcPlayback.currentStepIndex < builder.selenium2.rcPlayback.script.steps.length)
  {
    builder.selenium2.rcPlayback.currentStep = builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex];
    jQuery('#' + builder.selenium2.rcPlayback.currentStep.id + '-content').css('background-color', '#ffffaa');
   builder.selenium2.rcPlayback.types[builder.selenium2.rcPlayback.currentStep.type.getName()](builder.selenium2.rcPlayback.currentStep);
  } else {
    builder.selenium2.rcPlayback.shutdown();
  }
};

builder.selenium2.rcPlayback.shutdown = function(fireAndForget) {
  // Finish session.
  builder.selenium2.rcPlayback.send("DELETE", "", "", function() {
    if (!fireAndForget) {
      jQuery('#edit-rc-playing').hide();
      jQuery('#edit-rc-stopping').hide();
      if (builder.selenium2.rcPlayback.postRunCallback) {
        builder.selenium2.rcPlayback.postRunCallback(builder.selenium2.rcPlayback.playResult);
      }
    }
  });
};

builder.selenium2.rcPlayback.stopTest = function() {
  builder.selenium2.rcPlayback.requestStop = true;
  jQuery('#edit-rc-playing').hide();
  jQuery('#edit-rc-stopping').show();
};

builder.selenium2.rcPlayback.hasError = function(response) {
  return !!response.status; // So undefined and 0 are fine.
};

builder.selenium2.rcPlayback.handleError = function(response) {
  var err = "Server Error";
  if (response.value && response.value.message) {
    err += ": " + response.value.message;
  }
  if (builder.selenium2.rcPlayback.currentStepIndex === -1) {
    // If we can't connect to the server right at the start, just attach the error message to the
    // first step.
    builder.selenium2.rcPlayback.currentStepIndex = 0;
  }
  jQuery("#" + builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex].id + '-content').css('background-color', '#ff3333');
  jQuery("#" + builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex].id + "-error").html(err).show();
  builder.selenium2.rcPlayback.playResult.success = false;
  builder.selenium2.rcPlayback.playResult.errormessage = err;
  
  builder.selenium2.rcPlayback.shutdown(/*fireAndForget*/true);
  
  jQuery('#edit-rc-playing').hide();
  jQuery('#edit-rc-stopping').hide();
  if (builder.selenium2.rcPlayback.postRunCallback) {
    builder.selenium2.rcPlayback.postRunCallback(builder.selenium2.rcPlayback.playResult);
  }
};

builder.selenium2.rcPlayback.send = function(http_method, path, msg, callback, errorCallback) {
  var url = null;
  if (builder.selenium2.rcPlayback.sessionID) {
    url = "http://" + builder.selenium2.rcPlayback.hostPort + "/wd/hub/session/" + builder.selenium2.rcPlayback.sessionID + path;
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
    type: http_method || "POST",
    url: url,
    data: msg,
    success: function(t) {
      if (callback) {
        callback(builder.selenium2.rcPlayback.parseServerResponse(t));
      } else {
        builder.selenium2.rcPlayback.recordResult({'success': true});
      }
    },
    error: function(xhr, textStatus, errorThrown) {
      var response = builder.selenium2.rcPlayback.parseServerResponse(xhr.responseText);
      if (errorCallback) {
        errorCallback(response);
      } else {
        builder.selenium2.rcPlayback.handleError(response);
      }
    }
  });
};

/** Performs ${variable} substitution for parameters. */
builder.selenium2.rcPlayback.param = function(pName) {
  var output = "";
  var hasDollar = false;
  var insideVar = false;
  var varName = "";
  var text = builder.selenium2.rcPlayback.currentStep.type.getParamType(pName) == "locator" ? builder.selenium2.rcPlayback.currentStep[pName].getValue() : builder.selenium2.rcPlayback.currentStep[pName];
  for (var i = 0; i < text.length; i++) {
    var ch = text.substring(i, i + 1);
    if (insideVar) {
      if (ch == "}") {
        if (builder.selenium2.rcPlayback.vars[varName] == undefined) {
          throw "Variable not set: " + varName + ".";
        }
        output += builder.selenium2.rcPlayback.vars[varName];
        insideVar = false;
        hasDollar = false;
        varName = "";
      } else {
        varName += ch;
      }
    } else {
      // !insideVar
      if (hasDollar) {
        if (ch == "{") { insideVar = true; } else { hasDollar = false; output += "$" + ch; }
      } else {
        if (ch == "$") { hasDollar = true; } else { output += ch; }
      }
    }
  }

  return builder.selenium2.rcPlayback.currentStep.type.getParamType(pName) == "locator" ? {"using": builder.selenium2.rcPlayback.currentStep[pName].getName(builder.selenium2), "value": output} : output;
};

builder.selenium2.rcPlayback.print = function(text) {
  jQuery('#' + builder.selenium2.rcPlayback.currentStep.id + '-message').show().append(newNode('span', text));
};

builder.selenium2.rcPlayback.recordResult = function(result) {
  if (builder.selenium2.rcPlayback.currentStep.negated) {
    result.message = builder.selenium2.rcPlayback.currentStep.type.getName() + " is " + result.success;
    result.success = !result.success;
  }
  if (result.success) {
    jQuery('#' + builder.selenium2.rcPlayback.currentStep.id + '-content').css('background-color', '#bfee85');
  } else {
    jQuery('#' + builder.selenium2.rcPlayback.currentStep.id + '-content').css('background-color', '#ffcccc');
    builder.selenium2.rcPlayback.playResult.success = false;
    if (result.message) {
      jQuery('#' + builder.selenium2.rcPlayback.currentStep.id + '-message').html(result.message).show();
      builder.selenium2.rcPlayback.playResult.errormessage = result.message;
    }
  }

  builder.selenium2.rcPlayback.playNextStep();
};

builder.selenium2.rcPlayback.types = {};

builder.selenium2.rcPlayback.findElement = function(locator, callback, errorCallback) {
  builder.selenium2.rcPlayback.send("POST", "/element", JSON.stringify(locator),
    function(response) {
      if (builder.selenium2.rcPlayback.hasError(response)) {
        if (errorCallback) {
          errorCallback(response);
        } else {
          builder.selenium2.rcPlayback.handleError(response);
        }
      } else {
        if (callback) {
          callback(response.value.ELEMENT);
        } else {
          builder.selenium2.rcPlayback.recordResult({success: true});
        }
      }
    }
  );
};

builder.selenium2.rcPlayback.types.get = function(step) {
  builder.selenium2.rcPlayback.send("POST", "/url", JSON.stringify({'url': step.url}));
};

builder.selenium2.rcPlayback.types.verifyTextPresent = function(step) {
  builder.selenium2.rcPlayback.findElement({'using': 'tag name', 'value': 'body'},
    /* success */
    function(id) {
      builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/text", "",
        /* success */
        function(response) {
          if (response.value.indexOf(builder.selenium2.rcPlayback.param("text")) != -1) {
            builder.selenium2.rcPlayback.recordResult({success: true});
          } else {
            builder.selenium2.rcPlayback.recordResult({success: false, message: "Text not present."});
          }
        }
      );
    }
  );
};