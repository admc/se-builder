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
  // Load Selenium
  "selenium/htmlutils.js",
  "selenium/selenium-logging.js",
  "selenium/selenium-browserdetect.js",
  "selenium/selenium-browserbot.js",
  "selenium/selenium-api.js",
  "selenium/selenium-commandhandlers.js",
  // Load Se Builder
  "builder/utils.js",
  "builder/io.js",
  "builder/storage.js",
  "builder/script.js",
  "builder/loadlistener.js",
  "builder/verifyexplorer.js",
  "builder/listeners.js",
  "builder/gui.js",
  "builder/gui/menu.js",
  "builder/gui/suite.js",
  "builder/views/booting.js",
  "builder/views/startup.js",
  "builder/views/script.js",
  "builder/selenium1/init.js",
  "builder/selenium1/seleniumpatch.js",
  "builder/selenium1/methods.js",
  // Load in user-extensions.js
  "user-extensions.js",
  // Deal with the changes it made
  "builder/selenium1/extensions.js",
  // Load more Builder
  "builder/selenium1/selenium1.js",
  "builder/selenium1/recorder.js",
  "builder/selenium1/playback.js",
  "builder/selenium1/rcPlayback.js",
  "builder/selenium1/docs.js",
  // Load SB/Selenium IDE format adapter
  "builder/selenium1/adapter.js",
  "builder/selenium2/selenium2.js",
  "builder/versionconverter.js",
  "builder/selenium2/io/io.js",
  "builder/selenium2/io/formats/json.js",
  "builder/selenium2/io/formats/java.js",
  "builder/selenium2/io/formats/ruby.js",
  "builder/selenium2/io/formats/python.js",
  "builder/selenium2/io/formats/php.js",
  "builder/selenium2/io/formats/node-wd.js",
  "builder/selenium2/io/formats/english.js",
  "builder/locator2.js",
  "builder/suite2.js",
  "builder/stepdisplay.js",
  "builder/selenium2/playback.js",
  "builder/selenium2/recorder.js",
  "builder/selenium2/docs.js",
  "builder/record.js",
  "builder/dialogs/dialogs.js",
  "builder/dialogs/convert.js",
  "builder/dialogs/exportscript.js",
  "builder/dialogs/rc.js",
  "builder/dialogs/record.js",
  "builder/dialogs/runall.js",
  "builder/gui/stepstable.js",
  "builder/ignition.js"
);
