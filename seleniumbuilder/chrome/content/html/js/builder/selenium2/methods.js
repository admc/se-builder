builder.sel2 = {};

/**
 * Maps S1 methods to  [type,                   p0,        p1     ]
 * Note that while S1 steps have "locator" and "value" fields, they don't necessarily contain
 * values of that type. They're just names for what are actually positional arguments. In S2 steps,
 * the locator is always a locator, and the value is always not.
 */
builder.sel2.sel1To2 = {
  "open":                 ["get",                             "url",     null      ],
  "waitForPageToLoad":    null,
  "goBack":               ["goBack",                          null,      null      ],
  "goForward":            ["goForward",                       null,      null      ],
  "click":                ["clickElement",                    "locator", null      ],
  "type":                 ["sendKeysToElement",               "locator", "text"    ],
  "select":               ["setElementSelected",              "locator", null      ],
  "check":                ["setElementSelected",              "locator", null      ],
//"selectPopUp":          ["switchToWindow",                  "value",   null      ],
  "clickAt":              ["clickElementWithOffset",          "locator", "offset"  ],
  "doubleClick":          ["doubleClickElement",              "locator", null      ],
  "dragAndDropToObject":  ["element.dragToAndDrop",           "locator", "locator2"],
  "mouseDown":            ["element.clickAndHold",            "locator", null      ],
  "mouseUp":              ["element.release",                 "locator", null      ],
  "typeKeys":             ["sendKeysToElement",               "locator", "text"    ],
  "addSelection":         ["setElementSelected",              "locator", null      ],
  "removeAllSelections":  ["clearSelections"   ,              "locator", null      ],
  "removeSelection":      ["setElementNotSelected",           "locator", null      ],
  "uncheck":              ["setElementNotSelected",           "locator", null      ],
  "submit":               ["submitElement",                   "locator", null      ],
  "close":                ["close",                           null,      null      ],
  "refresh":              ["refresh",                         null,      null      ],
  "assertTextPresent":    ["assertTextPresent",               "text",    null      ],
  "verifyTextPresent":    ["verifyTextPresent",               "text",    null      ],
  "waitForTextPresent":   ["waitForTextPresent",              "text",    null      ],
  "assertBodyText":       ["assertBodyText",                  "text",    null      ],
  "verifyBodyText":       ["verifyBodyText",                  "text",    null      ],
  "waitForBodyText":      ["waitForBodyText",                 "text",    null      ],
  "assertElementPresent": ["assertElementPresent",            "locator", null      ],
  "verifyElementPresent": ["verifyElementPresent",            "locator", null      ],
  "waitForElementPresent":["waitForElementPresent",           "locator", null      ],
  "assertHtmlSource":     ["assertPageSource",                "source",  null      ],
  "verifyHtmlSource":     ["verifyPageSource",                "source",  null      ],
  "waitForHtmlSource":    ["waitForPageSource",               "source",  null      ],
  "assertText":           ["assertText",                      "locator", "text"    ],
  "verifyText":           ["verifyText",                      "locator", "text"    ],
  "waitForText":          ["waitForText",                     "locator", "text"    ],
  "assertLocation":       ["assertCurrentUrl",                "url",     null      ],
  "verifyLocation":       ["verifyCurrentUrl",                "url",     null      ],
  "waitForLocation":      ["waitForCurrentUrl",               "url",     null      ],
  "assertTitle":          ["assertTitle",                     "title",   null      ],
  "verifyTitle":          ["verifyTitle",                     "title",   null      ],
  "waitForTitle":         ["waitForTitle",                    "title",   null      ],
  "assertAttribute":      ["assertElementAttribute",          "locator", "attributeName", "value" ],
  "verifyAttribute":      ["verifyElementAttribute",          "locator", "attributeName", "value" ],
  "waitForAttribute":     ["waitElementAttribute",            "locator", "attributeName", "value" ],
  "assertChecked":        ["assertElementSelected",           "locator", null      ],
  "verifyChecked":        ["verifyElementSelected",           "locator", null      ],
  "waitForChecked":       ["waitForElementSelected",          "locator", null      ],
  "assertValue":          ["assertElementValue",              "locator", "value"   ],
  "verifyValue":          ["verifyElementValue",              "locator", "value"   ],
  "waitForValue":         ["waitForElementValue",             "locator", "value"   ],
  "assertCookieByName":   ["assertCookieByName",              "name",    "value"   ],
  "verifyCookieByName":   ["verifyCookieByName",              "name",    "value"   ],
  "waitForCookieByName":  ["waitForCookieByName",             "name",    "value"   ],
  "assertCookiePresent":  ["assertCookiePresent",             "name",    null      ],
  "verifyCookiePresent":  ["verifyCookiePresent",             "name",    null      ],
  "waitForCookiePresent": ["waitForCookiePresent",            "name",    null      ]
};

// Rearrange the information for lookup.
builder.sel2.paramNames = {};
builder.sel2.types = [];

for (var k in builder.sel2.sel1To2) {
  var v = builder.sel2.sel1To2[k];
  if (!v) { continue; }
  builder.sel2.types.push(v[0]);
  var pNames = [];
  if (v[1]) { pNames.push(v[1]); }
  if (v[2]) { pNames.push(v[2]); }
  if (v[3]) { pNames.push(v[3]); }
  builder.sel2.paramNames[v[0]] = pNames;
}

builder.sel2.locatorTypes = [
  "id",
  "name",
  "class name",
  "css selector",
  "tag name",
  "link text",
  "partial link text",
  "xpath"
];