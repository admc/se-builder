/**
 * Data structure representing Selenium 2. Use "builder.selenium2" to refer to Selenium 2, as
 * opposed to a string or numerical representation. builder.selenium1 and builder.selenium2 both
 * export a stepTypes map and a categories list that have the same interface so that most code
 * doesn't have to know which version of Selenium is being used.
 */
builder.selenium2 = {};

builder.selenium2.StepType = function(name) {
  this.name = name;
};

builder.selenium2.StepType.prototype = {
  /** @return The type's name. */
  getName: function() { return this.name; },
  /** @return List of parameter names. */
  getParamNames: function() { return builder.selenium2.__stepData[this.name] },
  /** @return Whether the given parameter is a "locator" or "string". */
  getParamType: function(paramName) { return paramName == "locator" ? "locator" : "string" }
};

/** Internal step data - converted into stepTypes below. */
builder.selenium2.__stepData = {
  "get":                             ["url"], 
  "goBack":                          [], 
  "goForward":                       [], 
  "clickElement":                    ["locator"], 
  "sendKeysToElement":               ["locator", "text"], 
  "setElementSelected":              ["locator"], 
  "setElementSelected":              ["locator"], 
  "clickElementWithOffset":          ["locator", "offset"], 
  "doubleClickElement":              ["locator"], 
  "element.dragToAndDrop":           ["locator", "locator2"], 
  "element.clickAndHold":            ["locator"], 
  "element.release":                 ["locator"], 
  "sendKeysToElement":               ["locator", "text"], 
  "setElementSelected":              ["locator"], 
  "clearSelections":                 ["locator"], 
  "setElementNotSelected":           ["locator"], 
  "setElementNotSelected":           ["locator"], 
  "submitElement":                   ["locator"], 
  "close":                           [], 
  "refresh":                         [], 
  "assertTextPresent":               ["text"], 
  "verifyTextPresent":               ["text"], 
  "waitForTextPresent":              ["text"], 
  "storeTextPresent":                ["variable", "text"], 
  "assertBodyText":                  ["text"], 
  "verifyBodyText":                  ["text"], 
  "waitForBodyText":                 ["text"], 
  "storeBodyText":                   ["variable"], 
  "assertElementPresent":            ["locator"], 
  "verifyElementPresent":            ["locator"], 
  "waitForElementPresent":           ["locator"], 
  "storeElementPresent":             ["variable", "locator"], 
  "assertPageSource":                ["source"], 
  "verifyPageSource":                ["source"], 
  "waitForPageSource":               ["source"], 
  "storePageSource":                 ["variable"], 
  "assertText":                      ["locator", "text"], 
  "verifyText":                      ["locator", "text"], 
  "waitForText":                     ["locator", "text"], 
  "storeText":                       ["variable", "locator"], 
  "assertCurrentUrl":                ["url"], 
  "verifyCurrentUrl":                ["url"], 
  "waitForCurrentUrl":               ["url"], 
  "storeCurrentUrl":                 ["variable"], 
  "assertTitle":                     ["title"], 
  "verifyTitle":                     ["title"], 
  "waitForTitle":                    ["title"], 
  "storeTitle":                      ["variable"], 
  "assertElementAttribute":          ["locator", "attributeName", "value"], 
  "verifyElementAttribute":          ["locator", "attributeName", "value"], 
  "waitForElementAttribute":         ["locator", "attributeName", "value"], 
  "storeElementAttribute":           ["variable", "locator", "attributeName"], 
  "assertElementSelected":           ["locator"], 
  "verifyElementSelected":           ["locator"], 
  "waitForElementSelected":          ["locator"], 
  "storeElementSelected":            ["variable", "locator"], 
  "assertElementNotSelected":        ["locator"], 
  "verifyElementNotSelected":        ["locator"], 
  "waitForElementNotSelected":       ["locator"], 
  "assertElementValue":              ["locator", "value"], 
  "verifyElementValue":              ["locator", "value"], 
  "waitForElementValue":             ["locator", "value"], 
  "storeElementValue":               ["variable", "locator"], 
  "addCookie":                       ["name", "value", "options"], 
  "deleteCookie":                    ["name"], 
  "assertCookieByName":              ["name", "value"], 
  "verifyCookieByName":              ["name", "value"], 
  "waitForCookieByName":             ["name", "value"], 
  "storeCookieByName":               ["variable", "name"], 
  "assertCookiePresent":             ["name"], 
  "verifyCookiePresent":             ["name"], 
  "waitForCookiePresent":            ["name"], 
  "storeCookiePresent":              ["variable", "name"], 
  "saveScreenshot":                  ["file"], 
  "print":                           ["text"], 
  "store":                           ["text", "variable"]
};

/** Map of step types. */
builder.selenium2.stepTypes = {};
for (var n in builder.selenium2.__stepData) {
  builder.selenium2.stepTypes.push(new builder.selenium2.StepType(n));
}

/** List of categories. */
builder.selenium2.categories = [
  ["Navigation", [
    builder.selenium2.stepTypes.get,
    builder.selenium2.stepTypes.refresh,
    builder.selenium2.stepTypes.goBack,
    builder.selenium2.stepTypes.goForward,
    builder.selenium2.stepTypes.close
  ]],
  ["Input", [
    builder.selenium2.stepTypes.clickElement,
    builder.selenium2.stepTypes.sendKeysToElement,
    builder.selenium2.stepTypes.setElementSelected,
    builder.selenium2.stepTypes.setElementNotSelected,
    builder.selenium2.stepTypes.clearSelections,
    builder.selenium2.stepTypes.submitElement
  ]],
  ["Misc",[
    builder.selenium2.stepTypes.addCookie,
    builder.selenium2.stepTypes.deleteCookie,
    builder.selenium2.stepTypes.saveScreenshot,
    builder.selenium2.stepTypes.print
  ]],
  ["Assertion", [
    builder.selenium2.stepTypes.assertCurrentUrl,
    builder.selenium2.stepTypes.assertTitle,
    builder.selenium2.stepTypes.assertText,
    builder.selenium2.stepTypes.assertTextPresent,
    builder.selenium2.stepTypes.assertBodyText,
    builder.selenium2.stepTypes.assertPageSource,
    builder.selenium2.stepTypes.assertElementSelected,
    builder.selenium2.stepTypes.assertElementNotSelected,
    builder.selenium2.stepTypes.assertElementAttribute,
    builder.selenium2.stepTypes.assertElementValue,
    builder.selenium2.stepTypes.assertCookiePresent,
    builder.selenium2.stepTypes.assertCookieByName
  ]],
  ["Verify", [
    builder.selenium2.stepTypes.verifyCurrentUrl,
    builder.selenium2.stepTypes.verifyTitle,
    builder.selenium2.stepTypes.verifyText,
    builder.selenium2.stepTypes.verifyTextPresent,
    builder.selenium2.stepTypes.verifyBodyText,
    builder.selenium2.stepTypes.verifyPageSource,
    builder.selenium2.stepTypes.verifyElementSelected,
    builder.selenium2.stepTypes.verifyElementNotSelected,
    builder.selenium2.stepTypes.verifyElementAttribute,
    builder.selenium2.stepTypes.verifyElementValue,
    builder.selenium2.stepTypes.verifyCookiePresent,
    builder.selenium2.stepTypes.verifyCookieByName
  ]],
  ["Wait", [
    builder.selenium2.stepTypes.waitForCurrentUrl,
    builder.selenium2.stepTypes.waitForTitle,
    builder.selenium2.stepTypes.waitForText,
    builder.selenium2.stepTypes.waitForTextPresent,
    builder.selenium2.stepTypes.waitForBodyText,
    builder.selenium2.stepTypes.waitForPageSource,
    builder.selenium2.stepTypes.waitForElementSelected,
    builder.selenium2.stepTypes.waitForElementNotSelected,
    builder.selenium2.stepTypes.waitForElementAttribute,
    builder.selenium2.stepTypes.waitForElementValue,
    builder.selenium2.stepTypes.waitForCookiePresent,
    builder.selenium2.stepTypes.waitForCookieByName
  ]],
  ["Store", [
    builder.selenium2.stepTypes.store,
    builder.selenium2.stepTypes.storeCurrentUrl,
    builder.selenium2.stepTypes.storeTitle,
    builder.selenium2.stepTypes.storeText,
    builder.selenium2.stepTypes.storeTextPresent,
    builder.selenium2.stepTypes.storeBodyText,
    builder.selenium2.stepTypes.storePageSource,
    builder.selenium2.stepTypes.storeElementSelected,
    builder.selenium2.stepTypes.storeElementAttribute,
    builder.selenium2.stepTypes.storeElementValue,
    builder.selenium2.stepTypes.storeCookiePresent,
    builder.selenium2.stepTypes.storeCookieByName
  ]]
];