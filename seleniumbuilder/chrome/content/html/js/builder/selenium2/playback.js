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

pb.clearResults = function() {
  var sc = builder.getCurrentScript();
  for (var i = 0; i < sc.steps.length; i++) {
    jQuery('#' + sc.steps[i].id + '-content').css('background-color', '#dddddd');
    jQuery('#' + sc.steps[i].id + '-message').hide();
    jQuery('#' + sc.steps[i].id + '-error').hide();
  }
};

pb.runTest = function(postPlayCallback) {
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

pb.findElement = function(locator, callback) {
  var findcommand = {
    'name': 'findElement',
    'context': '',
    'parameters': {using: locator.type, value: locator.value},
    'sessionId': {"value": pb.sessionId}
  };
  pb.commandProcessor.execute(JSON.stringify(findcommand), callback);
};

pb.playStep = function() {
  jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ffffaa');
  // Actually play the step, eventually!
  if (pb.currentStep.type == "get") {
    var cmd = {
      'name': 'get',
      'context': '',
      'parameters': {url: pb.currentStep.url},
      'sessionId': {"value": pb.sessionId}
    };
    pb.commandProcessor.execute(JSON.stringify(cmd), function(result) {
      pb.recordResult({success: true});
    });
  } else if (pb.currentStep.type == "element.click") {
    pb.findElement(pb.currentStep.locator, function(result) {
      var el_uuid = JSON.parse(result).value.ELEMENT;
      var clickcommand = {
        'name': 'clickElement',
        'context': '',
        'parameters': {id: el_uuid},
        'sessionId': {"value": pb.sessionId}
      };
      pb.commandProcessor.execute(JSON.stringify(clickcommand), function(result) {
        pb.recordResult({success: true});
      });
    });
  } else if (pb.currentStep.type == "element.sendKeys") {
    pb.findElement(pb.currentStep.locator, function(result) {
      alert(result);
      var el_uuid = JSON.parse(result).value.ELEMENT;
      var sendKeysCommand = {
        'name': 'sendKeysToElement',
        'context': '',
        'parameters': {id: el_uuid, value: pb.currentStep.value.split("")},
        'sessionId': {"value": pb.sessionId}
      };
      pb.commandProcessor.execute(JSON.stringify(sendKeysCommand), function(result) {
        pb.recordResult({success: true});
      });
    });
  } else {
    window.setTimeout(function() { pb.recordResult({success: true}); }, 500);
  }
};

pb.recordResult = function(result) {
  if (result.success) {
    jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ccffcc');
  } else {
    jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ffcccc');
    pb.playResult.success = false;
    jQuery('#' + pb.currentStep.id + '-message').html(result.message).show();
    pb.playResult.message = result.message;
  }
  if (pb.stopRequest || pb.currentStep == pb.finalStep) {
    if (pb.postPlayCallback) {
      pb.postPlayCallback(pb.playResult);
    }
  } else {
    pb.currentStep = pb.script.steps[pb.script.getStepIndexForID(pb.currentStep.id) + 1];
    pb.playStep();
  }
};

pb.recordError = function(message) {
  jQuery('#' + pb.currentStep.id + '-content').css('background-color', '#ffcccc');
  pb.playResult.success = false;
  jQuery('#' + pb.currentStep.id + '-error').html(message).show();
  pb.playResult.message = message;
  if (pb.postPlayCallback) {
    pb.postPlayCallback(pb.playResult);
  }
};