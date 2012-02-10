var builder = {};
builder.loader = {};

builder.loader.loadScripts = function() {
  for (var i = 0; i < arguments.length; i++) {
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    // Force no caching.
    script.setAttribute('src', "js/" + arguments[i] + "?" + Math.random());
    // Above line may not work due to security reasons, so let's try a different
    // way too.
    document.getElementsByTagName('head')[0].appendChild(script);
  }
};

/** Functions that get executed once everything has been loaded. */
builder.postLoadHooks = [];

/** Register a function to be executed once everything has been loaded. */
builder.registerPostLoadHook = function(f) {
  if (builder.loaded) {
    f();
  } else {
    builder.postLoadHooks.push(f);
  }
};

builder.loader.loadScripts(
  // Load Libraries
  "lib/jquery-ui-1.8.17.custom/js/jquery-1.7.1.min.js",
  "lib/jquery-ui-1.8.17.custom/js/jquery-ui-1.8.17.custom.min.js",
  "lib/cssQuery-p.js",
  "lib/browserdetect.js",
  "lib/json2.js",
  "lib/js-xpath.js",
  // Load Selenium IDE Formats & TestCase/Suite
  "selenium-ide/xhtml-entities.js",
  "selenium-ide/preferences.js",
  "selenium-ide/tools.js",
  "selenium-ide/file-utils.js",
  "selenium-ide/testCase.js",
  "selenium-ide/testSuite.js",
  "selenium-ide/format.js",
  // Load SB/Selenium IDE format adapter
  "builder/seleniumadapter.js",
  // Load Selenium
  "selenium/htmlutils.js",
  "selenium/selenium-logging.js",
  "selenium/selenium-browserdetect.js",
  "selenium/selenium-browserbot.js",
  "selenium/selenium-api.js",
  "selenium/selenium-commandhandlers.js",
  // Load Selenium Builder
  "builder/utils.js",
  "builder/storage.js",
  "builder/loadlistener.js",
  "builder/locator2.js",
  "builder/recorder.js",
  "builder/verifyexplorer.js",
  "builder/listeners.js",
  "builder/gui.js",
  "builder/gui/menu.js",
  "builder/gui/suite.js",
  "builder/views/booting.js",
  "builder/views/startup.js",
  "builder/views/script.js",
  "builder/seleniumpatch.js",
  "builder/selenium1/selenium1.js",
  // Load in user-extensions.js
  "user-extensions.js",
  // Deal with the changes it made
  "builder/extensions.js",
  // Load more Builder
  "builder/selenium2/selenium2.js",
  "builder/script.js",
  "builder/selenium2/versionconverter.js",
  "builder/selenium2/io.js",
  "builder/selenium2/script.js",
  "builder/selenium2/stepdisplay.js",
  "builder/selenium2/playback.js",
  "builder/selenium2/recorder.js",
  "builder/selenium2/record.js",
  "builder/selenium2/docs.js",
  "builder/dialogs/dialogs.js",
  "builder/dialogs/method.js",
  "builder/dialogs/locator.js",
  "builder/dialogs/values.js",
  "builder/dialogs/exportscript.js",
  "builder/dialogs/editparam.js",
  "builder/dialogs/rc.js",
  "builder/dialogs/record.js",
  "builder/dialogs/runall.js",
  "builder/step.js",
  "builder/rc.js",
  "builder/local.js",
  "builder/suite.js",
  "builder/ignition.js"
);