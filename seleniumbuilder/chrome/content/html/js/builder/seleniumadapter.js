/**
 * Functions for interfacing with the code from Selenium IDE in the selenium-ide folder.
 */

// Load in bits and pieces evidently required to get export to work. Taken from test-api-doc.js in
// Selenium IDE and modified mildly.
var seleniumAPI = {};
const subScriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
subScriptLoader.loadSubScript('chrome://seleniumbuilder/content/html/js/selenium-ide/selenium/scripts/selenium-api.js', this.seleniumAPI);
var parser = new DOMParser();
var apidoc = parser.parseFromString(FileUtils.readURL("chrome://seleniumbuilder/content/html/js/selenium-ide/selenium/iedoc-core.xml"), "text/xml");
Command.apiDocuments = [apidoc];
Command.prototype.getAPI = function() {
  return seleniumAPI;
};

builder.seleniumadapter = new (function () {
  /**
   * @return Format objects that have a name property that can be displayed.
   */
  this.availableFormats = function() {
    return formatCollection().presetFormats;
  };
  
  /**
   * Allows user to import a suite.
   * @return A suiteInfo object, or null on failure.
   * SuiteInfo structure:
   * {
   *    suitePath: path to the suite file,
   *    scripts: list of script objects with path set
   * }
   */
  this.importSuite = function() {
    try {
      var format = formatCollection().findFormat('default');
      var ts = TestSuite.load();
      var si = { scripts: [], suitePath: ts.file.path };
      for (var i = 0; i < ts.tests.length; i++) {
        var script = this.convertTestCaseToScript(
          format.loadFile(ts.tests[i].getFile()),
          format);
        if (script == null) {
          //alert("Could not open suite: Could not open script " + ts.tests[i].filename);
          alert("Could not open suite: Could not open script.");
          return null;
        }
        si.scripts.push(script);
      }
      return si;
    } catch (e) {
      //alert("Could not open suite:\n" + e);
      alert("Could not open the suite.");
      return null;
    }
  };
  
  /**
   * Allows user to export a suite.
   * @return The path saved to, or null.
   */
  this.exportSuite = function(scripts) {
    try {
      var ts = new TestSuite();
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        var tc = this.convertScriptToTestCase(script);
        tc.file = FileUtils.getFile(scripts.path.path);
        ts.addTestCaseFromContent(tc);
      }
      if (ts.save(false)) {
        return ts.file.path;
      } else {
        return null;
      }
    } catch (e) {
      //alert("Could not save suite:\n" + e);
      alert("Could not save suite.");
      return null;
    }
  };
  
  /**
   * Allows user to import a script in the default format.
   * @return A script, or null on failure.
   */
  this.importScript = function() {
    try {
      var format = formatCollection().findFormat('default');
      return builder.seleniumadapter.convertTestCaseToScript(format.load(), format);
    } catch (e) {
      //alert("Could not open script:\n" + e);
      alert("Could not open script.");
      return null;
    }
  };
    
  /**
   * Exports the given script using the default format.
   * @param script The script to export
   */
  this.exportScript = function(script) {
    return builder.seleniumadapter.exportScriptWithFormat(
      script,
      formatCollection().findFormat('default')
    );
  };
  
  /**
   * Exports the given script using the given format.
   * @param script The script to export
   * @param format The format to use, chosen from availableFormats
   * @return A nsiLocalFile on success, or false on failure
   */
  this.exportScriptWithFormat = function(script, format, extraOptions) {
    var formatter = format.getFormatter();
    try {
      var testCase = builder.seleniumadapter.convertScriptToTestCase(script);
      if (format.saveAs(testCase)) {
        return testCase.file;
      } else {
        return false;
      }
    } catch (e) {
      //alert("Could not export script:\n" + e);
      alert("Could not export script.");
      return false;
    }
  };
  
  /**
   * Exports the given script using the given format to the given path.
   * @param script The script to export
   * @param format The format to use, chosen from availableFormats
   * @param path The path to export to
   * @return A nsiLocalFile on success, or false on failure
   */
  this.exportScriptWithFormatToPath = function(script, format, path, extraOptions) {
    try {
      var testCase = builder.seleniumadapter.convertScriptToTestCase(script);
      if (format.saveAs(testCase, path, false)) {
        return testCase.file;
      } else {
        return false;
      }
    } catch (e) {
      //alert("Could not export script:\n" + e);
      alert("Could not export script.");
      return false;
    }
  };
  
  function formatCollection() {
    return new FormatCollection(SeleniumIDE.Preferences.DEFAULT_OPTIONS);
  }

  this.convertScriptToTestCase = function(script) {
    var testCase = new TestCase();
    testCase.setBaseURL(script.baseUrl);
    for (var i = 0; i < script.steps.length; i++) {
      var step = script.steps[i];
      var cmd = new Command(step.method, step.locator, step.option);
      testCase.commands.push(cmd);
    }
    return testCase;
  };
  
  this.convertTestCaseToScript = function(testCase, originalFormat) {
    if (!testCase) { return null; }
    var script = {
      steps: [],
      version: "0.3",
      seleniumVersion: "1",
      path: {
        where: "local",
        path: (testCase.file ? testCase.file.path : null),
        format: originalFormat
      }
    };
    script.baseUrl = testCase.baseURL;
    for (var i = 0; i < testCase.commands.length; i++) {
      var step = {
        method: testCase.commands[i].command,
        locator: testCase.commands[i].target,
        option: testCase.commands[i].value
      };
      script.steps.push(step);
    }
    return script;
  };
})();
