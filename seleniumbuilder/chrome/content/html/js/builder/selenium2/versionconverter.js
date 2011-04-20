/**
 * Converts Selenium 1 scripts into Selenium 2 scripts and back. If possible.
 * Selenium 2 steps have the following shape:
 * {
 *   type: e.g "get",
 *   locatorType: one of ["class", "id", "link", "xpath", "css"] 
 *   locator: e.g "my-id",
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
  "typeKeys",
//  "doubleClick", [not implemented yet: issue 244], can maybe fake with executeScript
  "verifyTextPresent",
  "selectPopUp"
];

/**
 * Maps S1 methods to  [type,                   p0,        p1     ]
 * Note that while S1 steps have "locator" and "value" fields, they don't necessarily contain
 * values of that type. They're just names for what are actually positional arguments. In S2 steps,
 * the locator is always a locator, and the value is always not.
 */
var sel1To2 = {
  "open":              ["get",                  "value",   null   ],
  "waitForPageToLoad": null,
  "goBack":            ["navigate.back",        null,      null   ],
  "goForward":         ["navigate.forward",     null,      null   ],
  "click":             ["element.click",        "locator", null   ],
  "type":              ["element.sendKeys",     "locator", "value"],
  "select":            ["element.setSelected",  "locator", "value"],
  "check":             ["element.setSelected",  "locator", "value"],
  "typeKeys":          ["getKeyboard.sendKeys", "value",   null   ],
  "verifyTextPresent": ["verifyTextPresent",    "value",   null   ],
  "selectPopUp":       ["switchTo",             "value",   null   ]
};

builder.isSel1ScriptConvertible = function(script) {
  for (var i = 0; i < script.steps.length; i++) {
    if (supportedSel1Steps.indexOf(script.steps[i].method) == -1) {
      return false;
    }
  }
  return true;
};

builder.convertSel1To2 = function(script) {
  var newScript = {
    version: "selenium2",
    seleniumVersion: "2",
    steps: []
  };
  for (var i = 0; i < script.steps.length; i++) {
    newScript.steps = newScript.steps.concat(builder.convertSel1StepTo2Steps(script.steps[i], script.baseUrl));
  }
  return newScript;
};

builder.convertSel2To1 = function(script) {
  
};

builder.convertSel1StepTo2Steps = function(step, baseURL) {
  var stepInfo = sel1To2[step.method];
  if (!stepInfo) { return []; }
  var newStep = { type: stepInfo[0] };
  for (var param_n = 0; param_n < 2; param_n++) {
    var param_name = ["locator", "option"][param_n];
    if (stepInfo[param_n + 1] == "locator") {
      var locInfo = extractSel2LocatorInfo(step[param_name]);
      newStep.locatorType = locInfo[0];
      newStep.locator = locInfo[1];
    }
    if (stepInfo[param_n + 1] == "value") {
      newStep.value = step[param_name];
    }
  }
  if (step.method == "open") {
    newStep.value = baseURL.substring(0, baseURL.length - 1) + newStep.value;
  }
  return [newStep];
};

function extractSel2LocatorInfo(locator) {
  return locator.split("\"", 2);
}

builder.convertSel2StepTo1Steps = function(step) {
  
};