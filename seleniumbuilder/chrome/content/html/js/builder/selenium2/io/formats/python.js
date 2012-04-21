builder.selenium2.io.formats.push(builder.selenium2.io.createLangFormatter({
  name: "Python",
  extension: ".py",
  not: "not ",
  start:
    "from selenium.webdriver.firefox.webdriver import WebDriver" +
    "\n" +
    "wd = WebDriver()\n" +
    "wd.implicitly_wait(60)\n",
  end:
    "wd.close()\n",
  lineForType: {
    "get":
      "wd.get(\"{url}\")\n",
    "goBack":
      "wd.back()\n",
    "goForward":
      "wd.forward()\n",
    "clickElement":
      "wd.{locatorBy}(\"{locator}\").click()\n",
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
      "if {posNot}(wd.get_page_source() == \"{source}\"):\n" +
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
      "",
    "storeTitle":
      "${{variable}} = wd.title\n"
  },
  locatorByForType: function(stepType, locatorType, locatorIndex) {
    if ({
      "assertElementPresent": 1,
      "verifyElementPresent": 1
    }[stepType.name]) {
      return {
        "class": "find_elements_by_class_name",
        "id": "find_elements_by_id",
        "link text": "find_elements_by_link_text",
        "xpath": "find_elements_by_xpath",
        "css selector": "find_elements_by_css_selector",
        "name": "find_elements_by_name"}[locatorType];
    }
    return {
      "class": "find_element_by_class_name",
      "id": "find_element_by_id",
      "link text": "find_element_by_link_text",
      "xpath": "find_element_by_xpath",
      "css selector": "find_element_by_css_selector",
      "name": "find_element_by_name"}[locatorType];
  },
  escapeValue: function(stepType, value, pName) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  },
  usedVar: function(varName) { return varName; },
  unusedVar: function(varName) { return varName; }
}));