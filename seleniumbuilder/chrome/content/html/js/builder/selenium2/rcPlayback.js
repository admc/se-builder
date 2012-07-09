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
/** What interval to check waits for. */
builder.selenium2.rcPlayback.waitIntervalAmount = 3000;
/** How many wait cycles are run before waits time out. */
builder.selenium2.rcPlayback.maxWaitCycles = 45000 / builder.selenium2.rcPlayback.waitIntervalAmount;
/** How many wait cycles have been run. */
builder.selenium2.rcPlayback.waitCycle = 0;
/** The wait interval. */
builder.selenium2.rcPlayback.waitInterval = null;

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
  builder.selenium2.rcPlayback.send("POST", "/timeouts/implicit_wait", JSON.stringify({'ms':60000}), function(response) {
    builder.selenium2.rcPlayback.playNextStep();
  });
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

builder.selenium2.rcPlayback.shutdown = function() {
  // Finish session.
  builder.selenium2.rcPlayback.send("DELETE", "", "", function() {
    jQuery('#edit-rc-playing').hide();
    jQuery('#edit-rc-stopping').hide();
    if (builder.selenium2.rcPlayback.postRunCallback) {
      builder.selenium2.rcPlayback.postRunCallback(builder.selenium2.rcPlayback.playResult);
    }
  }, function() {
    jQuery('#edit-rc-playing').hide();
    jQuery('#edit-rc-stopping').hide();
    if (builder.selenium2.rcPlayback.postRunCallback) {
      builder.selenium2.rcPlayback.postRunCallback(builder.selenium2.rcPlayback.playResult);
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
  builder.selenium2.rcPlayback.recordError(err);
};

builder.selenium2.rcPlayback.recordError = function(err) {
  if (builder.selenium2.rcPlayback.currentStepIndex === -1) {
    // If we can't connect to the server right at the start, just attach the error message to the
    // first step.
    builder.selenium2.rcPlayback.currentStepIndex = 0;
  }
  jQuery("#" + builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex].id + '-content').css('background-color', '#ff3333');
  jQuery("#" + builder.selenium2.rcPlayback.script.steps[builder.selenium2.rcPlayback.currentStepIndex].id + "-error").html(err).show();
  builder.selenium2.rcPlayback.playResult.success = false;
  builder.selenium2.rcPlayback.playResult.errormessage = err;
  
  builder.selenium2.rcPlayback.shutdown();
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

builder.selenium2.rcPlayback.findElements = function(locator, callback, errorCallback) {
  builder.selenium2.rcPlayback.send("POST", "/elements", JSON.stringify(locator),
    function(response) {
      if (builder.selenium2.rcPlayback.hasError(response)) {
        if (errorCallback) {
          errorCallback(response);
        } else {
          builder.selenium2.rcPlayback.handleError(response);
        }
      } else {
        if (callback) {
          var elids = [];
          for (var i = 0; i < response.value.length; i++) {
            elids.push(response.value[i].ELEMENT);
          }
          callback(elids);
        } else {
          builder.selenium2.rcPlayback.recordResult({success: true});
        }
      }
    }
  );
};

/** Repeatedly calls testFunction, allowing it to tell us if it was successful. */
builder.selenium2.rcPlayback.wait = function(testFunction) {
  builder.stepdisplay.setProgressBar(builder.selenium2.rcPlayback.currentStep.id, 0);
  builder.selenium2.rcPlayback.waitCycle = 0;
  builder.selenium2.rcPlayback.waitInterval = window.setInterval(function() {
    testFunction(function(success) {
      if (success != builder.selenium2.rcPlayback.currentStep.negated) {
        window.clearInterval(builder.selenium2.rcPlayback.waitInterval);
        builder.stepdisplay.hideProgressBar(builder.selenium2.rcPlayback.currentStep.id);
        builder.selenium2.rcPlayback.recordResult({'success': success});
        return;
      }
      if (builder.selenium2.rcPlayback.waitCycle++ >= builder.selenium2.rcPlayback.maxWaitCycles) {
        window.clearInterval(builder.selenium2.rcPlayback.waitInterval);
        builder.stepdisplay.hideProgressBar(builder.selenium2.rcPlayback.currentStep.id);
        builder.selenium2.rcPlayback.recordError("Wait timed out.");
        return;
      }
      if (builder.selenium2.rcPlayback.stopRequest) {
        window.clearInterval(builder.selenium2.rcPlayback.waitInterval);
        builder.stepdisplay.hideProgressBar(builder.selenium2.rcPlayback.currentStep.id);
        builder.selenium2.rcPlayback.shutdown();
        return;
      }
      builder.stepdisplay.setProgressBar(builder.selenium2.rcPlayback.currentStep.id, builder.selenium2.rcPlayback.waitCycle * 100 / builder.selenium2.rcPlayback.maxWaitCycles);
    });
  }, builder.selenium2.rcPlayback.waitIntervalAmount);
};

builder.selenium2.rcPlayback.types = {};

builder.selenium2.rcPlayback.types.print = function(step) {
  builder.selenium2.rcPlayback.print(builder.selenium2.rcPlayback.param("text"));
  builder.selenium2.rcPlayback.recordResult({success: true});
};

builder.selenium2.rcPlayback.types.store = function(step) {
  builder.selenium2.rcPlayback.vars[builder.selenium2.rcPlayback.param("variable")] = builder.selenium2.rcPlayback.param("text");
  builder.selenium2.rcPlayback.recordResult({success: true});
};

builder.selenium2.rcPlayback.types.get = function(step) {
  builder.selenium2.rcPlayback.send("POST", "/url", JSON.stringify({'url': step.url}));
};

builder.selenium2.rcPlayback.types.goBack = function(step) {
  builder.selenium2.rcPlayback.send("POST", "/back", "");
};

builder.selenium2.rcPlayback.types.goForward = function(step) {
  builder.selenium2.rcPlayback.send("POST", "/forward", "");
};

builder.selenium2.rcPlayback.types.refresh = function(step) {
  builder.selenium2.rcPlayback.send("POST", "/refresh", "");
};

builder.selenium2.rcPlayback.types.clickElement = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "");
  });
};

builder.selenium2.rcPlayback.types.doubleClickElement = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "", function(response) {
      builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "");
    });
  });
};

builder.selenium2.rcPlayback.types.submitElement = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/submit", "");
  });
};

builder.selenium2.rcPlayback.types.setElementText = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "", function(response) {
      builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/clear", "", function(response) {
        builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/value", JSON.stringify({
          'value': [builder.selenium2.rcPlayback.param("text")]
        }));
      });
    });
  });
};

builder.selenium2.rcPlayback.types.sendKeysToElement = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "", function(response) {
      builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/value", JSON.stringify({
        'value': [builder.selenium2.rcPlayback.param("text")]
      }));
    });
  });
};

builder.selenium2.rcPlayback.types.setElementSelected = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/selected", "", function(response) {
      if (response.value) {
        builder.selenium2.rcPlayback.recordResult({success: true});
      } else {
        builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "");
      }
    });
  });
};

builder.selenium2.rcPlayback.types.setElementNotSelected = function(step) {
  builder.selenium2.rcPlayback.findElement(builder.selenium2.rcPlayback.param("locator"), function(id) {
    builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/selected", "", function(response) {
      if (!response.value) {
        builder.selenium2.rcPlayback.recordResult({success: true});
      } else {
        builder.selenium2.rcPlayback.send("POST", "/element/" + id + "/click", "");
      }
    });
  });
};

builder.selenium2.rcPlayback.types.clearElements = function(step) {
  builder.selenium2.rcPlayback.findElements(builder.selenium2.rcPlayback.param("locator"), function(ids) {
    for (var i = 0; i < ids.length; i++) {
      builder.selenium2.rcPlayback.send("GET", "/element/" + ids[i] + "/selected", "", function(response) {
        if (response.value) {
          builder.selenium2.rcPlayback.send("POST", "/element/" + ids[i] + "/click", "", function(r){});
        }
      });
      builder.selenium2.rcPlayback.recordResult({success: true}); // qqDPS Reporting success before completion!
    }
  });
};

builder.selenium2.rcPlayback.types.verifyTextPresent = function(step) {
  builder.selenium2.rcPlayback.findElement({'using': 'tag name', 'value': 'body'}, function(id) {
    builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/text", "", function(response) {
      if (response.value.indexOf(builder.selenium2.rcPlayback.param("text")) != -1) {
        builder.selenium2.rcPlayback.recordResult({success: true});
      } else {
        builder.selenium2.rcPlayback.recordResult({success: false, message: "Text not present."});
      }
    });
  });
};

builder.selenium2.rcPlayback.types.assertTextPresent = function(step) {
  builder.selenium2.rcPlayback.findElement({'using': 'tag name', 'value': 'body'}, function(id) {
    builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/text", "", function(response) {
      if (response.value.indexOf(builder.selenium2.rcPlayback.param("text")) != -1) {
        builder.selenium2.rcPlayback.recordResult({success: true});
      } else {
        builder.selenium2.rcPlayback.recordError("Text not present.");
      }
    });
  });
};

builder.selenium2.rcPlayback.types.waitForTextPresent = function(step) {
  builder.selenium2.rcPlayback.wait(function(callback) {
    builder.selenium2.rcPlayback.findElement({'using': 'tag name', 'value': 'body'}, function(id) {
      builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/text", "", function(response) {
        callback(response.value.indexOf(builder.selenium2.rcPlayback.param("text")) != -1);
      }, /*error*/ function() { callback(false); });
    }, /*error*/ function() { callback(false); });
  });
};

builder.selenium2.rcPlayback.types.storeTextPresent = function(step) {
  builder.selenium2.rcPlayback.findElement({'using': 'tag name', 'value': 'body'}, function(id) {
    builder.selenium2.rcPlayback.send("GET", "/element/" + id + "/text", "", function(response) {
      builder.selenium2.rcPlayback.vars[builder.selenium2.rcPlayback.param("variable")] = response.value.indexOf(builder.selenium2.rcPlayback.param("text")) != -1;
      builder.selenium2.rcPlayback.recordResult({success: true});
    });
  });
};