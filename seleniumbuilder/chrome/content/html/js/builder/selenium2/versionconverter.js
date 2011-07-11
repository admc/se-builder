/**
 * Converts Selenium 1 scripts into Selenium 2 scripts and back. If possible.
 * Selenium 2 steps have the following shape or similar:
 * {
 *   type: e.g "get",
 *   locator: e.g { type: "id", value: "my-id" }
 *   value: e.g "someTextToTypeIn"
 * }
*/

var supportedSel1Steps = [
  "open",
  "waitForPageToLoad",
  "goBack",
  "goForward",
  "click",
  "type",
  "select",
  "check",
//  "typeKeys", [not implemented in Python]
//  "doubleClick", [not implemented yet: issue 244], can maybe fake with executeScript
  /*"selectPopUp",*/
  "clickAt",
  "doubleClick",
  "dragAndDropToObject",
  "mouseDown",
  "mouseUp",
  "typeKeys",
  "addSelection",
  "removeAllSelections",
  "removeSelection",
  "uncheck",
  "submit",
  "close",
  "refresh",
  "assertTextPresent",
  "verifyTextPresent",
  "waitForTextPresent",
  "assertBodyText",
  "verifyBodyText",
  "waitForBodyText",
  "assertElementPresent",
  "verifyElementPresent",
  "waitForElementPresent",
  "assertHTMLSource",
  "verifyHTMLSource",
  "waitForHTMLSource",
  "assertText",
  "verifyText",
  "waitForText",
  "assertLocation",
  "verifyLocation",
  "waitForLocation",
  "assertTitle",
  "verifyTitle",
  "waitForTitle",
  "assertChecked",
  "verifyChecked",
  "waitForChecked",
  "assertValue",
  "verifyValue",
  "waitForValue",
  "assertCookieByName",
  "verifyCookieByName",
  "waitForCookieByName",
  "assertCookiePresent",
  "verifyCookiePresent",
  "waitForCookiePresent"
];

var loc_type_1_2 = [
  ["id", "id"],
  ["name", "name"],
  ["link", "link text"],
  ["css", "css selector"],
  ["xpath", "xpath"]
];

function conv2LocTypeTo1(t) {
  for (var i = 0; i < loc_type_1_2.length; i++) {
    if (loc_type_1_2[i][1] == t) {
      return loc_type_1_2[i][0];
    }
  }
  throw new Exception("No suitable Selenium 1 locator type for \"" + t + "\" found.");
}

function conv1LocTypeTo2(t) {
  for (var i = 0; i < loc_type_1_2.length; i++) {
    if (loc_type_1_2[i][0] == t) {
      return loc_type_1_2[i][1];
    }
  }
  throw new Exception("No suitable Selenium 2 locator type for \"" + t + "\" found.");
}

builder.conv2To1 = function(step) {
  var m = builder.findSel1Method(step.type);
  var stepInfo = builder.sel2.sel1To2[m];
  var newStep = {
    method: m,
    locator: null,
    option: null
  };
  var pNames = ["locator", "option"];
  for (var i = 0; i < 2; i++) {
    if (stepInfo[i + 1]) {
      if (stepInfo[i + 1].startsWith("locator")) {
        newStep[pNames[i]] = conv2LocTypeTo1(step[stepInfo[i + 1]].type) + "=" + step[stepInfo[i + 1]].value;
      } else {
        newStep[pNames[i]] = step[stepInfo[i + 1]];
      }
    }
  }
  var steps = [newStep];
  if (m == "open") {
    newStep.locator = new builder.Url(newStep.locator).path();
    steps.push({method: "waitForPageToLoad", locator: "60000", option: null});
  }
  return steps;
};

builder.convertSel2To1 = function(script) {
  var newScript = {
    steps: [],
    version: "0.3",
    seleniumVersion: "1"
  };
  newScript.baseUrl = builder.findBaseUrl(script);
  for (var i = 0; i < script.steps.length; i++) {
    var newSteps = builder.conv2To1(script.steps[i]);
    for (var i = 0; i < newSteps.length; i++) {
      newScript.steps.push(newSteps[i]);
    }
  }
  return newScript;
};

builder.findBaseUrl = function(script) {
  for (var i = 0; i < script.steps.length; i++) {
    if (script.steps[i].type == "get") {
      return new builder.Url(script.steps[i].value).server();
    }
  }
  return "";
};

builder.findSel1Method = function(type) {
  for (var sel1Method in builder.sel2.sel1To2) {
    if (builder.sel2.sel1To2[sel1Method][0] == type) {
      return sel1Method;
    }
  }
  
  return null;
};

builder.isSel1ScriptConvertible = function(script) {
  for (var i = 0; i < script.steps.length; i++) {
    if (supportedSel1Steps.indexOf(script.steps[i].method) == -1) {
      return false;
    }
  }
  return true;
};

builder.getInconvertibleSel1Steps = function(script) {
  var steps = [];
  for (var i = 0; i < script.steps.length; i++) {
    if (supportedSel1Steps.indexOf(script.steps[i].method) == -1 &&
        steps.indexOf(script.steps[i].method) == -1)
    {
      steps.push(script.steps[i].method);
    }
  }
  
  var result = "";
  for (var i = 0; i < steps.length; i++) {
    if (i != 0) { result += ", "; }
    result += steps[i];
  }
  
  return result;
};

builder.convertSel1To2 = function(script) {
  var newScript = new builder.sel2.Sel2Script();
  /*
  var newScript = {
    version: "selenium2",
    seleniumVersion: "2",
    steps: []
  };*/
  for (var i = 0; i < script.steps.length; i++) {
    newScript.steps = newScript.steps.concat(builder.convertSel1StepTo2Steps(script.steps[i], script.baseUrl));
  }
  return newScript;
};

builder.convertSel1StepTo2Steps = function(step, baseURL) {
  var stepInfo = builder.sel2.sel1To2[step.method];
  if (!stepInfo) { return []; }
  var newStep = new builder.sel2.Sel2Step(stepInfo[0]);
  // The Selenium 1 step has 0-2 parameters, which are always called "locator" and "option",
  // independently of whether they actually *are* locators/not locators.
  for (var param_n = 0; param_n < 2; param_n++) {
    if (stepInfo[param_n + 1]) {
      var param_name = ["locator", "option"][param_n];
      if (stepInfo[param_n + 1].startsWith("locator")) {
        var locInfo = extractSel2LocatorInfo(step[param_name]);
        newStep[stepInfo[param_n + 1]] = { type: conv1LocTypeTo2(locInfo[0]), value: locInfo[1] };
      } else {
        newStep[stepInfo[param_n + 1]] = step[param_name];
      }
    }
  }
  if (step.method == "open") {
    newStep.url = baseURL.substring(0, baseURL.length - 1) + newStep.url;
  }
  return [newStep];
};

function extractSel2LocatorInfo(locator) {
  return [locator.substring(0, locator.indexOf("=")), locator.substring(locator.indexOf("=") + 1)];
}