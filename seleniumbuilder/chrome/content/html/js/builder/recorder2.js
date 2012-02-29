/**
 * A class that can record clicks and typing on a window and all sub-windows.
 *
 * @param {Window} The frame to explore
 * @param Selenium version to generate steps for
 * @param {Function(step)} Function called with recorded steps
 */
builder.Recorder = function(top_window, seleniumVersion, recordStep) {
  this.top_window = top_window;
  this.seleniumVersion = seleniumVersion;
  this.recordStep = recordStep;
  
  // These three variables are used to notice when the same event gets issued twice in a row.
  /** The last locator clicked on. */
  this.lastLocator = false;
  /** Timeout used to reset the above values after a second. */
  this.lastLocTimeout;
  /**
   * List of frames to which the recorder has been bound. Gets continually updated via timeout.
   */
  this.bound = [];
  /** Listener functions attached to frames. Stored so they can be detached again. */
  this.listeners = {};
};

builder.Recorder.prototype = {
  /**
   * Create an event from a received click on any element.
   */
  writeJSONClicks: function(e) {
    var locator = builder.locator.fromElement(e.target);
    var lastStep = builder.getScript().getLastStep();
    if (this.isTypeOrClickInSamePlace(lastStep, locator)) {
      return;
    }

    // Selects are handled via change events, so clicks on them can be ignored.
    if ({ 'select': true, 'option': true }[e.target.tagName.toLowerCase()]) {
      return;
    }

    // To keep from generating multiple actions for the same click, we check if the click 
    // happened in the same place as the last one.
    
    if (lastLocator && locator.probablyHasSameTarget(lastLocator)) {
      if (e.type == 'click') {
        return;
      }
      if (e.type == 'dblclick') {
        if (this.seleniumVersion == builder.selenium1) {
          if ({
              builder.selenium1.stepTypes.click: true,
              builder.selenium1.stepTypes.clickAt: true,
              builder.selenium1.stepTypes.doubleClick: true
            }[lastStep.type])
          {
            lastStep.changeType(builder.selenium1.stepTypes.doubleClick);
          }
          return;
        }
        // qqDPS No double-click support in Selenium 2 yet!
      }
    }
    lastLocator = locator;
    // But if the same click happens after more than a second, count it as intentional. 
    clearTimeout(lastLocTimeout);
    lastLocTimeout = setTimeout(function () {
      lastLocator = null;
    }, 1000);

    if (this.seleniumVersion == builder.selenium1) {
      if (e.type == 'dblclick') {
        this.recordStep(new builder.Step(builder.selenium1.stepTypes.doubleClick, locator));
        return;
      }
      if (e.target.type == "checkbox") {
        this.recordStep(new builder.Step(builder.selenium1.stepTypes.check, locator));
        return;
      }
      this.recordStep(new builder.Step(builder.selenium1.stepTypes.click, locator));
      return;
    }
    
    if (this.seleniumVersion == builder.selenium2) {
      // qqDPS No double-click support in Selenium 2 yet!
      if (e.target.type == "checkbox") {
        // qqDPS Should we be checking vs 
        this.recordStep(new builder.Step(builder.selenium2.stepTypes.setElementSelected, locator));
        return;
      }
      this.recordStep(new builder.Step(builder.selenium2.stepTypes.clickElement, locator));
      return;
    }
  },
  isTypeOrClickInSamePlace: function(step, locator) {
    if (this.seleniumVersion == builder.selenium1) {
      if (!{
          builder.selenium1.stepTypes.type: true,
          builder.selenium1.stepTypes.click: true,
          builder.selenium1.stepTypes.doubleClick: true,
          builder.selenium1.stepTypes.check: true
        }[step.type])
      {
        return false;
      }
    }
    if (this.seleniumVersion == builder.selenium2) {
      if (!{
          builder.selenium2.stepTypes.sendKeysToElement: true,
          builder.selenium2.stepTypes.clickElement: true,
          builder.selenium2.stepTypes.setElementSelected: true
        }[step.type])
      {
        return false;
      }
    }
    var stepParams = step.getParamNames();
    for (var i = 0; i < stepParams; i++) {
      if (stepParams[i] == "locator") {
        if (locator.probablyHasSameTarget(step["locator"])) {
          return true;
        }
      }
    }
    return false;
  },
  /** Record change events, e.g. typing, selecting, radio buttons. */
  writeJsonChange: function(e) {
    var locator = builder.locator.fromElement(e.target);
    var lastStep = builder.getScript().getLastStep();
    
    // Under some circumstances, for example when the user presses an arrow key, an event can
    // be triggered in Firefox with no e.target.type. Ignore these. 
    if (!e.target.type) {
      return;
    }
    
    // Typing
    if ({ textarea: 1, text: 1, password: 1 }[e.target.type.toLowerCase()]) {
      // Continue typing or replace a click with a type.
      if (this.isTypeOrClickInSamePlace(lastStep, locator)) {
        if (this.seleniumVersion == builder.selenium1) {
          lastStep.changeType(builder.selenium1.stepTypes.type);
          lastStep.value = e.target.value;
          return;
        }
        if (this.seleniumVersion == builder.selenium2) {
          lastStep.changeType(builder.selenium2.stepTypes.sendKeysToElement);
          lastStep.text = e.target.value;
          return;
        }
      }
      // Also need to check for previous step in case of using enter to submit forms -
      // otherwise we get a spurious extra "type" step after the submit click step.
      var nextToLastStep = builder.getScript().getStepBefore(lastStep);
      if (this.isTypeOrClickInSamePlace(nextToLastStep, locator)) {
        if (this.seleniumVersion == builder.selenium1) {
          nextToLastStep.changeType(builder.selenium1.stepTypes.type);
          nextToLastStep.value = e.target.value;
          return;
        }
        if (this.seleniumVersion == builder.selenium2) {
          nextToLastStep.changeType(builder.selenium2.stepTypes.sendKeysToElement);
          nextToLastStep.text = e.target.value;
          return;
        }
      }
      
      // Start typing
      if (this.seleniumVersion == builder.selenium1) {
        this.recordStep(new builder.Step(selenium1.stepTypes.type, locator, e.target.value));
        return;
      }
      if (this.seleniumVersion == builder.selenium2) {
        this.recordStep(new builder.Step(selenium2.stepTypes.sendKeysToElement, locator, e.target.value));
        return;
      }
    }
    
    var selectLocator = locator;
    if (locator.supportsMethod(builder.locator.methods.xpath)) {
      selectLocator = new builder.Locator(builder.locator.methods.xpath,
        {xpath: locator.getValueForMethod(builder.locator.methods.xpath) + "/*[. = '" + e.target.options[e.target.selectedIndex].text + "']"});
    } else if (locator.supportsMethod(builder.locator.methods.id)) {
      selectLocator = new builder.Locator(builder.locator.methods.xpath,
        {id: "//*[@id='" + locator.getValueForMethod(builder.locator.methods.id) + "']/*[. = '" + e.target.options[e.target.selectedIndex].text + "']"});
    }
    
    // Selecting
    if (e.target.type == 'select' || e.target.type == 'select-one') {
      // Replace a click with a select
      if (this.isTypeOrClickInSamePlace(lastStep, locator)) {
        if (this.seleniumVersion == builder.selenium1) {
          lastStep.changeType(builder.selenium1.stepTypes.select);
          lastStep.optionLocator = e.target.options[e.target.selectedIndex].text;
        }
        if (this.seleniumVersion == builder.selenium2) {
          lastStep.changeType(builder.selenium2.stepTypes.setElementSelected);
          lastStep.locator = selectLocator;
        }
      }
      
      // Deduplicate selects, as we only need the final state of a sequence of selects.
      // Also, sometimes Firefox issues multiple select events.
      if (this.seleniumVersion == builder.selenium1) {
        if (lastStep.type == builder.selenium1.stepTypes.select) {
          var frame = findFrame(e.target.ownerDocument);
          if (frame) {
            var lastTarget = new MozillaBrowserBot(frame).findElementBy("xpath",
                lastStep.selectLocator.getValueForMethod(builder.locator.methods.xpath), frame.document, frame);
            if (lastTarget == e.target) {
              lastStep.selectLocator = e.target.options[e.target.selectedIndex].text;
              return;
            }
          }
        }
      }
      if (this.seleniumVersion == builder.selenium2) {
        if (lastStep.type == builder.selenium2.stepTypes.setElementSelected) {
          var frame = findFrame(e.target.ownerDocument);
          if (frame) {
            var lastTarget = new MozillaBrowserBot(frame).findElementBy("xpath",
                lastStep.locator.getValueForMethod(builder.locator.methods.xpath), frame, frame.document, frame);
            if (lastTarget == e.target) {
              lastStep.locator = selectLocator;
            }
          }
        }
      }
      
      // Add select
      if (this.seleniumVersion == builder.selenium1) {
        this.recordStep(new builder.Step(builder.selenium1.stepTypes.select,
          locator, e.target.options[e.target.selectedIndex].text);
        return;
      }
      if (this.seleniumVersion == builder.selenium2) {
        this.recordStep(new builder.Step(builder.selenium1.stepTypes.setElementSelected,
          selectLocator);
        return;
      }
    }
  }
};

  /** Record change events, e.g. typing, selecting, radio buttons. */
  function writeJsonChange(e) {
    var params = builder.locator.create(e.target);
    var step = builder.lastStep();
    
    // Under some circumstances, for example when the user presses an arrow key, an event can
    // be triggered in Firefox with no e.target.type. Ignore these. 
    if (!e.target.type) {
      return;
    }
    
    // Typing
    if ({ textarea: 1, text: 1, password: 1 }[e.target.type.toLowerCase()]) {
      // Continue typing or replace a click with a type.
      if (isTypeOrClickInSamePlace(step, params)) {
        step.method('type');
        step.option(e.target.value);
        return;
      }
      // Also need to check for previous step in case of using enter to submit forms -
      // otherwise we get a spurious extra "type" step after the submit click step.
      if (isTypeOrClickInSamePlace(step.previous(), params)) {
        step.previous().method('type');
        step.previous().option(e.target.value);
        return;
      }

      // Start typing
      params.text = e.target.value;
      record_action('type', params);
      return;
    }
    
    // Selecting
    if (e.target.type == 'select' || e.target.type == 'select-one') {
      // Replace a click with a select
      if (isTypeOrClickInSamePlace(step, params)) {
        step.method('select');
        step.optionLocator(e.target.options[e.target.selectedIndex].text);
      }

      // Deduplicate selects, as we only need the final state of a sequence of selects.
      // Also, sometimes Firefox issues multiple select events.
      if (step.method() == 'select') {
        var frame = findFrame(e.target.ownerDocument);
        if (frame) {
          var lastTarget = new MozillaBrowserBot(frame).findElementBy("xpath",
              step.altLocator().xpath, frame.document, frame);
          if (lastTarget == e.target) {
            step.option(e.target.options[e.target.selectedIndex].text);
            return;
          }
        }
      }

      // Add select
      params.optionLocator = e.target.options[e.target.selectedIndex].text;
      record_action('select', params);
      return;
    }
    
    // Radio button
    if (e.target.type == 'radio') {
      // See if the check is already reported, and if yes, bail. Firefox does multiple events
      // when you select a radio button using a keyboard, so we have to deduplicate.
      if (step.method() == 'check') {
        var frame = findFrame(e.target.ownerDocument);
        if (frame) {
          var lastTarget = new MozillaBrowserBot(frame).findElementBy("xpath", step.altLocator().xpath, frame.document, frame);
          if (lastTarget == e.target) {
            return;
          }
        }
      }

      // Replace a click with a radio button check
      if (isTypeOrClickInSamePlace(step, params)) {
        step.method('check');
        step.option(e.target.value);
        return;
      }

      // Add radio button check
      record_action('check', params);
      return;
    }
  }

  /** Finds the frame for a given document. */
  function findFrame(d) {
    for (i in bound) {
      if (bound[i].document == d) {
        return bound[i];
      }
    }
    return null;
  }

  /**
   * This is horrendously primitive support for typing at new-school HTML fun-stuff
   * It will approximately work for appending stuff but monitoring changes is nigh impossible.
   * However it has the advantage of providing the selectors needed for closer modification.
   */
  function writeJsonType(e) {
    if (builder.lastStep().method() == 'typeKeys') {
      if (e.which >= 32 || e.which == 9 || e.which == 10) {
        builder.lastStep().option(builder.lastStep().option() + String.fromCharCode(e.which));
      } else if (e.which == 8) {
        var prev = builder.lastStep().option();
        builder.lastStep().option(prev.substr(prev.length - 1));
      }
    } else {
      var params = builder.locator.create(e.target);
      if (e.which >= 32 || e.which == 9 || e.which == 10) {
        params.value = String.fromCharCode(e.which);
      }
      record_action('typeKeys', params);
    }
  }

  /**
   * Record exact position of clicks for elements where it might be important (e.g canvas tags).
   */
  function writeJsonClickAt(e) {
    var params = builder.locator.create(e.target);
    var offset = jQuery(e.target).offset();
    params.coordString = (e.clientX - offset.left) + "," + (e.clientY - offset.top);

    // To keep from generating multiple actions for the same click, update the previous click 
    // step as necessary. 
    var locator = params._default;
    var locValue = params[locator];
    if ((lastLocValue == locValue) && (lastLocator == locator)) {
      if (e.type == 'click') {
        return;
      }
      if (e.type == 'dblclick' && { click:1, clickAt:1 }[builder.lastStep().method()]) {
        return builder.lastStep().method('doubleClick');
      }
    }
    lastLocValue = locValue;
    lastLocator = locator;
    clearTimeout(lastLocTimeout);
    // If the clicks happen more than a second apart we count them separately.
    lastLocTimeout = setTimeout(function () {
      lastLocValue = null;
      lastLocator = null;
    }, 1000);

    record_action('clickAt', params);
  }

  /**
   * Attempt to catch enter keys as they often trigger events.
   * However, the browser often uses them to trigger clicks, in which case we want to record the
   * click.
   */
  function writeJsonKeyPress(e) {
    if (e.which == 13) { // 13 is the key code for enter
      var previousId = builder.lastStep() ? builder.lastStep().id : null;
      // If the keypress is used to trigger a click, this key event will be immediately
      // followed by a click event. Hence, wait 100 ms and check if another step got recorded
      // in the meantime.
      setTimeout(function () {
        var step = builder.lastStep();
        if (!step ||
            step.id == previousId ||
            step.method() != 'click' ||
            e.target.nodeName.toLowerCase() == 'textbox')
        {
          // Ignore enter keypresses on select and option elements.
          if ({'select': true, 'option': true}[e.target.nodeName.toLowerCase()]) {
            return;
          }
          params = builder.locator.create(e.target);
          params.key = "\\13";
          record_action("keyPress", params);
        }
      }, 100);
    }
  }

  /**
   * Given a function and a recording function, returns a new function that first executes the 
   * original function and then calls the recording function, passing in the Observer function,
   * the arguments and the return value. The original wrapped function is put into the 
   * __original__ field of the returned function. In short, it interposes the record function as
   * a logger.
   * @param original The function to wrap.
   * @param observer The observer function to wrap it in.
   */
  function wrapWithObserver(original, observer) {
    if (typeof original != 'function') { // FIXME - there should be better handling of this.
      return original;
    }

    // If the original function is already wrapped, unwrap it before adding the new wrapping. 
    if (typeof original.__original__ == 'function') {
      original = original.__original__;
    }

    function replacement() {
      var ret = original.apply(this, arguments);
      observer(this, arguments, ret);
      return ret;
    }
    
    replacement.__original__ = original;
    return replacement;
  }

  /**
   * Attach an observer function to the given field of the given object.
   * @param object The object to one of whose fields we want to attach an observer
   * @param fieldName The name of the field
   * @param The observer function 
   */
  function observe(object, fieldName, observer) {
    if (object && object[fieldName]) {
      object[fieldName] = new wrapWithObserver(object[fieldName], observer);
    }
  }

  /**
   * Detach observers from the given object's fields.
   * @param object The object to detach observers from
   * @param fieldNames___ All arguments beyond the 1st are the names of the fields to unobserve
   */
  function unobserve(object, fieldNames___) {
    for (var i = 1; i < arguments.length; i++) {
      var fieldName = arguments[i];
      if (object && object[fieldName] && object[fieldName].__original__) {
        object[fieldName] = object[fieldName].__original__;
      }
    }
  }

  // FIXME: if possible this should be hooked in at a chrome level to avoid 
  // splattering messily if a web-app overrides the alert function.
  // event DOMWillOpenModalDialog doesn't seem to give enough information.
  /**
   * Attach observers to the alert, prompt, and confirm dialog functions to record the fact that
   * the test runner will have to wait for and then deal with the dialog. 
   */
  function overrideDialogs(frame) {
    observe(frame.wrappedJSObject, 'alert', function (thiz, args, retval) {
      record_action("waitForAlert", { 'equal to': args[0] });
    });
    observe(frame.wrappedJSObject, 'prompt', function (thiz, args, retval) {
      record_action("answerOnNextPrompt", { 'answer': retval });
      builder.reorderLastSteps();
      // Necessary: Selenium raises an error if a second alert/prompt/confirmation occurs
      // before this gets called.
      record_action("verifyPrompt", { 'equal to': args[0] }); 
    });
    observe(frame.wrappedJSObject, 'confirm', function (thiz, args, retval) {
      if (retval) {
        record_action("chooseOkOnNextConfirmation", {});
      } else {
        record_action("chooseCancelOnNextConfirmation", {});
      }
      builder.reorderLastSteps();
      record_action("verifyConfirmation", { 'equal to': args[0] });
    });
  }

  /** Remove observers for dialogs. */
  function underrideDialogs(frame) {
    unobserve(frame.wrappedJSObject, 'alert', 'prompt', 'confirm');
  }

  /**
   * Attaches listeners to everything in the frame.
   * @param frame The frame to attach listeners to.
   * @param level The level of the frame - level 0 means it's a page in the browser
   */
  function bindFrame(frame, level) {
    // Remember that this frame has been bound to.
    bound.push(frame);
    
    // Turns out there are cases where people are canceling click on purpose, so I am manually
    // going to attach click listeners to all links.
    var links = frame.document.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) {
      jQuery(links[i]).bind("click", {}, writeJsonClicks, true);
      for (var z = 0; z < links[i].childNodes.length; z++) {
        jQuery(links[i].childNodes[z]).bind("click", {}, writeJsonClicks, true);
      }
    }

    overrideDialogs(frame);

    jQuery('canvas').
        bind('click', {}, writeJsonClickAt, true).
        bind('keypress', {}, writeJsonType, true);

    jQuery(frame.document).
        bind("dblclick", {}, writeJsonClicks, true).
        bind("keyup", {}, writeJsonChange, true).
        bind("change", {}, writeJsonChange, true)


    if (frame.document.designMode && frame.document.designMode.toLowerCase() == 'on') {
      jQuery(frame.document).
          bind("keypress", {}, writeJsonType, true).
          bind("click", {}, writeJsonClickAt, true);
    } else {
      jQuery(frame.document).
          bind("click", {}, writeJsonClicks, true).
          bind("keypress", {}, writeJsonKeyPress, true);
    }

    // Turn off autocomplete.
    deactivateAutocomplete(frame.document.getElementsByTagName('form'));
    deactivateAutocomplete(frame.document.getElementsByTagName('input'));
    deactivateAutocomplete(frame.document.getElementsByTagName('textarea'));
  }

  /** Turns off autocomplete for the given fields. */
  function deactivateAutocomplete(elements) {
    for (var i = 0; i < elements.length; i++) {
      jQuery(elements[i]).attr("autocomplete", "off");
    }
  }
  
  /** Reactivate autocomplete for the given elements. */
  function reactivateAutocomplete(elements) {
    for (var i = 0; i < elements.length; i++) {
      jQuery(elements[i]).removeAttr("autocomplete");
    }
  }

  /**
   * Remove all the listeners from everything in the frame.
   */
  function unbindFrame(frame, level) {
    if (!frame.document) { return; }
    
    var links = frame.document.getElementsByTagName('a');
    for (var i = 0; i < links.length; i++) {
      jQuery(links[i]).unbind("click", writeJsonClicks, true);
      for (var z = 0; z < links[i].childNodes.length; z++) {
        jQuery(links[i].childNodes[z]).unbind("click", writeJsonClicks, true);
      }
    }

    underrideDialogs(frame);
    
    jQuery('canvas').
        unbind('click', writeJsonClickAt, true).
        unbind('keypress', writeJsonType, true);
    
    jQuery(frame.document).unbind("dblclick", writeJsonClicks, true);
    
    jQuery(frame.document).
        unbind("keyup", writeJsonChange, true).
        unbind("change", writeJsonChange, true);
    
    if (frame.document.designMode && frame.document.designMode.toLowerCase() == 'on') {
      jQuery(frame.document).
          unbind("keypress", writeJsonType, true).
          unbind("click", writeJsonClickAt, true);
    } else {
      jQuery(frame.document).
          unbind("click", writeJsonClicks, true).
          unbind("keypress", writeJsonKeyPress, true);
    }

    // Turn autocomplete back on. Unfortunately, this also turns on autocomplete for elements
    // that had autocomplete off in the original document. Theoretically speaking, the original
    // autocomplete value could be stored in deactivateAutocomplete and restored here, but in
    // practice, Firefox pretends to Javascript that the attribute doesn't exist! For example,
    // the line
    // <input autocomplete="off" type="text" name="email"></input></p>
    // turns into
    // <input name="email" type="text"></p>
    // when read in from jQuery.
    reactivateAutocomplete(frame.document.getElementsByTagName('form'));
    reactivateAutocomplete(frame.document.getElementsByTagName('input'));
    reactivateAutocomplete(frame.document.getElementsByTagName('textarea'));
  }

  /**
   * Add listeners into common navigation functions.
   */
  function bind_browser(browser) {
    // Firefox 3.5 Only
    observe(browser, 'BrowserBack', function () {
      if (browser.content == window.bridge.getRecordingWindow()) { record_action('goBack', {}); }
    });

    // The other BrowserReload* functions are just wrappers around this
    observe(browser, 'BrowserReloadWithFlags', function () {
      if (browser.content == window.bridge.getRecordingWindow()) { record_action('refresh', {}); }
    });

    // Listen for the user actually typing in a URL into the navigation bar.
    // (browser is a window, gBrowser is a Browser, and mCurrentBrowser is a TabBrowser)
    observe(browser.gBrowser.mCurrentBrowser, 'loadURIWithFlags', function (browser, url) {
      // We can't find out what the URL was until after we get destroyed (and then bound to
      // the next content window) so we rely on who ever is listening to do this for us.
      record_action('open', {}, /* user opened page manually*/ true);
    });
  }

  /**
   * Remove listeners from common navigation functions.
   */
  function unbind_browser(browser) {
    unobserve(browser, 'BrowserBack', 'BrowserReloadWithFlags');
    unobserve(browser.gBrowser.mCurrentBrowser, 'loadURIWithFlags');
  }

  // Initialise the recorder by binding to all frames in the recorder window.
  builder.loadlistener.on_all_frames(target_window, bindFrame, 0);
  // Periodically check if new frames have appeared.
  var checkFrames = setInterval(function () {
    builder.loadlistener.on_all_frames(target_window, function (frame, level) {
      if (bound.indexOf(frame) == -1) {
        bindFrame(frame, level);
      }
    }, 0);
  }, 200);
  
  // Now listen on navigation functions in the browser.
  bind_browser(window.bridge.getBrowser());

  return {
    /** Turns off the recorder. */
    destroy: function () {
      builder.loadlistener.on_all_frames(target_window, unbindFrame, 0);
      clearInterval(checkFrames);
      unbind_browser(window.bridge.getBrowser());
    }
  };
};