/**
 * Code for playing back Selenium 2 scripts locally.
*/

builder.selenium2.playback = {};

/** The WebDriver session ID. */
builder.selenium2.playback.sessionId = null;
/** The CommandProcessor used to talk to WebDriver with. */
builder.selenium2.playback.commandProcessor = null;
/** The script being played back. */
builder.selenium2.playback.script = null;
/** The step being played back. */
builder.selenium2.playback.currentStep = null;
/** The step after which playback should stop. */
builder.selenium2.playback.finalStep = null;
/** The function to call with a result object after the run has concluded one way or another. */
builder.selenium2.playback.postPlayCallback = null;
/** The result object returned at the end of the run. */
builder.selenium2.playback.playResult = null;
/** Whether the user has requested test stoppage. */
builder.selenium2.playback.stopRequest = false;
/** What interval to check waits for. */
builder.selenium2.playback.waitIntervalAmount = 300;
/** How many wait cycles are run before waits time out. */
builder.selenium2.playback.maxWaitCycles = 60000 / builder.selenium2.playback.waitIntervalAmount;
/** How many wait cycles have been run. */
builder.selenium2.playback.waitCycle = 0;
/** The wait interval. */
builder.selenium2.playback.waitInterval = null;
/** Stored variables. */
builder.selenium2.playback.vars = {};
/** What interval to check implicit waits for. */
builder.selenium2.playback.implicitWaitTimeoutAmount = 300;
/** How many implicit wait cycles are run before waits time out. */
builder.selenium2.playback.maxImplicitWaitCycles = 60000 / builder.selenium2.playback.implicitWaitTimeoutAmount;
/** How many implicit wait cycles have been run. */
builder.selenium2.playback.implicitWaitCycle = 0;
/** The implicit wait timeout. */
builder.selenium2.playback.implicitWaitTimeout = null;

builder.selenium2.playback.stopTest = function() {
  builder.selenium2.playback.stopRequest = true;
};

builder.selenium2.playback.runTest = function(postPlayCallback) {
  builder.selenium2.playback.vars = {};
  builder.selenium2.playback.runTestBetween(
    postPlayCallback,
    builder.getScript().steps[0].id,
    builder.getScript().steps[builder.getScript().steps.length - 1].id
  );
};

builder.selenium2.playback.runTestBetween = function(postPlayCallback, startStepID, endStepID) {
  builder.selenium2.playback.script = builder.getScript();
  builder.selenium2.playback.postPlayCallback = postPlayCallback;
  builder.selenium2.playback.currentStep = builder.selenium2.playback.script.getStepWithID(startStepID);
  builder.selenium2.playback.finalStep = builder.selenium2.playback.script.getStepWithID(endStepID);
  builder.selenium2.playback.playResult = {success: true};
  builder.selenium2.playback.startSession();
};

builder.selenium2.playback.startSession = function() {
  builder.views.script.clearResults();
  builder.selenium2.playback.stopRequest = false;
  jQuery('#edit-clearresults-span').show();
  jQuery('#edit-local-playing').show();
  jQuery('#edit-stop-local-playback').show();

  // Set up Webdriver
  var handle = Components.classes["@googlecode.com/webdriver/fxdriver;1"].createInstance(Components.interfaces.nsISupports);
  var server = handle.wrappedJSObject;
  var driver = server.newDriver(window.bridge.getRecordingWindow());
  var iface = Components.classes['@googlecode.com/webdriver/command-processor;1'];
  builder.selenium2.playback.commandProcessor = iface.getService(Components.interfaces.nsICommandProcessor);
  // In order to communicate to webdriver which window we want, we need to uniquely identify the
  // window. The best way to do this I've found is to look for it by title. qqDPS
  var title_identifier = "--" + new Date().getTime();
  window.bridge.getRecordingWindow().document.title += title_identifier;

  setTimeout(function() {
    var newSessionCommand = {
      'name': 'newSession',
      'context': '',
      'parameters': {
        'title_identifier': title_identifier
      }
    };
    builder.selenium2.playback.commandProcessor.execute(JSON.stringify(newSessionCommand), function(result) {
      builder.selenium2.playback.sessionId = JSON.parse(result).value;
      builder.selenium2.playback.playStep();
    });
  }, 100);
};

builder.selenium2.playback.wait = function(testFunction) {
  builder.stepdisplay.setProgressBar(builder.selenium2.playback.currentStep.id, 0);
  builder.selenium2.playback.waitCycle = 0;
  builder.selenium2.playback.waitInterval = window.setInterval(function() {
    testFunction(function(success) {
      if (success != builder.selenium2.playback.currentStep.negated) {
        window.clearInterval(builder.selenium2.playback.waitInterval);
        builder.stepdisplay.hideProgressBar(builder.selenium2.playback.currentStep.id);
        builder.selenium2.playback.recordResult({'success': success});
        return;
      }
      if (builder.selenium2.playback.waitCycle++ >= builder.selenium2.playback.maxWaitCycles) {
        window.clearInterval(builder.selenium2.playback.waitInterval);
        builder.stepdisplay.hideProgressBar(builder.selenium2.playback.currentStep.id);
        builder.selenium2.playback.recordError("Wait timed out.");
        return;
      }
      if (builder.selenium2.playback.stopRequest) {
        window.clearInterval(builder.selenium2.playback.waitInterval);
        builder.stepdisplay.hideProgressBar(builder.selenium2.playback.currentStep.id);
        builder.selenium2.playback.shutdown();
        return;
      }
      builder.stepdisplay.setProgressBar(builder.selenium2.playback.currentStep.id, builder.selenium2.playback.waitCycle * 100 / builder.selenium2.playback.maxWaitCycles);
    });
  }, builder.selenium2.playback.waitIntervalAmount);
};

builder.selenium2.playback.findElement = function(locator, callback, errorCallback) {
  builder.selenium2.playback.implicitWaitCycle = 0;
  builder.selenium2.playback.continueFindingElement(locator, callback, errorCallback);
};

// This implements implicit waits by repeatedly calling itself to set a new timeout.
builder.selenium2.playback.continueFindingElement = function(locator, callback, errorCallback) {
  builder.selenium2.playback.implicitWaitTimeout = window.setInterval(function() {
    builder.selenium2.playback.execute('findElement', {using: locator.type, value: locator.value},
      /* callback */
      callback
      ,
      /* errorCallback */
      function(e) {
        if (builder.selenium2.playback.implicitWaitCycle++ >= builder.selenium2.playback.maxImplicitWaitCycles) {
          errorCallback(e);
        } else {
          builder.selenium2.playback.continueFindingElement(locator, callback, errorCallback);
        }
      }
    );
  }, builder.selenium2.playback.implicitWaitCycle == 0 ? 1 : builder.selenium2.playback.implicitWaitIntervalAmount);
};

builder.selenium2.playback.execute = function(name, parameters, callback, errorCallback) {
  var cmd = {
    'name': name,
    'context': '',
    'parameters': parameters,
    'sessionId': {"value": builder.selenium2.playback.sessionId}
  };
  builder.selenium2.playback.commandProcessor.execute(JSON.stringify(cmd), function(result) {
    result = JSON.parse(result);
    if (result.status != 0) {
      if (errorCallback) {
        errorCallback(result);
      } else {
        builder.selenium2.playback.recordError(result.value.message);
      }
    } else {
      if (callback) {
        callback(result);
      } else {
        builder.selenium2.playback.recordResult({success: true});
      }
    }
  });
};

builder.selenium2.playback.clearElement = function(target) {
  builder.selenium2.playback.execute('isElementSelected', {id: target}, function(result) {
    if (result.value) {
      builder.selenium2.playback.execute('clickElement', {id: target});
    }
  });
};

/** Performs ${variable} substitution for parameters. */
builder.selenium2.playback.param = function(pName) {
  var output = "";
  var hasDollar = false;
  var insideVar = false;
  var varName = "";
  var text = builder.selenium2.playback.currentStep.type.getParamType(pName) == "locator"
    ? builder.selenium2.playback.currentStep[pName].getValue() : builder.selenium2.playback.currentStep[pName];
  //pName.startsWith("locator") ? builder.selenium2.playback.currentStep[pName].value : builder.selenium2.playback.currentStep[pName];
  for (var i = 0; i < text.length; i++) {
    var ch = text.substring(i, i + 1);
    if (insideVar) {
      if (ch == "}") {
        if (builder.selenium2.playback.vars[varName] == undefined) {
          throw "Variable not set: " + varName + ".";
        }
        output += builder.selenium2.playback.vars[varName];
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

  //return pName.startsWith("locator") ? {"type": builder.selenium2.playback.currentStep[pName].type, "value": output} : output;
  return builder.selenium2.playback.currentStep.type.getParamType(pName) == "locator"
    ? {"type": builder.selenium2.playback.currentStep[pName].getName(builder.selenium2), "value": output} : output;
};

builder.selenium2.playback.canPlayback = function(stepType) {
  return !!builder.selenium2.playback.playbackFunctions[stepType.getName()];
};

builder.selenium2.playback.playbackFunctions = {
  "print": function() {
    builder.selenium2.playback.print(builder.selenium2.playback.param("text"));
    builder.selenium2.playback.recordResult({success: true});
  },
  "store": function() {
    builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = builder.selenium2.playback.param("text");
    builder.selenium2.playback.recordResult({success: true});
  },
  "get": function() {
    builder.selenium2.playback.execute('get', {url: builder.selenium2.playback.param("url")});
  },
  "goBack": function() {
    builder.selenium2.playback.execute('goBack', {});
  },
  "goForward": function() {
    builder.selenium2.playback.execute('goForward', {});
  },
  "clickElement": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('clickElement', {id: result.value.ELEMENT});
    });
  },
  "doubleClickElement": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('clickElement', {id: result.value.ELEMENT});
      builder.selenium2.playback.execute('clickElement', {id: result.value.ELEMENT});
    });
  },
  "submitElement": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('submitElement', {id: result.value.ELEMENT});
    });
  },
  "sendKeysToElement": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('sendKeysToElement', {id: result.value.ELEMENT, value: builder.selenium2.playback.param("text").split("")});
    });
  },
  "setElementSelected": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      var target = result.value.ELEMENT;
      builder.selenium2.playback.execute('isElementSelected', {id: target}, function(result) {
        if (!result.value) {
          builder.selenium2.playback.execute('clickElement', {id: target});
        } else {
          builder.selenium2.playback.recordResult({success: true});
        }
      });
    });
  },
  "setElementNotSelected": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      var target = result.value.ELEMENT;
      builder.selenium2.playback.execute('isElementSelected', {id: target}, function(result) {
        if (result.value) {
          builder.selenium2.playback.execute('clickElement', {id: target});
        } else {
          builder.selenium2.playback.recordResult({success: true});
        }
      });
    });
  },
  "clearSelections": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      var target = result.value.ELEMENT;
      builder.selenium2.playback.execute('findChildElements', {id: target, using: "tag name", value: "option"}, function(result) {
        for (var i = 0; i < result.value.length; i++) {
          builder.selenium2.playback.clearElement(result.value[i].ELEMENT);
        }
        builder.selenium2.playback.recordResult({success: true});
      });
    });
  },
  "refresh": function() {
    builder.selenium2.playback.execute('refresh', {});
  },
  "verifyTextPresent": function() {
    builder.selenium2.playback.execute('getPageSource', {}, function(result) {
      if (result.value.indexOf(builder.selenium2.playback.param("text")) != -1) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordResult({success: false, message: "Text not present."});
      }
    });
  },
  "assertTextPresent": function() {
    builder.selenium2.playback.execute('getPageSource', {}, function(result) {
      if (result.value.indexOf(builder.selenium2.playback.param("text")) != -1) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordError("Text not present.");
      }
    });
  },
  "waitForTextPresent": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.execute('getPageSource', {}, function(result) {
        callback(result.value.indexOf(builder.selenium2.playback.param("text")) != -1);
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeTextPresent": function() {
    builder.selenium2.playback.execute('getPageSource', {}, function(result) {
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value.indexOf(builder.selenium2.playback.param("text")) != -1;
      builder.selenium2.playback.recordResult({success: true});
    });
  },

  "verifyBodyText": function() {
    builder.selenium2.playback.findElement({type: 'tag name', value: 'body'}, function(result) {
      builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == builder.selenium2.playback.param("text")) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordResult({success: false, message: "Body text does not match."});
        }
      });
    });
  },
  "assertBodyText": function() {
    builder.selenium2.playback.findElement({type: 'tag name', value: 'body'}, function(result) {
      builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == builder.selenium2.playback.param("text")) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordError("Body text does not match.");
        }
      });
    });
  },
  "waitForBodyText": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.findElement({type: 'tag name', value: 'body'}, function(result) {
        builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
          callback(result.value == builder.selenium2.playback.param("text"));
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeBodyText": function() {
    builder.selenium2.playback.findElement({type: 'tag name', value: 'body'}, function(result) {
      builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
        builder.selenium2.playback.recordResult({success: true});
      });
    });
  },

  "verifyElementPresent": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), null, function(result) {
      builder.selenium2.playback.recordResult({success: false, message: "Element not found."});
    });
  },
  "assertElementPresent": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), null, function(result) {
      builder.selenium2.playback.recordError("Element not found.");
    });
  },
  "waitForElementPresent": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"),
        /*success*/ function(result) { callback(true);  },
        /*error  */ function(result) { callback(false); }
      );
    });
  },
  "storeElementPresent": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"),
    /*success*/
    function(result) {
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = true;
      builder.selenium2.playback.recordResult({success: true});
    },
    /*failure*/
    function(result) {
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = false;
      builder.selenium2.playback.recordResult({success: true});
    });
  },

  "verifyPageSource": function() {
    builder.selenium2.playback.execute('getPageSource', {}, function(result) {
      if (result.value == builder.selenium2.playback.param("source")) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordResult({success: false, message: "Source does not match."});
      }
    });
  },
  "assertPageSource": function() {
    builder.selenium2.playback.execute('getPageSource', {}, function(result) {
      if (result.value == builder.selenium2.playback.param("source")) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordError("Source does not match.");
      }
    });
  },
  "waitForPageSource": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.execute('getPageSource', {}, function(result) {
        callback(result.value == builder.selenium2.playback.param("source"));
      }, /*error*/ function() { callback(false); });
    });
  },
  "storePageSource": function() {
    builder.selenium2.playback.execute('getPageSource', {}, function(result) {
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
      builder.selenium2.playback.recordResult({success: true});
    });
  },

  "verifyText": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == builder.selenium2.playback.param("text")) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordResult({success: false, message: "Element text does not match."});
        }
      });
    });
  },
  "assertText": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == builder.selenium2.playback.param("text")) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordError("Element text does not match.");
        }
      });
    });
  },
  "waitForText": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
        builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
          callback(result.value == builder.selenium2.playback.param("text"));
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeText": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
        builder.selenium2.playback.recordResult({success: true});
      });
    });
  },

  "verifyCurrentUrl": function() {
    builder.selenium2.playback.execute('getCurrentUrl', {}, function(result) {
      if (result.value == builder.selenium2.playback.param("url")) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordResult({success: false, message: "URL does not match."});
      }
    });
  },
  "assertCurrentUrl": function() {
    builder.selenium2.playback.execute('getCurrentUrl', {}, function(result) {
      if (result.value == builder.selenium2.playback.param("url")) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordError("URL does not match.");
      }
    });
  },
  "waitForCurrentUrl": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.execute('getCurrentUrl', {}, function(result) {
        callback(result.value == builder.selenium2.playback.param("url"));
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeCurrentUrl": function() {
    builder.selenium2.playback.execute('getCurrentUrl', {}, function(result) {
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
      builder.selenium2.playback.recordResult({success: true});
    });
  },

  "verifyTitle": function() {
    builder.selenium2.playback.execute('getTitle', {}, function(result) {
      if (result.value == builder.selenium2.playback.param("title")) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordResult({success: false, message: "Title does not match."});
      }
    });
  },
  "assertTitle": function() {
    builder.selenium2.playback.execute('getTitle', {}, function(result) {
      if (result.value == builder.selenium2.playback.param("title")) {
        builder.selenium2.playback.recordResult({success: true});
      } else {
        builder.selenium2.playback.recordError("Title does not match.");
      }
    });
  },
  "waitForTitle": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.execute('getTitle', {}, function(result) {
        callback(result.value == builder.selenium2.playback.param("title"));
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeTitle": function() {
    builder.selenium2.playback.execute('getTitle', {}, function(result) {
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
      builder.selenium2.playback.recordResult({success: true});
    });
  },

  "verifyElementSelected": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
        if (result.value) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordResult({success: false, message: "Element not selected."});
        }
      });
    });
  },
  "assertElementSelected": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
        if (result.value) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordError("Element not selected.");
        }
      });
    });
  },
  "waitForElementSelected": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
        builder.selenium2.playback.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
          callback(result.value);
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeElementSelected": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
        builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
        builder.selenium2.playback.recordResult({success: true});
      });
    });
  },

  "verifyElementValue": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
        if (result.value == builder.selenium2.playback.currentStep.value) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordResult({success: false, message: "Element value does not match."});
        }
      });
    });
  },
  "assertElementValue": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
        if (result.value == builder.selenium2.playback.currentStep.value) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordError("Element value does not match.");
        }
      });
    });
  },
  "waitForElementValue": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
        builder.selenium2.playback.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
          callback(result.value == builder.selenium2.playback.currentStep.value);
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeElementValue": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
        builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
        builder.selenium2.playback.recordResult({success: true});
      });
    });
  },

  "verifyElementAttribute": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementAttribute', {id: result.value.ELEMENT, name: builder.selenium2.playback.param("attributeName") }, function(result) {
        if (result.value == builder.selenium2.playback.param("value")) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordResult({success: false, message: "Attribute value does not match."});
        }
      });
    });
  },
  "assertElementAttribute": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementAttribute', {id: result.value.ELEMENT, name: builder.selenium2.playback.param("attributeName") }, function(result) {
        if (result.value == builder.selenium2.playback.param("value")) {
          builder.selenium2.playback.recordResult({success: true});
        } else {
          builder.selenium2.playback.recordError("Attribute value does not match.");
        }
      });
    });
  },
  "waitForElementAttribute": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
        builder.selenium2.playback.execute('getElementAttribute', {id: result.value.ELEMENT, name: builder.selenium2.playback.param("attributeName") }, function(result) {
          callback(result.value == builder.selenium2.playback.param("value"));
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeElementAttribute": function() {
    builder.selenium2.playback.findElement(builder.selenium2.playback.param("locator"), function(result) {
      builder.selenium2.playback.execute('getElementAttribute', {id: result.value.ELEMENT, name: builder.selenium2.playback.param("attributeName") }, function(result) {
        builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value;
        builder.selenium2.playback.recordResult({success: true});
      });
    });
  },

  "deleteCookie": function() {
    builder.selenium2.playback.execute('deleteCookie', {"name": builder.selenium2.playback.param("name")});
  },

  "addCookie": function() {
    var params = {"cookie": {"name": builder.selenium2.playback.param("name"), "value": builder.selenium2.playback.param("value")}};
    var opts = builder.selenium2.playback.param("options").split(",");
    for (var i = 0; i < opts.length; i++) {
      var kv = opts[i].trim().split("=");
      if (kv.length == 1) { continue; }
      if (kv[0] == "path") {
        params.cookie.path = kv[1];
      }
      if (kv[0] == "max_age") {
        params.cookie.expiry = (new Date().getTime()) / 1000 + parseInt(kv[1]);
      }
    }
    builder.selenium2.playback.execute('addCookie', params);
  },

  "verifyCookieByName": function() {
    builder.selenium2.playback.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == builder.selenium2.playback.param("name")) {
          if (result.value[i].value == builder.selenium2.playback.param("value")) {
            builder.selenium2.playback.recordResult({success: true});
          } else {
            builder.selenium2.playback.recordResult({success: false, message: "Element value does not match."});
          }
          return;
        }
      }
      builder.selenium2.playback.recordResult({success: false, message: "No cookie found with this name."});
    });
  },
  "assertCookieByName": function() {
    builder.selenium2.playback.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == builder.selenium2.playback.param("name")) {
          if (result.value[i].value == builder.selenium2.playback.param("value")) {
            builder.selenium2.playback.recordResult({success: true});
          } else {
            builder.selenium2.playback.recordError("Element value does not match.");
          }
          return;
        }
      }
      builder.selenium2.playback.recordError("No cookie found with this name.");
    });
  },
  "waitForCookieByName": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.execute('getCookies', {}, function(result) {
        for (var i = 0; i < result.value.length; i++) {
          if (result.value[i].name == builder.selenium2.playback.param("name")) {
            callback(result.value[i].value == builder.selenium2.playback.param("value"));
            return;
          }
        }
        callback(false);
      },
      /*error*/ function() { callback(false); });
    });
  },
  "storeCookieByName": function() {
    builder.selenium2.playback.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == builder.selenium2.playback.param("name")) {
          builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = result.value[i].value;
          builder.selenium2.playback.recordResult({success: true});
          return;
        }
      }
      builder.selenium2.playback.recordError("No cookie found with this name.");
    });
  },

  "verifyCookiePresent": function() {
    builder.selenium2.playback.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == builder.selenium2.playback.param("name")) {
          builder.selenium2.playback.recordResult({success: true});
          return;
        }
      }
      builder.selenium2.playback.recordResult({success: false, message: "No cookie found with this name."});
    });
  },
  "assertCookiePresent": function() {
    builder.selenium2.playback.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == builder.selenium2.playback.param("name")) {
          builder.selenium2.playback.recordResult({success: true});
          return;
        }
      }
      builder.selenium2.playback.recordError("No cookie found with this name.");
    });
  },
  "waitForCookiePresent": function() {
    builder.selenium2.playback.wait(function(callback) {
      builder.selenium2.playback.execute('getCookies', {}, function(result) {
        for (var i = 0; i < result.value.length; i++) {
          if (result.value[i].name == builder.selenium2.playback.param("name")) {
            callback(true);
            return;
          }
        }
        callback(false);
      },
      /*error*/ function() { callback(false); });
    });
  },
  "storeCookiePresent": function() {
    builder.selenium2.playback.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == builder.selenium2.playback.param("name")) {
          builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = true;
          builder.selenium2.playback.recordResult({success: true});
          return;
        }
      }
      builder.selenium2.playback.vars[builder.selenium2.playback.param("variable")] = false;
      builder.selenium2.playback.recordResult({success: true});
    });
  },

  "saveScreenshot": function() {
    builder.selenium2.playback.execute("saveScreenshot", builder.selenium2.playback.param("file"));
  }
};

builder.selenium2.playback.playStep = function() {
  jQuery('#' + builder.selenium2.playback.currentStep.id + '-content').css('background-color', '#ffffaa');
  if (builder.selenium2.playback.playbackFunctions[builder.selenium2.playback.currentStep.type.getName()]) {
    builder.selenium2.playback.playbackFunctions[builder.selenium2.playback.currentStep.type.getName()]();
  } else {
    builder.selenium2.playback.recordError(builder.selenium2.playback.currentStep.type + " not implemented for playback");
  }
};

builder.selenium2.playback.print = function(text) {
  jQuery('#' + builder.selenium2.playback.currentStep.id + '-message').show().append(newNode('span', text));
}

builder.selenium2.playback.recordResult = function(result) {
  if (builder.selenium2.playback.currentStep.negated) {
    result.message = builder.selenium2.playback.currentStep.type.getName() + " is " + result.success;
    result.success = !result.success;
  }
  if (result.success) {
    jQuery('#' + builder.selenium2.playback.currentStep.id + '-content').css('background-color', '#bfee85');
  } else {
    jQuery('#' + builder.selenium2.playback.currentStep.id + '-content').css('background-color', '#ffcccc');
    builder.selenium2.playback.playResult.success = false;
    if (result.message) {
      jQuery('#' + builder.selenium2.playback.currentStep.id + '-message').html(result.message).show();
      builder.selenium2.playback.playResult.errormessage = result.message;
    }
  }

  if (builder.selenium2.playback.stopRequest || builder.selenium2.playback.currentStep == builder.selenium2.playback.finalStep) {
    builder.selenium2.playback.shutdown();
  } else {
    builder.selenium2.playback.currentStep = builder.selenium2.playback.script.steps[builder.selenium2.playback.script.getStepIndexForID(builder.selenium2.playback.currentStep.id) + 1];
    builder.selenium2.playback.playStep();
  }
};

builder.selenium2.playback.shutdown = function() {
  jQuery('#edit-local-playing').hide();
  jQuery('#edit-stop-local-playback').hide();
  if (builder.selenium2.playback.postPlayCallback) {
    builder.selenium2.playback.postPlayCallback(builder.selenium2.playback.playResult);
  }
};

builder.selenium2.playback.recordError = function(message) {
  if (builder.selenium2.playback.currentStep.negated && builder.selenium2.playback.currentStep.type.getName().startsWith("assert")) {
    // Record this as a failed result instead - this way it will be turned into a successful result
    // by recordResult.
    builder.selenium2.playback.recordResult({success: false});
    return;
  }
  jQuery('#' + builder.selenium2.playback.currentStep.id + '-content').css('background-color', '#ff3333');
  builder.selenium2.playback.playResult.success = false;
  jQuery('#' + builder.selenium2.playback.currentStep.id + '-error').html(message).show();
  builder.selenium2.playback.playResult.errormessage = message;
  builder.selenium2.playback.shutdown();
};
