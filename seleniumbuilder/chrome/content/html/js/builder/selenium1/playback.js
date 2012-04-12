/**
 * Code for playing back Selenium 1 scripts locally.
*/

builder.selenium1.playback = {};

// qqDPS Stub
builder.selenium1.playback.canPlayback = function(stepType) {
  return true;
};


/** The script being played back. */
builder.selenium1.playback.script = null;
/** The index of the step being played back. */
builder.selenium1.playback.step_index = -1;
/** The step after which playback should stop, or -1 to go till the end. */
builder.selenium1.playback.end_step_index = -1;
/** The function to call with a result object after the run has concluded one way or another. */
builder.selenium1.playback.postPlayCallback = null;
/** The result object returned at the end of the run. */
builder.selenium1.playback.playResult = null;
/** Whether the user has requested test stoppage. */
builder.selenium1.playback.stopRequest = false;
/** The delay between steps. */
builder.selenium1.playback.speed = 0;
// Set up Selenium to drive the browser.
builder.selenium1.playback.handler = new CommandHandlerFactory();
builder.selenium1.playback.browserbot = new MozillaBrowserBot(window.bridge.getRecordingWindow());
builder.selenium1.playback.selenium = new Selenium(builder.selenium1.playback.browserbot);
builder.selenium1.playback.handler.registerAll(builder.selenium1.playback.selenium);

// When we detect that the page has stop loading, tell the browser bot so we can stop waiting
// for the load and play the next step.
builder.storage.addChangeListener('pageloading', function (val) {
  // The page has stopped loading, but for safety's sake, we now wait for a sequence of events to
  // happen that ensures the page is fully loaded before proceeding.
  // Code partly adapted from http://github.com/mozautomation/mozmill/blob/master/mozmill/mozmill/extension/resource/modules/init.js
  if (!val) {
    window.bridge.getRecordingWindow().document.addEventListener("DOMContentLoaded", function() {
        window.bridge.getRecordingWindow().content.addEventListener("load", function() {
          // Now we just wait for 300 ms to hopefully allow any javascript that was waiting on
          // load to finish manipulating the page DOM.
          setTimeout(function() {
            builder.selenium1.playback.browserbot.recordPageLoad(window.bridge.getRecordingWindow());
          }, 300);
        }, false);
      }, false);
  }
});

builder.selenium1.playback.record_result = function(result) {
  // Color the step according to whether the playback succeeded.
  if (result && result.failed) {
    jQuery('#' + script[builder.selenium1.playback.step_index].id + '-content').css('background-color', '#ffcccc');
    builder.selenium1.playback.playResult.success = false;
    if (result.failureMessage) {
      builder.selenium1.playback.playResult.errormessage = result.failureMessage;
      jQuery('#' + script[builder.selenium1.playback.step_index].id + "-error").html(
          "Failed: " + result.failureMessage).show();
    } else {
      builder.selenium1.playback.playResult.errormessage = " (Unknown Failure Reason)";
    }
  } else {
    jQuery('#' + builder.selenium1.playback.script[builder.selenium1.playback.step_index].id + '-content').css('background-color', '#ccffcc');
  }
  if (builder.selenium1.playback.step_index != builder.selenium1.playback.end_step_index &&
      ++builder.selenium1.playback.step_index < builder.selenium1.playback.script.length &&
      !builder.selenium1.playback.stopRequest)
  {
    if (builder.selenium1.playback.speed > 0) {
      window.setTimeout(function() { builder.selenium1.playback.play_step(builder.selenium1.playback.script[builder.selenium1.playback.step_index]); }, builder.selenium1.playback.speed);
    } else {
      builder.selenium1.playback.play_step(builder.selenium1.playback.script[builder.selenium1.playback.step_index]);
    }
  } else {
    jQuery('#edit-editing').show();
    jQuery('#edit-local-playing').hide();
    if (builder.selenium1.playback.postPlayCallback) {
      builder.selenium1.playback.postPlayCallback(builder.selenium1.playback.playResult);
    }
  }
};

builder.selenium1.playback.echo = function(message) {
  jQuery('#' + builder.selenium1.playback.script[builder.selenium1.playback.step_index].id + "-message").html(message).show();
};

builder.selenium1.playback.setSpeed = function(newSpeed) {
  builder.selenium1.playback.speed = newSpeed;
};

builder.selenium1.playback.record_error = function(error) {
  jQuery('#' + builder.selenium1.playback.script[builder.selenium1.playback.step_index].id + '-content').css('background-color', '#ff3333');
  jQuery('#' + builder.selenium1.playback.script[builder.selenium1.playback.step_index].id + "-error").html(
      " " + (error ? error : "Unknown Error")).show();
  builder.selenium1.playback.playResult.success = false;
  builder.selenium1.playback.playResult.errormessage = error;
  jQuery('#edit-editing').show();
  jQuery('#edit-local-playing').hide();
  if (builder.selenium1.playback.postPlayCallback) {
    builder.selenium1.playback.postPlayCallback(builder.selenium1.playback.playResult);
  }
};

/** Dumps message to browser console. */
function myDump(aMessage) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
  consoleService.logStringMessage("SB: " + aMessage);
}

builder.selenium1.playback.preprocessParameter = function(p) {
  if (p instanceof builder.locator.Locator) {
    return builder.selenium1.playback.selenium.preprocessParameter(
      p.getName(builder.selenium1) + "=" + p.getValue()
    );
  }
  return builder.selenium1.playback.selenium.preprocessParameter("" + p);
};

/** Executes the given step in the browser. */
builder.selenium1.playback.play_step = function(step) {
  var pNames = step.getParamNames();
  var p0 = pNames.length > 0 ? step[pNames[0]] : '';
  var p1 = pNames.length > 1 ? step[pNames[1]] : '';
  var command = {
    command: step.type.baseName,
    target: builder.selenium1.playback.preprocessParameter(p0),
    value: builder.selenium1.playback.preprocessParameter(p1)
  };
  // Run command
  var result = builder.selenium1.playback.handler.getCommandHandler(step.type.name).execute(builder.selenium1.playback.selenium, command);
  var interval;
  
  // Highlight the step being executed.
  jQuery('#' + step.id + '-content').css('background-color', '#ffffaa');

  function wait() {
    // Tell the browser bot to run a bunch of functions used to eg determine if the page
    // has reloaded yet.
    try {
      if (builder.selenium1.playback.stopRequest) {
        window.clearInterval(interval);
        builder.selenium1.playback.record_result({failed:true, failureMessage: "Test stopped"});
        return;
      }
      // The browser bot is trying to listen for new windows being opened so it can wrap their
      // open, alert, etc functions. Unfortunately, it actually gets ahold of objects that have
      // some of the properties of the windows it wants, but are not the real thing, as wrapping
      // their functions doesn't work - the actual window objects that end up getting used by the
      // Javascript on the loaded page have non-wrapped functions.
      // So we lend a helping hand by asking Firefox (note that this makes the code Firefox
      // specific) for all the windows in the browser and pass them to browserbot to have them
      // processed.
      var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
      var en = windowManager.getZOrderDOMWindowEnumerator(null, false);
      while (en.hasMoreElements()) {
        var w = en.getNext();
        for (i = 0; i < w.frames.length; i++) {
          // This expression filters out the frames that aren't browser tabs.
          // I'm sure there's a better way to detect this, but this would require meaningful
          // documentation in Firefox! qqDPS
          if ((w.frames[i] + "").indexOf("ChromeWindow") == -1) {
            var win = w.frames[i];
            builder.selenium1.playback.browserbot._modifyWindow(win);
            // FF 4 has rearchitected so that we can no longer successfully intercept open()
            // calls on windows. So instead, we manually look for new windows that have opened.
            // But doing so actually breaks under FF 3, so only do this on FF 4.
            // qqDPS TODO Use a nicer way to check for browser version.
            if (navigator.userAgent.indexOf("Firefox/4") != -1 && !win.__selenium_builder_popup_listener_active) {
              win.__selenium_builder_popup_listener_active = true;
              win.addEventListener("load", function() {
                if (win.name && !browserbot.openedWindows[win.name]) {
                  builder.selenium1.playback.browserbot.openedWindows[win.name] = win;
                }
              }, false);
            }
          }
        }
      }
      
      builder.selenium1.playback.browserbot.runScheduledPollers();
      if (result.terminationCondition && !result.terminationCondition()) { return; }
      window.clearInterval(interval);
      builder.selenium1.playback.record_result(result);
    } catch (e) {
      window.clearInterval(interval);
      dump(e.stack);
      builder.selenium1.playback.record_error(e);
    }
  }
  interval = window.setInterval(wait, 10);
};

builder.selenium1.playback.stopTest = function() {
  builder.selenium1.playback.stopRequest = true;
};

/**
 * Plays the current script from a particular step.
 * @param start_step_id The ID of the step to start playing on, or 0 to start at the beginning
 * @param end_step_id The ID of the step to end playing on (inclusive) or 0 to play till the end
 * @param thePostPlayCallback Optional callback to call after the run
 */
builder.selenium1.playback.runtestbetween = function(start_step_id, end_step_id, thePostPlayCallback) {
  builder.selenium1.playback.speed = 0;
  
  if (!start_step_id && !end_step_id) {
    jQuery('#steps-top')[0].scrollIntoView(false);
  }
  
  jQuery('#edit-editing').hide();
  jQuery('#edit-local-playing').show();
  builder.selenium1.playback.stopRequest = false;
  
  builder.selenium1.playback.postPlayCallback = thePostPlayCallback;
  builder.selenium1.playback.playResult = {success: true};
  
  builder.views.script.clearResults();
  jQuery('#edit-clearresults').show();
  
  // Need to recreate the playback system, as it may be bound to the wrong tab. This happens
  // when the recorder tab is closed and subsequently reopened.
  builder.selenium1.playback.handler = new CommandHandlerFactory();
  builder.selenium1.playback.browserbot = new MozillaBrowserBot(window.bridge.getRecordingWindow());
  builder.selenium1.playback.selenium = new Selenium(builder.selenium1.playback.browserbot);
  builder.selenium1.playback.handler.registerAll(builder.selenium1.playback.selenium);
  
  builder.selenium1.playback.script = builder.getScript();
  builder.selenium1.playback.browserbot.baseUrl = ""; //builder.selenium1.playback.script.baseUrl; qqDPS
  if (builder.selenium1.playback.script.steps) { builder.selenium1.playback.script = builder.selenium1.playback.script.steps; }
  
  builder.selenium1.playback.step_index = 0;
  builder.selenium1.playback.end_step_index = -1;
  
  if (start_step_id) {
    for (i = 0; i < script.length; i++) {
      if (builder.selenium1.playback.script[i].id == start_step_id) {
        builder.selenium1.playback.step_index = i;
      }
    }
  }
  
  if (end_step_id) {
    for (i = 0; i < script.length; i++) {
      if (builder.selenium1.playback.script[i].id == end_step_id) {
        builder.selenium1.playback.end_step_index = i;
      }
    }
  }
  
  builder.selenium1.playback.play_step(builder.selenium1.playback.script[builder.selenium1.playback.step_index]);
};

/**
 * Plays the current script.
 * @param thePostPlayCallback Optional callback to call after the run
 */
builder.selenium1.playback.runTest = function(thePostPlayCallback) {
  builder.selenium1.playback.runtestbetween(0, 0, thePostPlayCallback);
};