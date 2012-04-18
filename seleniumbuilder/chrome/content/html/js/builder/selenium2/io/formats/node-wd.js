builder.selenium2.io.formats.push(builder.selenium2.io.createLangFormatter({
  name: "Node.JS - WD",
  extension: ".js",
  not: "! ",
  start:
    "var wd = require('wd-candy');\n" +
    "var chain = require('chain-tiny');\n" +
    "\n" +
    "var b = wd.candy();\n\n" +
    "chain(function(next) {\n" +
    "  b.add('init', {browserName:'chrome'}, next);\n" +
    "})\n",
  end:
    ".end(function(err, res) {\n" +
    "  b.add('quit', null);\n" +
    "});",
  lineForType: {
    "get":
      ".chain(function(res, next) {\n" +
      "  b.add('get', '{url}', next);\n" +
      "})\n",
    "goBack":
      "wd.back()\n",
    "goForward":
      "wd.forward()\n",
    "clickElement":
      ".chain(function(res, next) {\n" +
      "  b.add('element', ['{locatorBy}', '{locator}'], next);\n" +
      "})\n" +
      ".chain(function(res, next) {\n" +
      "  b.add('moveTo', [res, 0, 0], next);\n" +
      "})\n" +
      ".chain(function(res, next) {\n" +
      "  b.add('click', 0, next);\n" +
      "})\n",
    "sendKeysToElement":
      "wd.{locatorBy}(\"{locator}\").send_keys(\"{text}\")\n",
    "setElementSelected":
      "if not wd.{locatorBy}(\"{locator}\").is_selected():\n" +
      "    wd.{locatorBy}(\"{locator}\").select()\n",
    "setElementNotSelected":
      "if wd.{locatorBy}(\"{locator}\").is_selected():\n" +
      "    wd.{locatorBy}(\"{locator}\").toggle()\n",
    "submitElement":
      "wd.{locatorBy}(\"{locator}\").submit()\n",
    "close":
      "",
    "verifyTextPresent":
      "if {posNot}\"{text}\" in wd.find_element_by_tag_name(\"html\").text:\n" +
      "    print(\"{negNot}verifyTextPresent failed\")\n",
    "assertTextPresent":
      "if {posNot}\"{text}\" in wd.find_element_by_tag_name(\"html\").text:\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertTextPresent failed\")\n",
    "waitForTextPresent":
      "",
    "verifyBodyText":
      "if {posNot}\"{text}\" == wd.find_element_by_tag_name(\"html\").text:\n" +
      "    print(\"{negNot}verifyBodyText failed\")\n",
    "assertBodyText":
      "if {posNot}\"{text}\" == wd.find_element_by_tag_name(\"html\").text:\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertBodyText failed\")\n",
    "waitForBodyText":
      "",
    "verifyElementPresent":
      "if {negNot}len(wd.{locatorBy}(\"{locator}\")) == 0:\n" +
      "    print(\"{negNot}verifyElementPresent failed\")\n",
    "assertElementPresent":
      "if {negNot}len(wd.{locatorBy}(\"{locator}\")) == 0:\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertElementPresent failed\")\n",
    "waitForElementPresent":
      "",
    "verifyPageSource":
      "if {posNot}wd.get_page_source() == \"{source}\":\n" +
      "    print(\"{negNot}verifyPageSource failed\")\n",
    "assertPageSource":
      "if {posNot}wd.get_page_source() == \"{source}\":\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertPageSource failed\")\n",
    "waitForPageSource":
      "",
    "verifyText":
      "if {posNot}wd.{locatorBy}(\"{locator}\").text == \"{text}\":\n" +
      "    print(\"{negNot}verifyText failed\")\n",
    "assertText":
      "if {posNot}wd.{locatorBy}(\"{locator}\").text == \"{text}\":\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertText failed\")\n",
    "waitForText":
      "",
    "verifyCurrentUrl":
      "if {posNot}wd.current_url == \"{url}\":\n" +
      "    print(\"{negNot}verifyCurrentUrl failed\")\n",
    "assertCurrentUrl":
      "if {posNot}wd.current_url == \"{url}\":\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertCurrentUrl failed\")\n",
    "waitForCurrentUrl":
      "",
    "verifyTitle":
      "if {posNot}wd.title == \"{title}\":\n" +
      "    print(\"{negNot}verifyTitle failed\")\n",
    "assertTitle":
      "if {posNot}wd.title == \"{title}\":\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertTitle failed\")\n",
    "waitForTitle":
      "",
    "verifyElementSelected":
      "if {posNot}wd.{locatorBy}(\"{locator}\").is_selected():\n" +
      "    print(\"{negNot}verifyElementSelected failed\")\n",
    "assertElementSelected":
      "if {posNot}wd.{locatorBy}(\"{locator}\").is_selected():\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertElementSelected failed\")\n",
    "waitForElementSelected":
      "",
    "verifyElementValue":
      "if {posNot}wd.{locatorBy}(\"{locator}\").value == \"{value}\":\n" +
      "    print(\"{negNot}verifyElementValue failed\")\n",
    "assertElementValue":
      "if {posNot}wd.{locatorBy}(\"{locator}\").value == \"{value}\":\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertElementValue failed\")\n",
    "element.waitForValue":
      "",
    "verifyCookieByName":
      "if {posNot}wd.get_cookie(\"{name}\") == \"{value}\":\n" +
      "    print(\"{negNot}verifyCookieByName failed\")\n",
    "assertCookieByName":
      "if {posNot}wd.get_cookie(\"{name}\") == \"{value}\":\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertCookieByName failed\")\n",
    "waitForCookieByName":
      "",
    "verifyCookiePresent":
      "if {posNot}wd.get_cookie(\"{name}\"):\n" +
      "    print(\"{negNot}verifyCookiePresent failed\")\n",
    "assertCookiePresent":
      "if {posNot}wd.get_cookie(\"{name}\"):\n" +
      "    wd.close()\n" +
      "    raise Exception(\"{negNot}assertCookiePresent failed\")\n",
    "waitForCookiePresent":
      ""
  },
  locatorByForType: function(stepType, locatorType, locatorIndex) {
    return locatorType;
  },
  escapeValue: function(stepType, value, pName) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  },
  usedVar: function(varName) { return varName; },
  unusedVar: function(varName) { return varName; }
}));
