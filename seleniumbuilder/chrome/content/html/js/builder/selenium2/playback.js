/**
 * Code for playing back Selenium 2 scripts locally.
*/

builder.sel2.playback = {};
pb = builder.sel2.playback;

/** The WebDriver session ID. */
pb.sessionId = null;
/** The CommandProcessor used to talk to WebDriver with. */
pb.commandProcessor = null;
/** The script being played back. */
pb.script = null;
/** The step being played back. */
pb.currentStep = null;
/** The step after which playback should stop. */
pb.finalStep = null;
/** The function to call with a result object after the run has concluded one way or another. */
pb.postPlayCallback = null;
/** The result object returned at the end of the run. */
pb.playResult = null;
/** Whether the user has requested test stoppage. */
pb.stopRequest = false;
/** What interval to check waits for. */
pb.waitIntervalAmount = 300;
/** How many wait cycles are run before waits time out. */
pb.maxWaitCycles = 60000 / pb.waitIntervalAmount;
/** How many wait cycles have been run. */
pb.waitCycle = 0;
/** The wait interval. */
pb.waitInterval = null;
/** Stored variables. */
pb.vars = {};

pb.clearResults = function() {
  var sc = builder.getCurrentScript();
  for (var i = 0; i < sc.steps.length; i++) {
    jQuery('#' + sc.steps[i].id + '-content').css('background-color', '#dddddd');
    jQuery('#' + sc.steps[i].id + '-message').hide();
    jQuery('#' + sc.steps[i].id + '-error').hide();
  }
};

pb.stopTest = function() {
  pb.stopRequest = true;
};

pb.runTest = function(postPlayCallback) {
  pb.vars = {};
  pb.runTestBetween(
    postPlayCallback,
    builder.getCurrentScript().steps[0].id,
    builder.getCurrentScript().steps[builder.getCurrentScript().steps.length - 1].id
  );
};

pb.runTestBetween = function(postPlayCallback, startStepID, endStepID) {
  pb.script = builder.getCurrentScript();
  pb.postPlayCallback = postPlayCallback;
  pb.currentStep = pb.script.getStepWithID(startStepID);
  pb.finalStep = pb.script.getStepWithID(endStepID);
  pb.playResult = {success: true};
  pb.startSession();
};

pb.startSession = function() {
  pb.clearResults();
  pb.stopRequest = false;
  jQuery('#edit-clearresults').show();
  jQuery('#edit-local-playing').show();
  jQuery('#edit-stop-local-playback').show();
  
  // Set up Webdriver
  var handle = Components.classes["@googlecode.com/webdriver/fxdriver;1"].createInstance(Components.interfaces.nsISupports);
  var server = handle.wrappedJSObject;
  var driver = server.newDriver(window.bridge.content());
  var iface = Components.classes['@googlecode.com/webdriver/command-processor;1'];
  pb.commandProcessor = iface.getService(Components.interfaces.nsICommandProcessor);
  var newSessionCommand = {
    'name': 'newSession',
    'context': '',
    'parameters': {
      'window_title':window.bridge.content().document.title
    }
  };
  pb.commandProcessor.execute(JSON.stringify(newSessionCommand), function(result) {
    pb.sessionId = JSON.parse(result).value;
    pb.playStep();
  });
};

pb.findElement = function(locator, callback, errorCallback) {
  pb.execute('findElement', {using: locator.type, value: locator.value}, callback, errorCallback);
};

pb.execute = function(name, parameters, callback, errorCallback) {
  var cmd = {
    'name': name,
    'context': '',
    'parameters': parameters,
    'sessionId': {"value": pb.sessionId}
  };
  pb.commandProcessor.execute(JSON.stringify(cmd), function(result) {
    result = JSON.parse(result);
    if (result.status != 0) {
      if (errorCallback) {
        errorCallback(result);
      } else {
        pb.recordError(result.value.message);
      }
    } else {
      if (callback) {
        callback(result);
      } else {
        pb.recordResult({success: true});
      }
    }
  });
};

pb.clearElement = function(target) {
  pb.execute('isElementSelected', {id: target}, function(result) {
    if (result.value) {
      pb.execute('clickElement', {id: target});
    }
  });
};

/** Performs ${variable} substitution for parameters. */
pb.param = function(pName) {
  var output = "";
  var hasDollar = false;
  var insideVar = false;
  var varName = "";
  var text = pName.startsWith("locator") ? pb.currentStep[pName].value : pb.currentStep[pName];
  for (var i = 0; i < text.length; i++) {
    var ch = text.substring(i, i + 1);
    if (insideVar) {
      if (ch == "}") {
        if (pb.vars[varName] == undefined) {
          throw "Variable not set: " + varName + ".";
        }
        output += pb.vars[varName];
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
  
  return pName.startsWith("locator") ? {"type": pb.currentStep[pName].type, "value": output} : output;
};

pb.playbackFunctions = {
  "print": function() {
    pb.print(pb.param("text"));
    pb.recordResult({success: true});
  },
  "store": function() {
    pb.vars[pb.param("variable")] = pb.param("text");
    pb.recordResult({success: true});
  },
  "get": function() {
    pb.execute('get', {url: pb.param("url")});
  },
  "goBack": function() {
    pb.execute('goBack', {});
  },
  "goForward": function() {
    pb.execute('goForward', {});
  },
  "clickElement": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('clickElement', {id: result.value.ELEMENT});
    });
  },
  "doubleClickElement": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('clickElement', {id: result.value.ELEMENT});
      pb.execute('clickElement', {id: result.value.ELEMENT});
    });
  },
  "submitElement": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('submitElement', {id: result.value.ELEMENT});
    });
  },
  "sendKeysToElement": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('sendKeysToElement', {id: result.value.ELEMENT, value: pb.param("text").split("")});
    });
  },
  "setElementSelected": function() {
    pb.findElement(pb.param("locator"), function(result) {
      var target = result.value.ELEMENT;
      pb.execute('isElementSelected', {id: target}, function(result) {
        if (!result.value) {
          pb.execute('clickElement', {id: target});
        } else {
          pb.recordResult({success: true});
        }
      });
    });
  },
  "setElementNotSelected": function() {
    pb.findElement(pb.param("locator"), function(result) {
      var target = result.value.ELEMENT;
      pb.execute('isElementSelected', {id: target}, function(result) {
        if (result.value) {
          pb.execute('clickElement', {id: target});
        } else {
          pb.recordResult({success: true});
        }
      });
    });
  },
  "clearSelections": function() {
    pb.findElement(pb.param("locator"), function(result) {
      var target = result.value.ELEMENT;
      pb.execute('findChildElements', {id: target, using: "tag name", value: "option"}, function(result) {
        for (var i = 0; i < result.value.length; i++) {
          pb.clearElement(result.value[i].ELEMENT);
        }
        pb.recordResult({success: true});
      });
    });
  },
  "refresh": function() {
    pb.execute('refresh', {});
  },
  "verifyTextPresent": function() {
    pb.execute('getPageSource', {}, function(result) {
      if (result.value.indexOf(pb.param("text")) != -1) {
        pb.recordResult({success: true});
      } else {
        pb.recordResult({success: false, message: "Text not present."});
      }
    });
  },
  "assertTextPresent": function() {
    pb.execute('getPageSource', {}, function(result) {
      if (result.value.indexOf(pb.param("text")) != -1) {
        pb.recordResult({success: true});
      } else {
        pb.recordError("Text not present.");
      }
    });
  },
  "waitForTextPresent": function() {
    pb.wait(function(callback) {
      pb.execute('getPageSource', {}, function(result) {
        callback(result.value.indexOf(pb.param("text")) != -1);
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeTextPresent": function() {
    pb.execute('getPageSource', {}, function(result) {
      pb.vars[pb.param("variable")] = result.value.indexOf(pb.param("text")) != -1;
      pb.recordResult({success: true});
    });
  },
  
  "verifyBodyText": function() {
    pb.findElement({type: 'tag name', value: 'body'}, function(result) {
      pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == pb.param("text")) {
          pb.recordResult({success: true});
        } else {
          pb.recordResult({success: false, message: "Body text does not match."});
        }
      });
    });
  },
  "assertBodyText": function() {
    pb.findElement({type: 'tag name', value: 'body'}, function(result) {
      pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == pb.param("text")) {
          pb.recordResult({success: true});
        } else {
          pb.recordError("Body text does not match.");
        }
      });
    });
  },
  "waitForBodyText": function() {
    pb.wait(function(callback) {
      pb.findElement({type: 'tag name', value: 'body'}, function(result) {
        pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
          callback(result.value == pb.param("text"));
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeBodyText": function() {
    pb.findElement({type: 'tag name', value: 'body'}, function(result) {
      pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        pb.vars[pb.param("variable")] = result.value;
        pb.recordResult({success: true});
      });
    });
  },
  
  "verifyElementPresent": function() {
    pb.findElement(pb.param("locator"), null, function(result) {
      pb.recordResult({success: false, message: "Element not found."});
    });
  },
  "assertElementPresent": function() {
    pb.findElement(pb.param("locator"), null, function(result) {
      pb.recordError("Element not found.");
    });
  },
  "waitForElementPresent": function() {
    pb.wait(function(callback) {
      pb.findElement(pb.param("locator"),
        /*success*/ function(result) { callback(true);  },
        /*error  */ function(result) { callback(false); }
      );
    });
  },
  "storeElementPresent": function() {
    pb.findElement(pb.param("locator"),
    /*success*/
    function(result) {
      pb.vars[pb.param("variable")] = true;
      pb.recordResult({success: true});
    },
    /*failure*/
    function(result) {
      pb.vars[pb.param("variable")] = false;
      pb.recordResult({success: true});
    });
  },
  
  "verifyPageSource": function() {
    pb.execute('getPageSource', {}, function(result) {
      if (result.value == pb.param("source")) {
        pb.recordResult({success: true});
      } else {
        pb.recordResult({success: false, message: "Source does not match."});
      }
    });
  },
  "assertPageSource": function() {
    pb.execute('getPageSource', {}, function(result) {
      if (result.value == pb.param("source")) {
        pb.recordResult({success: true});
      } else {
        pb.recordError("Source does not match.");
      }
    });
  },
  "waitForPageSource": function() {
    pb.wait(function(callback) {
      pb.execute('getPageSource', {}, function(result) {
        callback(result.value == pb.param("source"));
      }, /*error*/ function() { callback(false); });
    });
  },
  "storePageSource": function() {
    pb.execute('getPageSource', {}, function(result) {
      pb.vars[pb.param("variable")] = result.value;
      pb.recordResult({success: true});
    });
  },
  
  "verifyText": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == pb.param("text")) {
          pb.recordResult({success: true});
        } else {
          pb.recordResult({success: false, message: "Element text does not match."});
        }
      });
    });
  },
  "assertText": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        if (result.value == pb.param("text")) {
          pb.recordResult({success: true});
        } else {
          pb.recordError("Element text does not match.");
        }
      });
    });
  },
  "waitForText": function() {
    pb.wait(function(callback) {
      pb.findElement(pb.param("locator"), function(result) {
        pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
          callback(result.value == pb.param("text"));
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeText": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementText', {id: result.value.ELEMENT}, function(result) {
        pb.vars[pb.param("variable")] = result.value;
        pb.recordResult({success: true});
      });
    });
  },
  
  "verifyCurrentUrl": function() {
    pb.execute('getCurrentUrl', {}, function(result) {
      if (result.value == pb.param("url")) {
        pb.recordResult({success: true});
      } else {
        pb.recordResult({success: false, message: "URL does not match."});
      }
    });
  },
  "assertCurrentUrl": function() {
    pb.execute('getCurrentUrl', {}, function(result) {
      if (result.value == pb.param("url")) {
        pb.recordResult({success: true});
      } else {
        pb.recordError("URL does not match.");
      }
    });
  },
  "waitForCurrentUrl": function() {
    pb.wait(function(callback) {
      pb.execute('getCurrentUrl', {}, function(result) {
        callback(result.value == pb.param("url"));
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeCurrentUrl": function() {
    pb.execute('getCurrentUrl', {}, function(result) {
      pb.vars[pb.param("variable")] = result.value;
      pb.recordResult({success: true});
    });
  },
  
  "verifyTitle": function() {
    pb.execute('getTitle', {}, function(result) {
      if (result.value == pb.param("title")) {
        pb.recordResult({success: true});
      } else {
        pb.recordResult({success: false, message: "Title does not match."});
      }
    });
  },
  "assertTitle": function() {
    pb.execute('getTitle', {}, function(result) {
      if (result.value == pb.param("title")) {
        pb.recordResult({success: true});
      } else {
        pb.recordError("Title does not match.");
      }
    });
  },
  "waitForTitle": function() {
    pb.wait(function(callback) {
      pb.execute('getTitle', {}, function(result) {
        callback(result.value == pb.param("title"));
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeTitle": function() {
    pb.execute('getTitle', {}, function(result) {
      pb.vars[pb.param("variable")] = result.value;
      pb.recordResult({success: true});
    });
  },
  
  "verifyElementSelected": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
        if (result.value) {
          pb.recordResult({success: true});
        } else {
          pb.recordResult({success: false, message: "Element not selected."});
        }
      });
    });
  },
  "assertElementSelected": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
        if (result.value) {
          pb.recordResult({success: true});
        } else {
          pb.recordError("Element not selected.");
        }
      });
    });
  },
  "waitForElementSelected": function() {
    pb.wait(function(callback) {
      pb.findElement(pb.param("locator"), function(result) {
        pb.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
          callback(result.value);
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeElementSelected": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('isElementSelected', {id: result.value.ELEMENT}, function(result) {
        pb.vars[pb.param("variable")] = result.value;
        pb.recordResult({success: true});
      });
    });
  },
  
  "verifyElementValue": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
        if (result.value == pb.currentStep.value) {
          pb.recordResult({success: true});
        } else {
          pb.recordResult({success: false, message: "Element value does not match."});
        }
      });
    });
  },
  "assertElementValue": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
        if (result.value == pb.currentStep.value) {
          pb.recordResult({success: true});
        } else {
          pb.recordError("Element value does not match.");
        }
      });
    });
  },
  "waitForElementValue": function() {
    pb.wait(function(callback) {
      pb.findElement(pb.param("locator"), function(result) {
        pb.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
          callback(result.value == pb.currentStep.value);
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeElementValue": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementValue', {id: result.value.ELEMENT}, function(result) {
        pb.vars[pb.param("variable")] = result.value;
        pb.recordResult({success: true});
      });
    });
  },
  
  "verifyElementAttribute": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementAttribute', {id: result.value.ELEMENT, name: pb.param("attributeName") }, function(result) {
        if (result.value == pb.param("value")) {
          pb.recordResult({success: true});
        } else {
          pb.recordResult({success: false, message: "Attribute value does not match."});
        }
      });
    });
  },
  "assertElementAttribute": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementAttribute', {id: result.value.ELEMENT, name: pb.param("attributeName") }, function(result) {
        if (result.value == pb.param("value")) {
          pb.recordResult({success: true});
        } else {
          pb.recordError("Attribute value does not match.");
        }
      });
    });
  },
  "waitForElementAttribute": function() {
    pb.wait(function(callback) {
      pb.findElement(pb.param("locator"), function(result) {
        pb.execute('getElementAttribute', {id: result.value.ELEMENT, name: pb.param("attributeName") }, function(result) {
          callback(result.value == pb.param("value"));
        }, /*error*/ function() { callback(false); });
      }, /*error*/ function() { callback(false); });
    });
  },
  "storeElementAttribute": function() {
    pb.findElement(pb.param("locator"), function(result) {
      pb.execute('getElementAttribute', {id: result.value.ELEMENT, name: pb.param("attributeName") }, function(result) {
        pb.vars[pb.param("variable")] = result.value;
        pb.recordResult({success: true});
      });
    });
  },
  
  "deleteCookie": function() {
    pb.execute('deleteCookie', {"name": pb.param("name")});
  },
  
  "addCookie": function() {
    var params = {"cookie": {"name": pb.param("name"), "value": pb.param("value")}};
    var opts = pb.param("options").split(",");
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
    pb.execute('addCookie', params);
  },
  
  "verifyCookieByName": function() {
    pb.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == pb.param("name")) {
          if (result.value[i].value == pb.param("value")) {
            pb.recordResult({success: true});
          } else {
            pb.recordResult({success: false, message: "Element value does not match."});
          }
          return;
        }
      }
      pb.recordResult({success: false, message: "No cookie found with this name."});
    });
  },
  "assertCookieByName": function() {
    pb.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == pb.param("name")) {
          if (result.value[i].value == pb.param("value")) {
            pb.recordResult({success: true});
          } else {
            pb.recordError("Element value does not match.");
          }
          return;
        }
      }
      pb.recordError("No cookie found with this name.");
    });
  },
  "waitForCookieByName": function() {
    pb.wait(function(callback) {
      pb.execute('getCookies', {}, function(result) {
        for (var i = 0; i < result.value.length; i++) {
          if (result.value[i].name == pb.param("name")) {
            callback(result.value[i].value == pb.param("value"));
            return;
          }
        }
        callback(false);
      },
      /*error*/ function() { callback(false); });
    });
  },
  "storeCookieByName": function() {
    pb.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == pb.param("name")) {
          pb.vars[pb.param("variable")] = result.value;
          pb.recordResult({success: true});
          return;
        }
      }
      pb.recordError("No cookie found with this name.");
    });
  },
  
  "verifyCookiePresent": function() {
    pb.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == pb.param("name")) {
          pb.recordResult({success: true});
          return;
        }
      }
      pb.recordResult({success: false, message: "No cookie found with this name."});
    });
  },
  "assertCookiePresent": function() {
    pb.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == pb.param("name")) {
          pb.recordResult({success: true});
          return;
        }
      }
      pb.recordError("No cookie found with this name.");
    });
  },
  "waitForCookiePresent": function() {
    pb.wait(function(callback) {
      pb.execute('getCookies', {}, function(result) {
        for (var i = 0; i < result.value.length; i++) {
          if (result.value[i].name == pb.param("name")) {
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
    pb.execute('getCookies', {}, function(result) {
      for (var i = 0; i < result.value.length; i++) {
        if (result.value[i].name == pb.param("name")) {
          pb.vars[pb.param("variable")] = true;
          pb.recordResult({success: true});
          return;
        }
      }
      pb.vars[pb.param("variable")] = false;
      pb.recordResult({success: true});
    });
  },
    
  "saveScreenshot": function() {
    pb.execute("saveScreenshot", pb.param("file"));
  }
};

pb.wait = function(testFunction) {
  builder.sel2.setProgressBar(pb.currentStep.id, 0);
  pb.waitCycle = 0;
  pb.waitInterval = window.setInterval(function() {
    testFunction(function(success) {
      if (success) {
        window.clearInterval(pb.waitInterval);
        builder.sel2.hideProgressBar(pb.currentStep.id);
        pb.recordResult({success: true});
        return;
      }
      if (pb.waitCycle++ >= pb.maxWaitCycles) {
        window.clearInterval(pb.waitInterval);
        builder.sel2.hideProgressBar(pb.currentStep.id);
        pb.recordError("Wait timed out.");
        return;
      }
      if (pb.stopRequest) {
        window.clearInterval(pb.waitInterval);
        builder.sel2.hideProgressBar(pb.currentStep.id);
        pb.shutdown();
        return;
      }
      builder.sel2.setProgressBar(pb.currentStep.id, pb.waitCycle * 100 / pb.maxWaitCycles);
    });
  }, pb.waitIntervalAmount);
};

pb.playStep = function() {
  jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ffffaa');
  if (pb.playbackFunctions[pb.currentStep.type]) {
    pb.playbackFunctions[pb.currentStep.type]();
  } else {
    pb.recordError(pb.currentStep.type + " not implemented for playback");
  }
};

pb.print = function(text) {
  jQuery('#' + pb.currentStep.id + '-message').show().append(newNode('span', text));
}

pb.recordResult = function(result) {
  if (pb.currentStep.negated) {
    result.success = !result.success;
    result.message = pb.currentStep.type + " is true";
  }
  if (result.success) {
    jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ccffcc');
  } else {
    jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ffcccc');
    pb.playResult.success = false;
    if (result.message) {
      jQuery('#' + pb.currentStep.id + '-message').html(result.message).show();
      pb.playResult.errormessage = result.message;
    }
  }
  
  if (pb.stopRequest || pb.currentStep == pb.finalStep) {
    pb.shutdown();
  } else {
    pb.currentStep = pb.script.steps[pb.script.getStepIndexForID(pb.currentStep.id) + 1];
    pb.playStep();
  }
};

pb.shutdown = function() {
  jQuery('#edit-local-playing').hide();
  jQuery('#edit-stop-local-playback').hide();
  if (pb.postPlayCallback) {
    pb.postPlayCallback(pb.playResult);
  }
};

pb.recordError = function(message) {
  if (pb.currentStep.negated && pb.currentStep.type.startsWith("assert")) {
    // Record this as a failed result instead - this way it will be turned into a successful result
    // by recordResult.
    pb.recordResult({success: false});
    return;
  }
  jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ff3333');
  pb.playResult.success = false;
  jQuery('#' + pb.currentStep.id + '-error').html(message).show();
  pb.playResult.errormessage = message;
  pb.shutdown();
};