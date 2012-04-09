builder.versionconverter = {};

builder.versionconverter.conversionHooks = {};

builder.versionconverter.addHook = function(srcType, srcVersion, targetVersion, f) {
  var key = srcType.getName() + "-" + srcVersion + "-" + targetVersion;
  builder.versionconverter.conversionHooks[key] = f;
};

builder.versionconverter.addHook(builder.selenium1.stepTypes.waitForPageToLoad, builder.selenium1, builder.selenium2, function(step, src, tar) {
  return [];
});

// Need to combine the selectLocator and optionLocator into a single locator for Selenium 2.
builder.versionconverter.convertSelectStep1To2 = function(step, sourceVersion, targetVersion) {
  var newStep = builder.versionconverter.defaultConvertStep(step, sourceVersion, targetVersion)[0];
  var locVals = {};
  if (step.selectLocator.supportsMethod(builder.locator.methods.xpath)) {
    locVals[builder.locator.methods.xpath] = step.selectLocator.getValue(builder.locator.methods.xpath) +
      "/*[. = '" + step.optionLocator + "']";
  } else if (step.selectLocator.supportsMethod(builder.locator.methods.id)) {
    locVals[builder.locator.methods.xpath] = "//*[@id='" + step.selectLocator.getValue(builder.locator.methods.id) +
      "']/*[. = '" + step.optionLocator + "']";
  }
  var newLoc = new builder.locator.Locator(builder.locator.methods.xpath, locVals);
  newStep.locator = newLoc;
  return [newStep];
};

builder.versionconverter.addHook(builder.selenium1.stepTypes.select, builder.selenium1, builder.selenium2, builder.versionconverter.convertSelectStep1To2);
builder.versionconverter.addHook(builder.selenium1.stepTypes.removeSelection, builder.selenium1, builder.selenium2, builder.versionconverter.convertSelectStep1To2);
builder.versionconverter.addHook(builder.selenium1.stepTypes.addSelection, builder.selenium1, builder.selenium2, builder.versionconverter.convertSelectStep1To2);

builder.versionconverter.convertStep = function(step, sourceVersion, targetVersion) {
  var key = step.type.getName() + "-" + sourceVersion + "-" + targetVersion;
  if (builder.versionconverter.conversionHooks[key]) {
    return builder.versionconverter.conversionHooks[key](step, sourceVersion, targetVersion);
  }
  return builder.versionconverter.defaultConvertStep(step, sourceVersion, targetVersion);
}

builder.versionconverter.defaultConvertStep = function(step, sourceVersion, targetVersion) {
  var newStep = null;
  if (sourceVersion == builder.selenium1 && targetVersion == builder.selenium2) {
    newStep = new builder.Step(builder.selenium2.stepTypes[builder.versionconverter.sel1ToSel2Steps[step.type.getName()]]);
  }
  if (sourceVersion == builder.selenium2 && targetVersion == builder.selenium1) {
    newStep = new builder.Step(builder.selenium1.stepTypes[builder.versionconverter.sel2ToSel1Steps[step.type.getName()]]);
  }
  if (newStep != null) {
    var srcParamNames = step.getParamNames();
    var targetParamNames = newStep.getParamNames();
    for (var i = 0; i < srcParamNames.length && i < targetParamNames.length; i++) {
      newStep[targetParamNames[i]] = step[srcParamNames[i]];
    }
    return [newStep];
  }
  return null;
};

builder.versionconverter.convertScript = function(script, targetVersion) {
  var newScript = new builder.Script(targetVersion);
  for (var i = 0; i < script.steps.length; i++) {
    var newSteps = builder.versionconverter.convertStep(script.steps[i], script.seleniumVersion, targetVersion);
    for (var j = 0; j < newSteps.length; j++) {
      newScript.addStep(newSteps[j]);
    }
  }
  return newScript;
};

builder.versionconverter.nonConvertibleStepNames = function(script, targetVersion) {
  var names = [];
  for (var i = 0; i < script.steps.length; i++) {
    try {
      if (builder.versionconverter.convertStep(script.steps[i], script.seleniumVersion, targetVersion) == null) {
        names.push(script.steps[i].type.getName());
      }
    } catch (e) {
      names.push(script.steps[i].type.getName());
    }
  }
  return names;
};

builder.versionconverter.canConvert = function(script, targetVersion) {
  return builder.versionconverter.nonConvertibleStepNames(script, targetVersion).length == 0;
};

builder.versionconverter.sel1ToSel2Steps = {
  "open":                 "get",
  "goBack":               "goBack",
  "goForward":            "goForward",
  "click":                "clickElement",
  "type":                 "sendKeysToElement",
  "select":               "setElementSelected",
  "check":                "setElementSelected",
  "clickAt":              "clickElementWithOffset",
  "doubleClick":          "doubleClickElement",
  "dragAndDropToObject":  "element.dragToAndDrop",
  "mouseDown":            "element.clickAndHold",
  "mouseUp":              "element.release",
  "typeKeys":             "sendKeysToElement",
  "addSelection":         "setElementSelected",
  "removeAllSelections":  "clearSelections",
  "removeSelection":      "setElementNotSelected",
  "uncheck":              "setElementNotSelected",
  "submit":               "submitElement",
  "close":                "close",
  "refresh":              "refresh",
  "assertTextPresent":    "assertTextPresent",
  "verifyTextPresent":    "verifyTextPresent",
  "waitForTextPresent":   "waitForTextPresent",
  "storeTextPresent":     "storeTextPresent",
  "assertBodyText":       "assertBodyText",
  "verifyBodyText":       "verifyBodyText",
  "waitForBodyText":      "waitForBodyText",
  "storeBodyText":        "storeBodyText",
  "assertElementPresent": "assertElementPresent",
  "verifyElementPresent": "verifyElementPresent",
  "waitForElementPresent":"waitForElementPresent",
  "storeElementPresent":  "storeElementPresent",
  "assertHtmlSource":     "assertPageSource",
  "verifyHtmlSource":     "verifyPageSource",
  "waitForHtmlSource":    "waitForPageSource",
  "storeHtmlSource":      "storePageSource",
  "assertText":           "assertText",
  "verifyText":           "verifyText",
  "waitForText":          "waitForText",
  "storeText":            "storeText",
  "assertLocation":       "assertCurrentUrl",
  "verifyLocation":       "verifyCurrentUrl",
  "waitForLocation":      "waitForCurrentUrl",
  "storeLocation":        "storeCurrentUrl",
  "assertTitle":          "assertTitle",
  "verifyTitle":          "verifyTitle",
  "waitForTitle":         "waitForTitle",
  "storeTitle":           "storeTitle",
  "assertAttribute":      "assertElementAttribute",
  "verifyAttribute":      "verifyElementAttribute",
  "waitForAttribute":     "waitForElementAttribute",
  "storeAttribute":       "storeElementAttribute",
  "assertChecked":        "assertElementSelected",
  "verifyChecked":        "verifyElementSelected",
  "waitForChecked":       "waitForElementSelected",
  "storeChecked":         "storeElementSelected",
  "assertNotChecked":     "assertElementNotSelected",
  "verifyNotChecked":     "verifyElementNotSelected",
  "waitForNotChecked":    "waitForElementNotSelected",
  "assertValue":          "assertElementValue",
  "verifyValue":          "verifyElementValue",
  "waitForValue":         "waitForElementValue",
  "storeValue":           "storeElementValue",
  "createCookie":         "addCookie",
  "deleteCookie":         "deleteCookie",
  "assertCookieByName":   "assertCookieByName",
  "verifyCookieByName":   "verifyCookieByName",
  "waitForCookieByName":  "waitForCookieByName",
  "storeCookieByName":    "storeCookieByName",
  "assertCookiePresent":  "assertCookiePresent",
  "verifyCookiePresent":  "verifyCookiePresent",
  "waitForCookiePresent": "waitForCookiePresent",
  "storeCookiePresent":   "storeCookiePresent",
  "captureEntirePageScreenshot": "saveScreenshot",
  "echo":                 "print"
};

builder.versionconverter.sel2ToSel1Steps = {};

for (var a in builder.versionconverter.sel1ToSel2Steps) {
  builder.versionconverter.sel2ToSel1Steps[builder.versionconverter.sel1ToSel2Steps[a]] = a;
}