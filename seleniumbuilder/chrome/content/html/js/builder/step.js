/**
 * Code for manipulating the script and its steps. Contains the StepWrapper used to represent
 * a step in the script and the getScript function, which returns a script object representing the
 * script currently in the recorder.
 * 
 * Note that the master copy of the script is actually stored in the DOM of the recorder. Hence,
 * getting and setting values in the script involves using jQuery to get/set HTML field contents,
 * and creating/deleting steps entails adding/removing DOM nodes! 
 */
(function () {  
  function textAccessor(name) {
    return function(value) {
      if (typeof value != 'undefined') {
        document.getElementById(this.id + name).innerHTML = builder.encodeText(value);
      }
      return builder.decodeText(document.getElementById(this.id + name).innerHTML);
    };
  }
  
  /**
   * Creates an accessor (getter and setter) function for the given field name. The resulting
   * function, when called with no argument, returns the field value as extracted from the
   * value of the HTML input field it's in. When called with one string argument, it sets the
   * field value to that argument, then returns it.
   */
  function accessor(name) {
    return function (value) {
      if (typeof value != 'undefined') {
        document.getElementById(this.id + name).value = builder.encodeText(value);
      }
      return builder.decodeText(document.getElementById(this.id + name).value);
    };
  }

  /**
   * Creates an accessor (getter and setter) function for the given field name. The resulting
   * function, when called with no argument, parses the field's value as JSON and returns an
   * object. When called with one argument, it sets the field value to a JSON representation of
   * the argument, then returns the argument.
   */
  function JSONaccessor(name) {
    return function (value) {
      var read;
      if (typeof value != 'undefined') {
        read = document.getElementById(this.id + name).value = value ? JSON.stringify(value) : '';
      } else {
        read = document.getElementById(this.id + name).value;
      }
      return read ? JSON.parse(read) : null;
    };
  }

  /**
   * Class representing a single step in a script.
   * @param id The step's unique ID - *not*  its placement in the script
   */
  StepWrapper = function (id) {
    this.id = id;
  };
  
  function clickOn(el) {
    return function() {
      el.click();
    }
  }

  StepWrapper.prototype = {
    /**
     * Getter/setter for the method of the step. The method is the basic type of the step, eg
     * "click" or "waitForPageToLoad".
     */
    method: function (value) {
      if (typeof value != 'undefined') {
        var oldValue = document.getElementById(this.id + 'method').textContent;
        
        document.getElementById(this.id + 'method').textContent = value;
        
        // We may wish to rearrange the params when switching to a different method with a
        // different number of params.
        if (oldValue && oldValue != value) {
          var oldFunc = new SeleniumFunction(oldValue);
          var newFunc = new SeleniumFunction(value);
          // Expand into two params: put the param into the right field if possible, based on type.
          if (oldFunc.parameters.length == 1 &&
              newFunc.parameters.length == 2 &&
              oldFunc.parameter_types[0] != newFunc.parameter_types[0] &&
              oldFunc.parameter_types[0] == newFunc.parameter_types[1])
          {
            this.option(this.locator());
            this.altOption(this.altLocator());
            this.locator("");
            this.altLocator(null);
          }
          // Compress into one param: choose which param survives, based on type.
          if (oldFunc.parameters.length == 2 &&
              newFunc.parameters.length == 1 &&
              oldFunc.parameter_types[0] != newFunc.parameter_types[0] &&
              oldFunc.parameter_types[1] == newFunc.parameter_types[0])
          {
            this.locator(this.option());
            this.altLocator(this.altOption());
            this.option("");
            this.altOption(null);
          }
        }
        
        this._updateDisplay();
      }
      return document.getElementById(this.id + 'method').textContent;
    },
    /** The step's first parameter. Not necessarily a locator. */
    locator: textAccessor('locator'),
    /**
     * If locator is a locator, a mapping of alternative locators, i.e alternative ways of
     * referring to the same part of the document.
     */
    altLocator: JSONaccessor('altLocator'),
    /** The step's second parameter. Can be a locator. */
    option: textAccessor('option'),
    /**
     * If option is a locator, a mapping of alternative locators, i.e alternative ways of
     * referring to the same part of the document.
     */
    altOption: JSONaccessor('altOption'),
    /** The URL of the page the step was recorded in. */
    url: accessor('url'),

    /** 
     * @return An object with all the field values of the step attached (see above). Also
     * contains an uuid field which is the step's ID. This is used in builder.getScript to
     * assemble the script.
     */
    call: function () {
      var ret = { uuid: this.id };

      var names = ['method', 'locator', 'altLocator', 'option', 'altOption', 'url'];
      for (var i = 0; i < names.length; i++) {
        var value = this[names[i]]();
        if (value) { ret[names[i]] = value; }
      }
      return ret;
    },

    /** @return The previous step in the script, or nothing if there is none. */
    previous: function () {
      var pred = this._query("")[0].previousSibling;
      if (pred && pred.id) {
        return builder.getStep(pred.id);
      }
    },
    
    /** @return The next step in the script or nothing if there is none. */
    next: function () {
      var succ = this._query("")[0].nextSibling;
      if (succ && succ.id) {
        return builder.getStep(succ.id);
      }
    },

    /** @return A reference to jQuery with the step already selected. */
    _query: function (name) {
      return jQuery('#' + this.id + name);
    },

    /** 
     * Updates the way that the step is displayed, showing or hiding the GUI elements for the
     * locator and option, binding and unbinding functions like modify_value and 
     * modify_locator, listening for changes and showing warnings if the domain name of the step
     * doesn't match up with the script's. 
     */
    _updateDisplay: function () {
      var func = new SeleniumFunction(this.method());
      this._query('values').hide();

      // Steps can contain two parameters. Both of them can be locators, but one of them is
      // called "locator" in the HTML, and the other is called "option". So we just loop over
      // those two names.
      var paramNames = ['locator', 'option'];
      var shownParams = 0;
      for (var i = 0; i < paramNames.length; i++) {
        if (func.parameters[i]) {
          shownParams++;
          this._query(paramNames[i] + 'Wrap').show();
          this._query(paramNames[i] + 'Type').html(func.parameters[i]);

          // If the parameter is a locator, add the code to show the GUI component for
          // choosing a locator. Otherwise, add the code to show the GUI component for
          // choosing generated values.
          var fieldWrap = this._query(paramNames[i] + 'Wrap');
          if (func.parameter_types[i] == 'locator') {
            fieldWrap.bind('click', editLocator).unbind('click', editParam);
          } else {
            fieldWrap.unbind('click', editLocator).bind('click', editParam);
          }
          
          jQuery('#' + this.id + 'edit-p' + i + '-name').html(func.parameters[i]).unbind('click').
            bind('click', clickOn(fieldWrap));
          jQuery('#' + this.id + 'edit-p' + i).show();
        } else {
          jQuery('#' + this.id + 'edit-p' + i).hide();
          this._query(paramNames[i] + 'Wrap').hide();
        }
      }
      
      /*
      qqDPS Toggle stops working after hiding and unhiding the wrap, for some reason.
      So we have a more primitive version below.
      // Show/hide param names: If we have 2 params, or they are empty, we want them named.
      this._query('locatorType').toggle(
        func.parameters[0] && (shownParams == 2 || this.locator() == ""));
      this._query('optionType').toggle(
        func.parameters[1] && (shownParams == 2 || this.option() == ""));
      
      // And if we have two params, display them in rows below the method.
      this._query('locatorWrap').toggleClass('b-param-row', shownParams == 2);
      this._query('optionWrap').toggleClass('b-param-row', shownParams == 2);
      */
      if (func.parameters[0] && (shownParams == 2 || this.locator() == "")) {
        this._query('locatorType').show();
      } else {
        this._query('locatorType').hide();
      }
      if (func.parameters[1] && (shownParams == 2 || this.option() == "")) {
        this._query('optionType').show();
      } else {
        this._query('optionType').hide();
      }
      
      if (shownParams == 2) {
        this._query('locatorWrap').css("display", "block");
        this._query('optionWrap').css("display", "block");
      } else {
        this._query('locatorWrap').css("display", "inline");
        this._query('optionWrap').css("display", "block");
      }

      /*
      // If the domain name for this step doesn't match up with the base URL's domain name,
      // show a warning message. Manually inserting steps used to set myURL to "undefined",
      // hence the check for that.
      var myURL = this.url();
      if (!myURL || myURL == '' || myURL == "[unknown]" || myURL == "undefined") {
        // If we simply don't know which URL this will lead to, don't show a warning.
        this._query('warningWrap').hide();
      } else {
        var myDomain = builder.getDomainName(myURL);
        var baseDomain = builder.getDomainName(builder.storage.get('baseurl'));
        if (myDomain != baseDomain) {
          this._query('warning').html("Domain change to " + myDomain + " will break script!");
        } else {
          this._query('warningWrap').hide();
        }
      }
      */
    }
  };
  
  /**
   * A prototype with all the same fields as StepWrapper, but all of them are functions that
   * return null.
   */
  function DummyStepWrapper() {}

  function returnNull() { return null; }
  for (var name in StepWrapper.prototype) {
    DummyStepWrapper.prototype[name] = returnNull;
  }

  /** Clears the URLs and domain name warnings from all steps after the one with the given ID. */
  builder.clearURLsFrom = function (id) {
    var step = builder.getStep(id);
    step = step.next();
    while (step) {
      step._query('warningWrap').hide();
      step._query('url').get(0).value = "[unknown]";
      step = step.next();
    }
  };

  /**
   * @return The StepWrapper for the step with the given ID, or an inert DummyStepWrapper if the
   *         ID is undefined. 
   */ 
  builder.getStep = function (id) {
    if (!id) { return new DummyStepWrapper(); }
    return new StepWrapper(id);
  };

  /** @return The last step of the script, or a DummyStepWrapper if there are no steps. */
  builder.lastStep = function () {
    var suiteActions = builder.interface.getSuite().childNodes;
    return builder.getStep(suiteActions[suiteActions.length - 1].id);
  };
  
  /** Switches around the order of the last two steps in the script. */
  builder.reorderLastSteps = function () {
    var suiteActions = builder.interface.childNodes;
    if (suiteActions.length > 2) {
      var last = suiteActions[suiteActions.length - 1];
      var prev = suiteActions[suiteActions.length - 2];
      last.parentNode.insertBefore(last.parentNode.removeChild(last), prev);
    }
  };

  /**
   * Extracts domain name from URL.
   * Example: Takes the { 'http', '', 'www.foo.org' } parts from http://www.foo.org/puppies/ and 
   * glues it back together with slashes.
   */
  builder.getDomainName = function (url) {
    return url.split("/", 3).join("/");
  };

  /** 
   * Remembers the current value of this field so it can be compared in setSaveRequiredIfNeeded.
   * Note that field is a JQuery for the field.
   */
  builder.rememberOldValue = function (field) {
    if (field.length > 0) {
      builder.storage.set('oldValueField', field.get(0));
      builder.storage.set('oldValue', field.get(0).value);
    }
  };

  /** 
   * Checks the current value of the given field against the stored one. If different, it sets
   * save_required to true. Returns true if a change was made.
   */
  builder.setSaveRequiredIfNeeded = function (field) {
    if (field.length > 0) {
      if (field.get(0) == builder.storage.get('oldValueField', null)) {
        if (field.get(0).value != builder.storage.get('oldValue', null)) {
          builder.storage.set('save_required', true);
          return true;
        }
      } else {
        // Not sure how we got here without a focus event, but let's deal with it.
        rememberOldValue(field);
      }
    }
    return false;
  };

  /**
   * Called when the base url is changed in the GUI. Updates the URLs of individual steps if they
   * match the base URL's domain.
   */
  builder.updateBaseURL = function (newBaseURL) {
    var newDomain = builder.getDomainName(newBaseURL);
    var baseDomain = builder.getDomainName(builder.storage.get('baseurl', newDomain));
    var suiteActions = builder.interface.getSuite().childNodes;
    for (var i = 1; i < suiteActions.length; i++) {
      var step = builder.getStep(suiteActions[i].id);
      var stepURL = step.url();
      if (stepURL.indexOf(baseDomain) == 0) {
        step.url(newDomain + stepURL.substring(baseDomain.length));
      }
    }
  };

  /**
   * @return A script file. (Assembles the script from data held in the DOM.)
   *
   * Structure of the script:
   * {
   *   version: "0.3",
   *   seleniumVersion: "1",
   *   baseUrl: "http://www.google.com/" (may be undefined),
   *   steps: [
   *     method:     String (the name of the command)
   *     locator:    String (the first parameter)
   *     altLocator: Object (alternative values for the first parameter when it is a locator)
   *     option:     String (the second parameter)
   *     altOption:  Object (alternative values for the second parameter when it is a locator)       
   *     url:        String (the url at which the test was recorded)
   *   ]
   * }
   */
  builder.getScript = function () {
    var suiteNode = builder.interface.getSuite();
    var script = {
      steps: [],
      version: "0.3",
      seleniumVersion: "1"
    };

    if (builder.storage.get('baseurl')) {
      script.baseUrl = builder.storage.get('baseurl') + "/";
    }

    for (var i = 0; i < suiteNode.childNodes.length; i++) {
      if (suiteNode.childNodes[i].className.indexOf("b-step") > -1) {
        script.steps.push(builder.getStep(suiteNode.childNodes[i].id).call());
      }
    }

    return script;
  };
  
  /** Converts text or numbers to be suitable for display in text fields. */
  builder.encodeText = function(text) {
    if (text) { // Just passthrough undefined
      // Use "" + text to convert type of text into a String.
      text = ("" + text).replace(/\\/g, "\\\\");
      text = text.replace(/\n/g, "\\n");
    }
    return text;
  };

  /** Converts text from text fields back. */
  builder.decodeText = function(text) {
    if (text) { // Just passthrough undefined
      text = text.replace(/\\n/g, "\n");
      text = text.replace(/\\\\/g, "\\");
    }
    return text;
  };

  /** 
   * Attached to a button on a step, deletes the step.
   */
  function deleteStep() {
    if (confirm("WARNING: You cannot undo deleting a step.")) {
      builder.dialogs.method.hide();
      builder.storage.set('save_required', true);
      var node = document.getElementById(this.id.replace("delete", ""));
      node.parentNode.removeChild(node);
    }
  }

  function setSaveRequired() {
    builder.storage.set('save_required', true);
  }

  // Install a function in the recorder window to figure out on what webpage to re-open the 
  // recording tab if it gets closed.
  window.lastSeenUrl = function () {
    if (builder.lastStep()) { return builder.lastStep().url(); }
    return null;
  };
  
  /**
   * Creates a new step and inserts it into the script before the step with the given ID.
   */
  builder.insertNewStepBefore = function(id, method, params) {
    var stepWrapper = builder.getStep(id);
    var step = stepWrapper._query("")[0];
    var newStepWrapper = builder.createStep(method, params);
    var newStep = newStepWrapper._query("")[0];
    newStep.parentNode.removeChild(newStep);
    step.parentNode.insertBefore(newStep, step);
  }
  
  /**
   * Creates a new step and inserts it into the script after the step with the given ID.
   */
  builder.insertNewStepAfter = function(id, method, params) {
    var stepWrapper = builder.getStep(id);
    var step = stepWrapper._query("");
    var newStepWrapper = builder.createStep(method, params);
    var newStep = newStepWrapper._query("")[0];
    newStep.parentNode.removeChild(newStep);
    step.after(newStep);
  }
  
  function editParam() {
    var step_id = this.id.replace(/[a-zA-Z]*$/, "");
    var step = builder.getStep(step_id);
    var property_name = this.id.replace(/^[0-9]*/, "").replace(/Wrap$/, "");
    var property = jQuery('#' + step_id + property_name);
    builder.dialogs.editparam.show(step, this, property);
  }
  
  /** Displays the dialogs.locator dialog for this field. */
  function editLocator() {
    var step_id = this.id.replace(/[a-zA-Z]*$/, "");
    var step = builder.getStep(step_id);
    var property_name = this.id.replace(/^[0-9]*/, "").replace(/Wrap$/, "");
    var property = jQuery('#' + step_id + property_name);
    builder.dialogs.locator.show(step, this, property, property_name);
  }
  
  /**
   * Creates a new step and appends it to the script. To do this, we physically create a DOM node 
   * representing the new step and attach it to the button of the script.
   *
   * Can take windmill arguments 
   * @param {String} method
   * @param {Object} params
   *
   * Or a selenium call
   * @param {Object} call
   */
  builder.createStep = function (method, params) {
    // If necessary, convert the windmill argument to a Selenium call.
    var call;
    if (typeof method == 'string') {
      var func = new SeleniumFunction(method);
      call = func.extract_call(params);
    } else {
      call = method;
      method = call.method;
    }
    var uuid = call.uuid || new Date().getTime();
    builder.interface.getSuite().appendChild(
      // List of options that materialises on rollover.
      newNode('div', {id: uuid, class: 'b-step'},
        newNode('span', {id: uuid + '-b-tasks', class: 'b-tasks'},
          newNode('a', "edit action", {
            id: uuid + 'edit',
            href: '#',
            class: 'b-task',
            click: function () {builder.dialogs.method.show(builder.getStep(uuid), jQuery('#' + uuid + '-container')[0]);},
          }),
          newNode('a', "edit ", newNode('span', 'p0', {id: uuid + 'edit-p0-name'}), {
            id: uuid + 'edit-p0',
            href: '#',
            class: 'b-task'
          }),
          newNode('a', "edit ", newNode('span', 'p1', {id: uuid + 'edit-p1-name'}), {
            id: uuid + 'edit-p1',
            href: '#',
            class: 'b-task'
          }),
          newNode('a', "delete step", {
            id: uuid + 'delete',
            href: '#',
            class: 'b-task',
            click: deleteStep,
          }),
          newNode('a', "new step above", {
            id: uuid + 'insert-above',
            href: '#',
            class: 'b-task',
            click: function() { builder.insertNewStepBefore(uuid, 'click', {}); }
          }),
          newNode('a', "new step below", {
            id: uuid + 'insert-below',
            href: '#',
            class: 'b-task',
            click: function() { builder.insertNewStepAfter(uuid, 'click', {}); }
          }),
          newNode('a', "run step", {
            id: uuid + 'run-step',
            href: '#',
            class: 'b-task',
            click: function() { builder.local.runtestbetween(uuid, uuid); }
          }),
          newNode('a', "run from here", {
            id: uuid + 'run-from-here',
            href: '#',
            class: 'b-task',
            click: function() { builder.local.runtestbetween(uuid, 0); }
          })
        ),
        newNode('div', {class: 'b-step-content', id: uuid + '-content'},
          newNode('div', {class: 'b-step-container', id: uuid + '-container'},
            // The step number
            newNode('span', {class:'b-step-number'}),
        
            // The method
            newNode('a', method, {id: uuid + 'method', href: '#' + uuid + 'method', class:'b-method',
              click: function () {builder.dialogs.method.show(builder.getStep(uuid), this.parentNode);}}),
        
            // The first parameter, "locator"
            newNode('span', {id: uuid + 'locatorWrap'},
              newNode('a', {
                id: uuid + 'locatorType',
                class:'b-param-type',
                href: '#' + uuid + 'locatorType'}
              ),
              newNode('a', builder.encodeText(call.locator) || '', {
                id: uuid + 'locator',
                class:'b-param',
                href: '#' + uuid + 'locator'}
              ),
              newNode('input', {id: uuid + 'altLocator', type: 'hidden', value: call.altLocator ? JSON.stringify(call.altLocator) : ''})
            ),
        
            // The second parameter, "option"
            newNode('span', {id: uuid + 'optionWrap'},
              newNode('a', {
                id: uuid + 'optionType',
                class:'b-param-type',
                href: '#' + uuid + 'optionType'}
              ),
              newNode('a', builder.encodeText(call.option) || '', {
                id: uuid + 'option',
                class:'b-param',
                href: '#' + uuid + 'option'}
              ),
              newNode('input', {id: uuid + 'altOption', type: 'hidden', value: call.altOption ? JSON.stringify(call.altOption) : ''})
            ),
        
            newNode('div', {id: uuid + 'warningWrap', style:'display: none', class: 'b-step-warning'},
              newNode('span', {id: uuid + 'warning'})
            ),
        
            newNode('div', {class:"b-step-message", id: uuid + "message", style:'display: none'}),
            newNode('div', {class:"b-step-error", id: uuid + "error", style:'display: none'}),
        
            newNode('input', {id: uuid + 'url', type: 'hidden', value: call.url ? call.url : '[unknown]'})
          )
        )
      )
    );
    
    // Prevent tasks menu from going off the bottom of the list.
    jQuery('#' + uuid).mouseenter(function(evt) {
      var step = jQuery('#' + uuid);
      var menu = jQuery('#' + uuid + '-b-tasks');
      var bottom = jQuery('#bottom');
      if (step.position().top + menu.height() > bottom.position().top &&
          bottom.position().top > 120)
      {
        menu.css("top", bottom.position().top - step.position().top - menu.height() - 6);
      } else {
        menu.css("top", 2);
      }
    });

    step = builder.getStep(uuid);
    step._updateDisplay();
    return step;
  };
})();