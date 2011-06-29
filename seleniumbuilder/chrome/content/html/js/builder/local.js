builder.local = new (function() {
  /** The script being played back. */
  var script;
  /** The index of the step being played back. */
  var step_index;
  /** The step after which playback should stop, or -1 to go till the end. */
  var end_step_index = -1;
  /** The function to call with a result object after the run has concluded one way or another. */
  var postPlayCallback;
  /** The result object returned at the end of the run. */
  var playResult;
  /** Whether the user has requested test stoppage. */
  var stopRequest = false;
  /** The delay between steps. */
  var speed = 0;
  // Set up Selenium to drive the browser.
  var handler = new CommandHandlerFactory();
  var browserbot = new MozillaBrowserBot(window.bridge.content());
  var selenium = new Selenium(browserbot);
  handler.registerAll(selenium);

  // When we detect that the page has stop loading, tell the browser bot so we can stop waiting
  // for the load and play the next step.
  builder.storage.addChangeListener('pageloading', function (val) {
    // The page has stopped loading, but for safety's sake, we now wait for a sequence of events to
    // happen that ensures the page is fully loaded before proceeding.
    // Code partly adapted from http://github.com/mozautomation/mozmill/blob/master/mozmill/mozmill/extension/resource/modules/init.js
    if (!val) {
      window.bridge.content().document.addEventListener("DOMContentLoaded", function() {
          window.bridge.content().content.addEventListener("load", function() {
            // Now we just wait for 300 ms to hopefully allow any javascript that was waiting on
            // load to finish manipulating the page DOM.
            setTimeout(function() {
              browserbot.recordPageLoad(window.bridge.content());
            }, 300);
          }, false);
        }, false);
    }
  });

  this.record_result = function(result) {
    // Color the step according to whether the playback succeeded.
    if (result && result.failed) {
      jQuery('#' + script[step_index].uuid + '-content').css('background-color', '#ffcccc');
      playResult.success = false;
      if (result.failureMessage) {
        playResult.errormessage = result.failureMessage;
        jQuery('#' + script[step_index].uuid + "error").html(
            "Failed: " + result.failureMessage).show();
      } else {
        playResult.errormessage = " (Unknown Failure Reason)";
      }
    } else {
      jQuery('#' + script[step_index].uuid + '-content').css('background-color', '#ccffcc');
    }
    if (step_index != end_step_index && ++step_index < script.length && !stopRequest) {
      if (speed > 0) {
        window.setTimeout(function() { builder.local.play_step(script[step_index]); }, speed);
      } else {
        this.play_step(script[step_index]);
      }
    } else {
      jQuery('#edit-editing').show();
      jQuery('#edit-local-playing').hide();
      if (postPlayCallback) {
        postPlayCallback(playResult);
      }
    }
  };
  
  this.echo = function(message) {
    jQuery('#' + script[step_index].uuid + "message").html(message).show();
  };
  
  this.setSpeed = function(newSpeed) {
    speed = newSpeed;
  };
  
  this.record_error = function(error) {
    jQuery('#' + script[step_index].uuid + '-content').css('background-color', '#ff3333');
    jQuery('#' + script[step_index].uuid + "error").html(
        " " + (error ? error : "Unknown Error")).show();
    playResult.success = false;
    playResult.errormessage = error;
    jQuery('#edit-editing').show();
    jQuery('#edit-local-playing').hide();
    if (postPlayCallback) {
      postPlayCallback(playResult);
    }
  };
  
  /** Dumps message to browser console. */
  function myDump(aMessage) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                   .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("SB: " + aMessage);
  }

  /** Executes the given step in the browser. */
  this.play_step = function(step) {
    var command = {
      command: step.method,
      target: selenium.preprocessParameter(step.locator || ''),
      value: selenium.preprocessParameter(step.option || '')
    };
    // Run command
    var result = handler.getCommandHandler(step.method).execute(selenium, command);
    var interval;
    
    // Highlight the step being executed.
    jQuery('#' + step.uuid + '-content').css('background-color', '#ffffaa');

    function wait() {
      // Tell the browser bot to run a bunch of functions used to eg determine if the page
      // has reloaded yet.
      try {
        if (stopRequest) {
          window.clearInterval(interval);
          builder.local.record_result({failed:true, failureMessage: "Test stopped"});
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
              browserbot._modifyWindow(win);
              // FF 4 has rearchitected so that we can no longer successfully intercept open()
              // calls on windows. So instead, we manually look for new windows that have opened.
              // But doing so actually breaks under FF 3, so only do this on FF 4.
              // qqDPS TODO Use a nicer way to check for browser version.
              if (navigator.userAgent.indexOf("Firefox/4") != -1 && !win.__selenium_builder_popup_listener_active) {
                win.__selenium_builder_popup_listener_active = true;
                win.addEventListener("load", function() {
                  if (win.name && !browserbot.openedWindows[win.name]) {
                    browserbot.openedWindows[win.name] = win;
                  }
                }, false);
              }
            }
          }
        }
        
        browserbot.runScheduledPollers();
        if (result.terminationCondition && !result.terminationCondition()) { return; }
        window.clearInterval(interval);
        builder.local.record_result(result);
      } catch (e) {
        window.clearInterval(interval);
        builder.local.record_error(e);
      }
    }
    interval = window.setInterval(wait, 10);
  };
  
  this.stoptest = function() {
    stopRequest = true;
  };
  
  function experimental_webdriver_run() {
    try {
      var handle = Components.classes["@googlecode.com/webdriver/fxdriver;1"].createInstance(Components.interfaces.nsISupports);
      var server = handle.wrappedJSObject;
      
      var driver = server.newDriver(window.bridge.content());
      /*
      for (var x in driver) {
        dump(x);
        dump("    ");
      }*/
      
      /*driver.get("http://www.zarkonnen.com");
      driver.findElement({linkText: 'Software'}).click();*/
      
      var iface = Components.classes['@googlecode.com/webdriver/command-processor;1'];
      var commandProcessor = iface.getService(Components.interfaces.nsICommandProcessor);
            
      var newSessionCommand = {
        'name': 'newSession',
        'context': '',
        'parameters': {
          'window_title':window.bridge.content().document.title
        }
      };
      commandProcessor.execute(JSON.stringify(newSessionCommand), function(result) {
        var sessionId = JSON.parse(result).value;
        dump(sessionId);
        var getcommand = {
          'name': 'get',
          'context': '',
          'parameters': {url:"http://www.zarkonnen.com"},
          'sessionId': {"value": sessionId}
        };
        commandProcessor.execute(JSON.stringify(getcommand), function(result) {
          //alert("got result: " + result);
          dump(result);
          //return true;
          var findcommand = {
            'name': 'findElement',
            'context': '',
            'parameters': {using:"id", value:"kpitlink"},
            'sessionId': {"value": sessionId}
          };
          commandProcessor.execute(JSON.stringify(findcommand), function(result) {
            //alert(result);
            var el_uuid = JSON.parse(result).value.ELEMENT;
            var clickcommand = {
              'name': 'clickElement',
              'context': '',
              'parameters': {id:el_uuid},
              'sessionId': {"value": sessionId}
            };
            commandProcessor.execute(JSON.stringify(clickcommand), function(result) {
              alert(result);
            });
          });
        });
      });
    } catch (error) {
      alert(error);
    }
  }
  
  /**
   * Plays the current script from a particular step.
   * @param start_step_uuid The UUID of the step to start playing on, or 0 to start at the beginning
   * @param end_step_uuid The UUID of the step to end playing on (inclusive) or 0 to play till the end
   * @param thePostPlayCallback Optional callback to call after the run
   */
  this.runtestbetween = function(start_step_uuid, end_step_uuid, thePostPlayCallback) {
    //experimental_webdriver_run();
    speed = 0;
    
    if (!start_step_uuid && !end_step_uuid) {
      jQuery('#steps-top')[0].scrollIntoView(false);
    }
    
    jQuery('#edit-editing').hide();
    jQuery('#edit-local-playing').show();
    stopRequest = false;
    
    postPlayCallback = thePostPlayCallback;
    playResult = {success: true};
    
    builder.clearResults();
    jQuery('#edit-clearresults').show();
    
    // Need to recreate the playback system, as it may be bound to the wrong tab. This happens
    // when the recorder tab is closed and subsequently reopened.
    handler = new CommandHandlerFactory();
    browserbot = new MozillaBrowserBot(window.bridge.content());
    selenium = new Selenium(browserbot);
    handler.registerAll(selenium);
    
    script = builder.getScript();
    browserbot.baseUrl = script.baseUrl;
    if (script.steps) { script = script.steps; }
    
    step_index = 0;
    end_step_index = -1;
    
    if (start_step_uuid) {
      for (i = 0; i < script.length; i++) {
        if (script[i].uuid == start_step_uuid) {
          step_index = i;
        }
      }
    }
    
    if (end_step_uuid) {
      for (i = 0; i < script.length; i++) {
        if (script[i].uuid == end_step_uuid) {
          end_step_index = i;
        }
      }
    }
    
    this.play_step(script[step_index]);
  };

  /**
   * Plays the current script.
   * @param thePostPlayCallback Optional callback to call after the run
   */
  this.runtest = function(thePostPlayCallback) {
    builder.local.runtestbetween(0, 0, thePostPlayCallback);
  };
})();