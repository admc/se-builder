builder.sel2 = {};

/**
 * Maps S1 methods to  [type,                   p0,        p1     ]
 * Note that while S1 steps have "locator" and "value" fields, they don't necessarily contain
 * values of that type. They're just names for what are actually positional arguments. In S2 steps,
 * the locator is always a locator, and the value is always not.
 */
builder.sel2.sel1To2 = {
  "open":                 ["get",                             "url",   null      ],
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
  "assertLocation":       ["assertCurrentURL",                "value",   null      ],
  "verifyLocation":       ["verifyCurrentURL",                "value",   null      ],
  "waitForLocation":      ["waitForCurrentURL",               "value",   null      ],
  "assertTitle":          ["assertTitle",                     "value",   null      ],
  "verifyTitle":          ["verifyTitle",                     "value",   null      ],
  "waitForTitle":         ["waitForTitle",                    "value",   null      ],
  "assertChecked":        ["element.assertSelected",          "locator", null      ],
  "verifyChecked":        ["element.verifySelected",          "locator", null      ],
  "waitForChecked":       ["element.waitForSelected",         "locator", null      ],
  "assertValue":          ["element.assertValue",             "locator", "value"   ],
  "verifyValue":          ["element.verifyValue",             "locator", "value"   ],
  "waitForValue":         ["element.waitForValue",            "locator", "value"   ],
  "assertCookieByName":   ["manage.assertCookieNamed",        "value",   "value2"  ],
  "verifyCookieByName":   ["manage.verifyCookieNamed",        "value",   "value2"  ],
  "waitForCookieByName":  ["manage.waitForCookieNamed",       "value",   "value2"  ],
  "assertCookiePresent":  ["manage.assertCookieNamedPresent", "value",   null      ],
  "verifyCookiePresent":  ["manage.verifyCookieNamedPresent", "value",   null      ],
  "waitForCookiePresent": ["manage.waitForCookieNamedPresent","value",   null      ]
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