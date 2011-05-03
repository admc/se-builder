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

/**
 * Maps S1 methods to  [type,                   p0,        p1     ]
 * Note that while S1 steps have "locator" and "value" fields, they don't necessarily contain
 * values of that type. They're just names for what are actually positional arguments. In S2 steps,
 * the locator is always a locator, and the value is always not.
 */
var sel1To2 = {
  "open":                 ["get",                             "value",   null      ],
  "waitForPageToLoad":    null,
  "goBack":               ["navigate.back",                   null,      null      ],
  "goForward":            ["navigate.forward",                null,      null      ],
  "click":                ["element.click",                   "locator", null      ],
  "type":                 ["element.sendKeys",                "locator", "value"   ],
  "select":               ["element.setSelected",             "locator", null      ],
  "check":                ["element.setSelected",             "locator", null      ],
//"selectPopUp":          ["switchToWindow",                  "value",   null      ],
  "clickAt":              ["element.clickWithOffset",         "locator", "value"   ],
  "doubleClick":          ["element.doubleClick",             "locator", null      ],
  "dragAndDropToObject":  ["element.dragToAndDrop",           "locator", "locator2"],
  "mouseDown":            ["element.clickAndHold",            "locator", null      ],
  "mouseUp":              ["element.release",                 "locator", null      ],
  "typeKeys":             ["element.sendKeys",                "locator", "value"   ],
  "addSelection":         ["select.select",                   "locator", "locator2"],
  "removeAllSelections":  ["select.deselectAll",              "locator", null      ],
  "removeSelection":      ["select.deselect",                 "locator", "locator2"],
  "uncheck":              ["element.setNotSelected",          "locator", null      ],
  "submit":               ["element.submit",                  "locator", null      ],
  "close":                ["close",                           null,      null      ],
  "refresh":              ["navigate.refresh",                null,      null      ],
  "assertTextPresent":    ["assertTextPresent",              "value",   null      ],
  "verifyTextPresent":    ["verifyTextPresent",               "value",   null      ],
  "waitForTextPresent":   ["waitForTextPresent",              "value",   null      ],
  "assertBodyText":       ["assertBodyText",                  "value",   null      ],
  "verifyBodyText":       ["verifyBodyText",                  "value",   null      ],
  "waitForBodyText":      ["waitForBodyText",                 "value",   null      ],
  "assertElementPresent": ["element.assertPresent",           "locator", null      ],
  "verifyElementPresent": ["element.verifyPresent",           "locator", null      ],
  "waitForElementPresent":["element.waitForPresent",          "locator", null      ],
  "assertHtmlSource":     ["assertHTMLSource",                "value",   null      ],
  "verifyHtmlSource":     ["verifyHTMLSource",                "value",   null      ],
  "waitForHtmlSource":    ["waitForHTMLSource",               "value",   null      ],
  "assertText":           ["element.assertText",              "locator", "value"   ],
  "verifyText":           ["element.verifyText",              "locator", "value"   ],
  "waitForText":          ["element.waitForText",             "locator", "value"   ],
  "assertLocation":       ["assertCurrentUrl",                "value",   null      ],
  "verifyLocation":       ["verifyCurrentUrl",                "value",   null      ],
  "waitForLocation":      ["waitForCurrentUrl",               "value",   null      ],
  "assertTitle":          ["assertTitle",                     "value",   null      ],
  "verifyTitle":          ["verifyTitle",                     "value",   null      ],
  "waitForTitle":         ["waitForTitle",                    "value",   null      ],
  "assertChecked":        ["element.assertChecked",           "locator", null      ],
  "verifyChecked":        ["element.verifyChecked",           "locator", null      ],
  "waitForChecked":       ["element.waitForChecked",          "locator", null      ],
  "assertValue":          ["element.assertValue",             "locator", null      ],
  "verifyValue":          ["element.verifyValue",             "locator", null      ],
  "waitForValue":         ["element.waitForValue",            "locator", null      ],
  "assertCookieByName":   ["manage.assertCookieNamed",        "value",   "value2"  ],
  "verifyCookieByName":   ["manage.verifyCookieNamed",        "value",   "value2"  ],
  "waitForCookieByName":  ["manage.waitForCookieNamed",       "value",   "value2"  ],
  "assertCookiePresent":  ["manage.assertCookieNamedPresent", "value",   null      ],
  "verifyCookiePresent":  ["manage.verifyCookieNamedPresent", "value",   null      ],
  "waitForCookiePresent": ["manage.waitForCookieNamedPresent","value",   null      ]
};

builder.conv2To1 = function(step) {
  var m = builder.findSel1Method(step.type);
  var stepInfo = sel1To2[m];
  var newStep = {
    method: m,
    locator: null,
    option: null
  };
  var pNames = ["locator", "option"];
  for (var i = 0; i < 2; i++) {
    if (stepInfo[i + 1]) {
      if (stepInfo[i + 1].startsWith("locator")) {
        newStep[pNames[i]] = step[stepInfo[i + 1] + "Type"] + "=" + step[stepInfo[i + 1]];
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
  return steps;*
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
  for (var sel1Method in sel1To2) {
    if (sel1To2[sel1Method][0] == type) {
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

builder.convertSel1StepTo2Steps = function(step, baseURL) {
  var stepInfo = sel1To2[step.method];
  if (!stepInfo) { return []; }
  var newStep = { type: stepInfo[0] };
  // The Selenium 1 step has 0-2 parameters, which are always called "locator" and "option",
  // independently of whether they actually *are* locators/not locators.
  for (var param_n = 0; param_n < 2; param_n++) {
    if (stepInfo[param_n + 1]) {
      var param_name = ["locator", "option"][param_n];
      if (stepInfo[param_n + 1].startsWith("locator")) {
        var locInfo = extractSel2LocatorInfo(step[param_name]);
        newStep[stepInfo[param_n + 1] + "Type"] = locInfo[0];
        newStep[stepInfo[param_n + 1]] = locInfo[1];
      }
      if (stepInfo[param_n + 1].startsWith("value")) {
        newStep[stepInfo[param_n + 1]] = step[param_name];
      }
    }
  }
  if (step.method == "open") {
    newStep.value = baseURL.substring(0, baseURL.length - 1) + newStep.value;
  }
  return [newStep];
};

function extractSel2LocatorInfo(locator) {
  return locator.split("=", 2);
}

builder.convertSel2StepTo1Steps = function(step) {
  
};