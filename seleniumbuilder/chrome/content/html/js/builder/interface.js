/**
 * Responsible for loading the recorder's GUI. It GUI primarily consists of a number of interfaces,
 * only one of which is displayed at any given time. Extra dialogs are then sometimes inserted
 * in-line for extra functionality. These are in the dialogs folder.
 *
 * Note that the static HTML for each interface can be found in body.html. This code only deals
 * with interface switching and adding functionality. This is generally done by using jQuery to
 * search for the ID of elements and attaching event handlers to them.
 *
 * Has additional properties for each dialog we want to display.
 *
 * Contains the following interfaces:
 * - booting  (identical to chrome/content/recorder.html)
 * - shutdown (dummy interface for turning off other ones)
 * - startup  (allows user to choose between loading script or recording new one)
 * - record   (listening to content page)
 * - edit     (not listening to content page)
 * - suite    (managing test suites)
 *
 * @method addOnloadHook(function) - register a function to be called when HTML has loaded
 * @method switchTo(interface_name) - show the interface corresponding to the name
 */
builder.interface = new(function () {
  /** Whether the interface has loaded completely. */
  var loaded = false;
  /**
   * A list of functions executed once the interface has loaded. Note that onloadHooks are
   * attached from all over the place. For example, the method dialog uses one to load in the
   * XML document containing the help.
   */
  builder.onloadHooks = [];

  /**
   * Accepts a function to be as soon as body.html has loaded, which may be immediately if it
   * already has.
   */
  this.addOnloadHook = function (func) {
    if (loaded) {
      func();
    } else {
      builder.onloadHooks.push(func);
    }
  };
  
  this.runOnloadHooks = function() {
    loaded = true;
    for (var i = 0; i < builder.onloadHooks.length; i++) {
      builder.onloadHooks[i]();
    }
  };

  // Start off with a screen that looks identical to the bootstrap html file.
  /** The name of the interface screen is currently being shown. */
  var current_interface = 'booting';
  
  /** @return The name of the current interface being shown. */
  this.getCurrentInterface = function() { return current_interface; }

  /**
   * Switches from the current interface to the new interface.
   * @param new_interface The name of the interface to switch to
   */
  this.switchTo = function (new_interface) {
    builder.interface[current_interface].hide();
    builder.interface[current_interface].active = false;
    builder.interface[new_interface].show();
    builder.interface[current_interface].active = true;
    current_interface = new_interface;
  };
  
  this.getSuite = function() {
    var suiteName = 'recordingSuite0';
    var suite = document.getElementById(suiteName);

    if (suite == null) {
      suite = newNode('div', {class: 'suite', id: suiteName},
        newNode('div', {class:'b-baseurl'},
          newNode('span', {class: 'b-param', id: 'baseurl-input'})
        )
      );
      document.getElementById('steps').appendChild(suite);

      builder.storage.addChangeListener('baseurl', function (v) {
        // Update the base url input field, adding a trailing slash if needed.
        var v2 = v;
        if (v2.lastIndexOf("/") != v2.length - 1) {
          v2 = v2 + "/";
        }
        jQuery('#baseurl-input').html(v2);
      });
      jQuery('#baseurl-input').change(function () {
        // Since the base URL of the script has changed, adjust the URLs of the steps.
        builder.updateBaseURL(this.value); 
        builder.storage.set('baseurl', new builder.Url(this.value).server());
      });

      jQuery(suite).sortable({items: ".b-step", axis: "y"});
      
      // Ensure changes to the base url get persisted.
      var field = jQuery("#baseurl-input");
      field.bind('focus', function() { builder.rememberOldValue(field); });
    }
    return suite;
  }

  // Set up a bunch of stuff!
  this.addOnloadHook(function () {
    // Auto-resize the steps area.
    window.setInterval(function() {
      jQuery('#steplist').css('top', 70 + jQuery('#panels').height());
    }, 150);
    
    // If the user wants to close the recorder while there's unsaved data, ask for confirmation
    var originalShutdown = window.bridge.shutdown;
    window.bridge.shutdown = function() {
      if (typeof builder != 'undefined') {
        if (builder.suite.getSaveRequired()) {
          if (!window.bridge) { return originalShutdown(); }
          var shutdown = true;
          try {
            shutdown = confirm("Are you sure you wish to close the recorder?");
          } catch (e) {}

          if (shutdown) {
            builder.storage.set('save_required', false);
            builder.interface.switchTo('shutdown');
            originalShutdown();
          } else {
            window.bridge.focusWindow();
          }
        } else {
          builder.interface.switchTo('shutdown');
          originalShutdown();
        }
      } else {
        originalShutdown();
      }
    };
    window.onbeforeunload = function() {
      if (builder.suite.getSaveRequired()) {
        return "Any unsaved changes will be lost!";
      }
    };

    // The gmail-esque Loading... box during all AJAX requests
    jQuery.fn.ajaxStart(function () {
      jQuery("#loading").show();
    });
    jQuery.fn.ajaxStop(function () {
      jQuery("#loading").hide();
    });
    
    // Attach a listener to the recorder tab that tells us when the page is being loaded. This
    // allows for waitForPageToLoad events to be generated, for recorders to be attached to
    // newly opened pages, and for local playback to notice when it can go to the next step.
    builder.loadlistener.attach(
        /* root window */ window.bridge.getRecordingWindow(),
        /* window */ window.bridge.getRecordingWindow(),
        /* load */ function(url) {
          builder.storage.set('currenturl', url);
          builder.storage.set('pageloading', false);
        },
        /* unload */ function() {
          builder.storage.set('pageloading', true);
        }
    );
    
    // Set the initial value of currenturl - this is necessary so that the startup-url field is
    // populated.
    builder.storage.set('currenturl', window.bridge.getRecordingWindow().document.location.toString());
  });
})();

// The rest of this document consists of interfaces. Each interface exports a show function, a hide
// function and boolean field called "active" (though not all interfaces look at the value of
// "active".

/** The initial loading message. */
builder.interface.booting = new(function () {
  var error = false;

  // If we get a load error at any time, switch back to the booting interface and display an
  // error message.
  builder.storage.addChangeListener('loaderror', function (value) {
    if (value) {
      error = true;
      // jQuery can't find this for some reason
      document.getElementById('booting-span').textContent = 'Loading seems to have failed, ' +
          'perhaps the network is down?';
      document.getElementById('booting').style.color = 'red';
      builder.interface.switchTo('booting');
    }
  });

  return {
    active: true,
    show: function () {
      jQuery('#booting').show();
    },
    hide: function () {
      if (!error) {
        jQuery('#booting').hide();
        jQuery("#loadMessage").html("Please wait...");
        document.getElementById('cover').style.display = "none";
      }
    }
  };

})();


/**
 * Used to turn off any interace that is currently being shown. Switching to this has the
 * consequence of setting the previous interface's "active" boolean to false.
 */
builder.interface.shutdown = new(function () {
  return {
    show: function () {},
    hide: function () {}
  };
})();

/**
 * The first page the user sees after logging in, lets them choose between loading a script or
 * recording a new one. Consists of a link to show the open dialog and a field for an URL to start
 * recording at.
 */
builder.interface.startup = new(function () { 
  /** Deletes all browser cookies for the domain of the given URL. */
  function deleteURLCookies(url) {
    var domain = "." + builder.getDomainName(url).split("//")[1];
    var man = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
    var en = man.enumerator;
    var cookies = [];
    while (en.hasMoreElements()) {
      cookies.push(en.getNext());
    }
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i];
      // Explain to the cookie that it's a cookie...
      c.QueryInterface(Components.interfaces.nsICookie);
      if (endsWith(domain, c.host)) {
        man.remove(c.host, c.name, c.path, false);
      }
    }
  }

  /** Whether a ends with b. */
  function endsWith(a, b) {
    if (a.length < b.length) { return false; }
    return a.substring(a.length - b.length) == b;
  }
  
  function start_recording(e) {
    start_recording_at(e, jQuery('#startup-url').val());
  }

  /**
   * Start recording at the URL in the input field.
   */
  function start_recording_at(e, urlText) {
    // Remove the anchor that may be at the end of the URL, as otherwise, loading the page
    // does not work properly.
    var anchorIndex = urlText.indexOf('#');
    if (anchorIndex != -1) {
      urlText = urlText.substring(0, anchorIndex);
    }
    var url = new builder.Url(urlText);

    if (!url.hostname()) {
      alert("The URL is not valid and cannot be loaded.");
      jQuery("#startup-url").focus();
      return;
    }

    builder.storage.set('selMajorVersion', "1");
    builder.storage.set('currenturl', url.href());
    builder.storage.set('baseurl', url.server());

    // Delete cookies for given URL.
    deleteURLCookies(url.href());

    // Now load the page - both to ensure we're on the right page when we start recording
    // and to ensure that we get a clean page free of cookie influence.
    // Don't show the record interface until the new page has loaded.
    var isLoading = false;
    var pageLoadListener = function(pageloading) {
      if (pageloading) {
        isLoading = true;
      } else {
        if (isLoading) {
          builder.interface.switchTo('record');
          builder.storage.removeChangeListener('pageloading', pageLoadListener);
        }
      }
    };
    builder.storage.addChangeListener('pageloading', pageLoadListener);
    window.bridge.getRecordingWindow().location = url.href();

    e.preventDefault();
  }
  
  builder.clearAndStartRecordingAt = function(e, urlText) {
    builder.storage.set('testscriptpath', null);
    builder.storage.set('save_required', false);
    jQuery('#steps').html('');
    // Clear any error messages.
    jQuery('#error-panel').hide();
    
    start_recording_at(e, urlText);
  };
  
  /**
   * Imports a file.
   */
  function import_file() {
    var script = builder.seleniumadapter.importScript();
    if (script) {
      open_file(script.path, script);
    }
  }
  
  /**
   * Imports a Selenium2 file.
   */
  function import_sel2_file() {
    var script = builder.loadSel2Script();
    if (script) {
      open_file(null, builder.convertSel2To1(script));
    }
  }
  
  /**
   * Imports an entire test suite.
   */
  function import_suite() {
    var suite = builder.seleniumadapter.importSuite();
    if (suite) {
      builder.suite.setSuite(suite);
    }
    builder.interface.updateRunSuiteOnRC();
  }

  /**
   * Switches to the edit interface and loads the given script into it.
   * @param path The path where the script was loaded from.
   * @param script The script
   */
  function open_file(path, script) {
    // NB Edit interface must be open before we can write into the edit form (jQuery relies on
    // the steps being shown).
    builder.storage.set('selMajorVersion', "1");
    builder.interface.switchTo('edit');

    for (var step = builder.lastStep(); step.id; step = builder.lastStep()) {
      var node = document.getElementById(step.id);
      node.parentNode.removeChild(node);
    }
    jQuery('#steps').empty(); // Empty selenium 2 steps too.
    var steps;
    if (script.version && script.version == "0.3") { // 0.3
      steps = script.steps;
      builder.storage.set('baseurl', new builder.Url(script.baseUrl).server());
    } else {
      steps = script; // 0.1 - 0.2
    }
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].version == "0.1") {
        builder.createStep(steps[i].method, steps[i].params);
      } else { // 0.2 - 0.3
        builder.createStep(steps[i]);
      }
    }
    jQuery('#startup-filebrowser').html('');

    builder.storage.set('testscriptpath', path);
    builder.storage.set('save_required', false);
    
    builder.interface.suite.update();
  }
  
  function open_sel2_file(script) {
    // NB Edit interface must be open before we can write into the edit form (jQuery relies on
    // the steps being shown).
    builder.storage.set('selMajorVersion', "2");
    builder.interface.switchTo('edit');
    
    builder.setCurrentScript(script);
    builder.sel2.updateStepsDisplay();

    builder.storage.set('testscriptpath', script.path);
    builder.storage.set('save_required', false);
    
    builder.interface.suite.update();
  }
  
  builder.openSel2File = open_sel2_file;
  
  /** Export this into the builder namespace: */
  builder.openScript = open_file;

  // Attach listeners to the relevant links and buttons.
  builder.interface.addOnloadHook(function () {
    jQuery('#startup-start-recording').submit(start_recording);
    jQuery('#startup-start-recording-sel2').submit(function() {
      builder.sel2.startRecording(jQuery('#startup-url').val(), false);
    });
    jQuery('#startup-record a').click(start_recording);
    jQuery('#startup-import a').click(import_file);
    jQuery('#startup-import-sel2 a').click(import_sel2_file);
    jQuery('#startup-open-sel2 a').click(function() {
      var script = builder.sel2.loadScript();
      open_sel2_file(script);
    });
    jQuery('#startup-suite-import a').click(import_suite);
    // Populate the input field for the URL to record from.
    builder.storage.addChangeListener('currenturl', function (v) {
      jQuery('#startup-url').val(v);
    });
  });

  return {
    show: function () {
      jQuery('#startup, #heading-startup').show();
    },
    hide: function () {
      jQuery('#startup, #heading-startup').hide();
    }
  };
})();


/**
 * The interface presented while recording is going on.
 */
builder.interface.record = new(function () {
  /**
   * The user has navigated to the current page not by clicking on a link or eg the back button,
   * but by actually entering a URL into the navigation bar.
   */
  var manual_open = false;
  
  /**
   * Adds a new step to the script.
   * @param name The step's name
   * @param params The step's parameters
   * @params immanual You need muuuurderiiiing.
   */
  function record_action(name, params, user_opened_page_manually) {
    if (name == 'open') {
      manual_open = (user_opened_page_manually === true);
      if (builder.lastStep().method() == 'open') {
        return;
      }
    }
    // Keep track of which page we're on at this step.
    params._url = window.bridge.getRecordingWindow().location.toString();
    // The "open" method records the wrong URL if we start recording by entering a different
    // URL than the one we are currently at in the recording window.
    if (name == 'open' && builder.storage.get('baseurl')) {
      params._url = builder.storage.get('baseurl');
    }
    // Also, if the open yields an immediate redirect, fix up the base URL as well as adjusting
    // the initial open step again. If the user adds another open step later, don't take this
    // as an occasion to change the base URL. If the open goes to a different domain, we want
    // to catch this!
    if (builder.lastStep().method() == 'open' && !builder.lastStep().previous()) {
      builder.lastStep()._query('url').get(0).value = params._url;
      builder.storage.set('baseurl', builder.getDomainName(params._url));
    }
    builder.createStep(name, params);
    jQuery('#bottom')[0].scrollIntoView(false);
    builder.storage.set('save_required', true);
  }
  builder.interface.record_sel1_action = record_action;
  builder.interface.record_action = record_action;
  
  // There are two modes of recording actions: normal recording and assertion recording. The user
  // can switch between them by pressing a button.
  /** The name of the record mode we're currently in. */
  var currentRecordMode = null;
  /** The recorder or assert explorer being used, made by the create() function of this mode. */
  var recorderInstance = null;
  /** A listing of the buttons used for switching and what the buttons do. */
  var recordModes = {
    record: {
      help: '#record-help',
      button: null,
      create: function () {
        return new builder.Recorder(window.bridge.getRecordingWindow(), builder.interface.record_action);
      }
    },
    assert: {
      help: '#record-assert-help',
      button: '#record-assert',
      create: function () {
        window.bridge.focusContent();
        return new builder.AssertExplorer(
          window.bridge.getRecordingWindow(),
          function() {},
          function(method, params) {
            builder.interface.record_action(method.replace("assert", "verify"), params);
            //setTimeout(function() { builder.interface.switchTo('record'); }, 0);
            setTimeout(function() { builder.setRecordMode('record'); }, 0);
            window.bridge.focusWindow();
          },
          /*for_choosing_locator*/
          false
        );
      }
    }
  };

  function setRecordMode(mode) {
    if (currentRecordMode) {
      recorderInstance.destroy();
      jQuery(recordModes[currentRecordMode].help).hide();
      if (recordModes[currentRecordMode].button) {
        jQuery(recordModes[currentRecordMode].button).removeClass('is-on');
      }
    }

    currentRecordMode = mode;

    if (currentRecordMode) {
      recorderInstance = recordModes[currentRecordMode].create();
      jQuery(recordModes[currentRecordMode].help).show();
      if (recordModes[currentRecordMode].button) {
        jQuery(recordModes[currentRecordMode].button).addClass('is-on');
      }
    } else {
      window.bridge.setCustomRecordingWindow(null);
    }
  }
  
  builder.setRecordMode = setRecordMode;
  
  /**
   * Set a custom window to record from.
   * @param win The window - or null to go back to the original recorder tab
   */
  function setRecordWindow(win) {
    // Detach the load listener from the page we were listening on.
    builder.loadlistener.detach(window.bridge.getRecordingWindow());
    
    window.bridge.setCustomRecordingWindow(win);
    recorderInstance.destroy();
    recorderInstance = new builder.Recorder(window.bridge.getRecordingWindow(), builder.interface.record_action);
    
    // Reattach the load listeners to their new location.
    
    // Attach a listener to the recorder tab that tells us when the page is being loaded. This
    // allows for waitForPageToLoad events to be generated, for recorders to be attached to
    // newly opened pages, and for local playback to notice when it can go to the next step.
    builder.loadlistener.attach(
        /* root window */ window.bridge.getRecordingWindow(),
        /* window */ window.bridge.getRecordingWindow(),
        /* load */ function(url) {
          builder.storage.set('currenturl', url);
          builder.storage.set('pageloading', false);
        },
        /* unload */ function() {
          builder.storage.set('pageloading', true);
        }
    );
    
    // Set the initial value of currenturl - this is necessary so that the startup-url field is
    // populated.
    builder.storage.set('currenturl', window.bridge.getRecordingWindow().document.location.toString());
  }
  
  builder.setRecordWindow = setRecordWindow;

  function toggleRecordMode(mode) {
    if (mode == currentRecordMode) {
      setRecordMode('record');
    } else {
      setRecordMode(mode);
    }
  }
  
  /**
   * Whether the system has noticed that a page is being loaded. Set to true when the pageloading
   * value in builder.storage is set to true, and set to false again once the page has loaded.
   */ 
  var noticed_loading = false;

  builder.interface.addOnloadHook(function () {
    jQuery('#record-stop-button').click(function (e) {
      if (builder.storage.get('selMajorVersion') == "2") {
        builder.sel2.stopRecording();
      } else {
        builder.interface.switchTo('edit');
      }
    });

    jQuery('#record-assert').click(function (e) {
      if (builder.storage.get('selMajorVersion') == "2") {
        if (builder.sel2.assertExploring) {
          builder.sel2.stopAssertExploring();
        } else {
          builder.sel2.assertExplore();
        }
      } else {
        toggleRecordMode('assert');
      }
    });

    // This attaches a listener to the pageloading value in storage. pageloading is set to
    // true whenever the system detects that a new page is being loaded, and then set to
    // false once it's loaded. However, sometimes (if the load happens quickly?) pageloading
    // is not set to true during the load.
    // The listener is used to inform the user that the recorder is waiting for the page to
    // load and to insert waitForPageToLoad steps into the script.
    builder.storage.addChangeListener('pageloading',
      function (loading) {
        // We only do this if we're actually in record mode.
        if (builder.interface.getCurrentInterface() != 'record') {
          return;
        }
        
        // If loading has just been set to true and we haven't noticed that we're loading a
        // new page yet, set noticed_loading to true and tell the user that we're waiting.
        if (currentRecordMode == 'record' && loading && !noticed_loading) {
          noticed_loading = true;
          // Display a "waiting for page to load" message.
          jQuery('#heading-record').addClass('is-on');
          return;
        }
        
        // Having noticed that we're loading, we are now told that loading is complete.
        // Append a waitForPageToLoad step to tell the playback system to wait for the new
        // page to load before continuing with the next step.
        if (noticed_loading && builder.lastStep().method() != 'open') {
          builder.interface.record_action('waitForPageToLoad', { timeout: 60000 });
          // Attach a recorder to the newly loaded page.
          setRecordMode(currentRecordMode);
          noticed_loading = false;
          // Remove the "waiting for page to load" message.
          jQuery('#heading-record').removeClass('is-on');
          return;
        }
        
        // If the user has navigated to this page by entering an URL in the location
        // bar, adjust the locator for the open step that's been generated.
        if (manual_open && builder.lastStep().method() == 'open') {
          builder.lastStep().locator(get_open_url(bridge.getRecordingWindow().location.toString()));
          manual_open = false;
          // Attach a recorder to the newly loaded page.
          setRecordMode(currentRecordMode);
          noticed_loading = false;
          // Remove the "waiting for page to load" message.
          jQuery('#heading-record').removeClass('is-on');
        }
      }
    );

    // Current URL in heading
    jQuery('#record-url-display').click(function (e) {
      e.preventDefault();
    });

    // A "currently recording at" label in the interface 
    builder.storage.addChangeListener('currenturl', function (url) {
      jQuery('#record-url-display').attr('href', url).text(url);
    });
  });

  /**
   * Takes an url parameter, compares it against the URL of the previous step. If they're on the
   * same server, returns a relative path, otherwise an absolute one.
   */
  function get_open_url(url) {
    var curr = new builder.Url(url);
    var base = new builder.Url(builder.lastStep().url() || builder.storage.get('baseurl'));

    if (base.server() == curr.server()) {
      return curr.path();
    } else {
      return curr.href();
    }
  }

  return {
    show: function () {
      jQuery('#record-panel, #steplist, #heading-record').show();
      // If the previous step's URL doesn't match up with the one we're recording from now,
      // create an "open" step in the script to navigate to the right URL.
      if (builder.lastStep().url() != builder.storage.get('currenturl')) {
        builder.interface.record_action(
          'open',
          { url: get_open_url(builder.storage.get('currenturl')) },
          /* user opened page manually */
          false
        );
        // qqDPS Add a waitForPageToLoad step to ensure the page is loaded before
        // continuing. Note that this is an incomplete solution to the problem of missing
        // waitForPageToLoads causing playback in RC to fail.
        builder.interface.record_action('waitForPageToLoad', {
          timeout: "60000"
        });
      }
      noticed_loading = false;
      jQuery('#heading-record').removeClass('is-on');
      setRecordMode('record');
    },
    hide: function () {
      jQuery('#record-panel, #steplist, #heading-record').hide();
      setRecordWindow(null);
      setRecordMode(null);
    },

    // FIXME - these methods exist so that we can instantiate an AssertExplorer from elsewhere.
    // better solution would be for the explorer/recorder to deal with conflict themselves.
    pause: function () { if (this.active) { setRecordMode(null); } },

    resume: function () { if (this.active) { setRecordMode('record'); } }
  };
})();

builder.interface.updateRunSuiteOnRC = function() {
  if (builder.suite.hasSelenium2Scripts() || builder.storage.get('selMajorVersion')) {
    jQuery("#run-suite-onrc-li").hide();
  } else {
    jQuery("#run-suite-onrc-li").show();
  }
};

/** The mode in which you can edit the script when you're not recording it. */
builder.interface.edit = new(function () {
  builder.interface.addOnloadHook(function () {
    // The following code attaches event listeners to all the buttons below the list of steps
    // in the script. Not all these buttons are visible all the time.
    
    jQuery("#run-onrc-li").show();
    builder.storage.addChangeListener('selMajorVersion', function(selMajorVersion) {
      if (selMajorVersion == "1") {
        jQuery("#run-onrc-li").show();
      } else {
        jQuery("#run-onrc-li").hide();
      }
    });
    builder.interface.updateRunSuiteOnRC();
    jQuery('#run-onrc').bind('click', function () {
      builder.dialogs.rc.show(jQuery("#dialog-attachment-point"), /*play all*/ false);
    });
    // Export button: allows user to export script using Selenium IDE's formatting code.
    jQuery('#script-export').click(
      function() {
        builder.dialogs.exportscript.show(jQuery("#dialog-attachment-point"));
      }
    );
    jQuery('#edit-test-script-nopath-save').click(
      function() {
        builder.dialogs.exportscript.show(jQuery("#dialog-attachment-point"));
      }
    );
    // Discard button: discards unsaved changes in script, if any. Returns to startup interface
    // to let user decide what to do next.
    jQuery('#edit-discard').click(
      function () {
        if (builder.storage.get('save_required', false) == false ||
            confirm("If you continue, you will lose all your recent changes."))
        {
          builder.interface.switchTo('startup');
          builder.storage.set('selMajorVersion', "1"); // By default.
          builder.storage.set('testscriptpath', null);
          builder.storage.set('save_required', false);
          jQuery('#steps').html('');
          // Clear any error messages.
          jQuery('#error-panel').hide();
        }
      }
    );
    // Record button: Record more of the script
    jQuery('#record').click(function () {
      if (builder.storage.get('selMajorVersion') == "2") {
        builder.sel2.continueRecording();
      } else {
        // The user knows this may fail now.
        jQuery('#error-panel').hide();
        builder.interface.switchTo('record');
      }
    });
    // Play button: Play back the script in this browser
    jQuery('#run-locally').click(function () {
      if (builder.storage.get('selMajorVersion') == "2") {
        builder.sel2.playback.runTest();
      } else {
        builder.local.runtest();
      }
    });
    // Stop playback buttons
    jQuery('#edit-stop-local-playback').click(function() {
      if (builder.storage.get('selMajorVersion') == "2") {
        builder.sel2.playback.stopTest();
      } else {
        builder.local.stoptest();
      }
    });
    jQuery('#edit-stop-rc-playback').click(function() {
      builder.rc.stoptest();
    });
    builder.clearResults = function() {
      var script = builder.getScript();
      if (script.steps) { script = script.steps; }
      for (var i = 0; i < script.length; i++) {
        jQuery('#' + script[i].uuid + '-content').css('background-color', '#dddddd');
        jQuery('#' + script[i].uuid + 'error').hide();
        jQuery('#' + script[i].uuid + 'message').hide();  
      }
      jQuery('#edit-clearresults').hide();
    };
    // Clear play results:
    jQuery('#edit-clearresults').click(function() {
      if (builder.storage.get('selMajorVersion') == "2") {
        builder.sel2.playback.clearResults();
        jQuery('#edit-clearresults').hide();
      } else {
        builder.clearResults();
      }
    });
    // Insert button: Insert step
    jQuery('#edit-insert').click(function () {
      builder.createStep("click", {});
      builder.storage.set('save_required', true);
    });
    
    // Bind to the testscriptpath value to display the path of the script 
    builder.storage.addChangeListener('testscriptpath', function (path) {
      if (path) {
        if (path.where == "remote") {
          jQuery("#edit-test-script-nopath").hide();
          jQuery("#edit-test-script-path").show().html("Currently editing: " +
            path.customer_name +
            " / " + path.project_name +
            " / " + path.test_script);
        } else {
          jQuery("#edit-test-script-nopath").hide();
          jQuery("#edit-test-script-path").show().html(
            "Currently editing: " + path.path
          );
        }  
      } else {
        jQuery("#edit-test-script-path").hide();
        jQuery("#edit-test-script-nopath").show();
      }
    });
  });

  return {
    show: function () {
      jQuery('#edit-panel, #steplist, #menu').show();
    },
    hide: function () {
      jQuery('#edit-panel, #steplist, #menu').hide();
    }
  }
})();

/**
 * Interface for manipulating test suite.
 */
builder.interface.suite = new(function () {
  function create_script_li(name, index, isSelected) {
    if (isSelected) {
      return newNode('li', { class: 'currentScript' }, name);
    } else {
      return newNode('li',
        newNode('a', {
            id: 'suite-script-' + index,
            href: '#suite-script-' + index,
            click: function() { builder.suite.switchToScript(index); }
          },
          name)
      );
    }
  }
  
  this.showButtons = function() {
    jQuery('#edit-suite-buttons').show();
  };
  
  this.hideButtons = function() {
    jQuery('#edit-suite-buttons').hide();
  };
  
  this.update = function() {
    if (builder.suite.getNumberOfScripts() > 1) {
      jQuery('#suite-panel, #multiscript-0, #multiscript-1, #multiscript-2').show();
      jQuery('#script-discard-li').hide();
      
      jQuery('#scriptlist').html('');
      var scriptNames = builder.suite.getScriptNames();
      var selectedScriptIndex = builder.suite.getSelectedScriptIndex();
      for (var i = 0; i < scriptNames.length; i++) {
        jQuery('#scriptlist').append(create_script_li(scriptNames[i], i,
            i == selectedScriptIndex));
      }
    } else {
      jQuery('#suite-panel, #multiscript-0, #multiscript-1, #multiscript-2').hide();
      jQuery('#script-discard-li').show();
    }
  };
  
  builder.interface.addOnloadHook(function() {
    jQuery('#edit-suite-stop-playback').click(function() {
      builder.dialogs.runall.stoprun();
    });
    
    jQuery('#suite-removescript').click(function() {
      builder.suite.deleteScript(builder.suite.getSelectedScriptIndex());
      builder.interface.updateRunSuiteOnRC();
    });
    
    jQuery('#suite-addscript').click(function() {
      var script = builder.seleniumadapter.importScript();
      if (script) {
        // Save the current script and unselect it to make sure that when we overwrite its
        // info in the GUI by opening the new script, we don't overwrite its info in
        // builder.suite.
        builder.suite.saveAndDeselectCurrentScript();
        builder.openScript(script.path, script);
        builder.suite.addAndSelectCurrentScript();
        builder.interface.updateRunSuiteOnRC();
      }
    });
    
    jQuery('#suite-importscript-sel2').click(function() {
      var script = builder.loadSel2Script();
      if (script) {
        // Save the current script and unselect it to make sure that when we overwrite its
        // info in the GUI by opening the new script, we don't overwrite its info in
        // builder.suite.
        builder.suite.saveAndDeselectCurrentScript();
        builder.openScript(null, builder.convertSel2To1(script));
        builder.suite.addAndSelectCurrentScript();
        builder.interface.updateRunSuiteOnRC();
      }
    });
    
    jQuery('#suite-addscript-sel2').click(function() {
      var script = builder.sel2.loadScript();
      if (script) {
        // Save the current script and unselect it to make sure that when we overwrite its
        // info in the GUI by opening the new script, we don't overwrite its info in
        // builder.suite.
        builder.suite.saveAndDeselectCurrentScript();
        builder.openSel2File(script);
        builder.suite.addAndSelectCurrentScript();
        builder.interface.updateRunSuiteOnRC();
      }
    });
    
    jQuery('#suite-recordscript').click(function() {
      builder.dialogs.record.show(jQuery('#dialog-attachment-point'));
    });
    
    jQuery('#run-suite-onrc').bind('click', function () {
      builder.dialogs.rc.show(jQuery("#dialog-attachment-point"), /*play all*/ true);
    });
    
    jQuery('#run-suite-locally').bind('click', function () {
      builder.dialogs.runall.runLocally(jQuery("#dialog-attachment-point"));
    });
  
    // Discard button: discards unsaved changes in suite, if any. Returns to startup interface
    // to let user decide what to do next.
    jQuery('#script-discard').click(
      function () {
        if (!builder.suite.getSaveRequired() ||
            confirm("If you continue, you will lose all your recent changes."))
        {
          builder.suite.clearSuite();
          builder.interface.switchTo('startup');
          builder.storage.set('testscriptpath', null);
          builder.storage.set('save_required', false);
          jQuery('#steps').html('');
          // Clear any error messages.
          jQuery('#error-panel').hide();
        }
      }
    );
    
    jQuery('#suite-save').click(
      function() {
        if (builder.suite.canExport()) {
          var path = builder.seleniumadapter.exportSuite(builder.suite.getScriptEntries());
          if (path) {
            builder.storage.set('suitePath', path);
            builder.storage.set('suiteSaveRequired', false);
            builder.interface.suite.update();
          }
        } else {
          alert("Can't save suite. Please save all test scripts to disk as HTML first.");
        }
      }
    );
    
    builder.storage.addChangeListener('suitePath', function(suitePath) {
      jQuery('#edit-suite-path').html("Suite: " + (suitePath ? suitePath : '[Untitled Suite]'));
    });
    
    builder.storage.addChangeListener('suiteSaveRequired', function(suiteSaveRequired) {
      if (suiteSaveRequired) {
        if (builder.suite.canExport()) {
          jQuery('#suite-cannotsave').hide();
          jQuery('#suite-saverequired').show();
        } else {
          jQuery('#suite-cannotsave').show();
          jQuery('#suite-saverequired').hide();
        }
      } else {
        jQuery('#suite-cannotsave').hide();
        jQuery('#suite-saverequired').hide();
      }
    });
    
    builder.interface.suite.update();
  });
})();

/**
 * Listens for new windows being created while recording is going on and offers the option to
 * switch recording to them.
 */
function PopupWindowObserver() {
  this.observe=function(aSubject, aTopic, aData) {
    if (typeof builder == 'undefined') { return; } 
    if (aTopic == "domwindowopened") {
      aSubject.addEventListener("DOMContentLoaded", function (event) {
        var newWindow = event.target.defaultView;
        // Only do this in record mode as otherwise we'll get those popups while playing back or
        // just navigating.
        if (builder.interface.getCurrentInterface() == 'record') {
          // Ignore about windows and chrome windows.
          if ((newWindow.location.href.indexOf("about:") == -1) &&
              (newWindow.location.href.indexOf("chrome://") == -1))
          {
            window.focus();
            if (confirm("We detected a new popup, would you like to \ngenerate commands to select it?")) {
              builder.interface.record_action('waitForPopUp', { windowID:"null", timeout: 3000 });
              builder.interface.record_action('selectWindow', { windowID: newWindow.name }); 
              // Set the focus to the popup window
              builder.setRecordWindow(newWindow);
              aSubject.content.focus();
            }
          }
        }
      }, true);
    } else {
      // If a window has closed.
      if (aSubject.content && aSubject.content.wrappedJSObject.location.href.indexOf("about:") == -1) {
        window.focus();
        if (builder.interface.getCurrentInterface() == 'record') {
          if (confirm("We detected a popup has closed, would you like to \ngenerate commands to close it?")) {
            builder.interface.record_action('close', { });
            builder.interface.record_action('selectWindow', { windowID: "null"});
            builder.setRecordWindow(null);
          }
        }
      }
    }
  }
}
var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
              .getService(Components.interfaces.nsIWindowWatcher);
ww.registerNotification(new PopupWindowObserver());