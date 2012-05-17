builder.selenium2.io.formats.push(builder.selenium2.io.createLangFormatter({
  name: "Php",
  extension: ".php",
  not: "! ",
  start:
    "<?php\n"+
    "require_once 'php-webdriver';" +
	"\n" +
	"$wd = new WebDriver();\n" +
	"//$wd.implicitly_wait(60)\n"+
	"$session = $wd->session();\n"+
	"\n"+
	"function cookies_contain($cookies, $name) {\n"+ 
        "     foreach ($cookies as $arr) {\n"+
        "         if ($arr['name'] == $name) {\n"+
        "             return true;\n"+
        "         }\n"+ 
        "     }\n"+
        "     return false;\n"+
        "}\n"+
	"\n"+
	"function get_cookie($cookies, $name) {\n"+ 
        "     foreach ($cookies as $arr) {\n"+
        "         if ($arr['name'] == $name) {\n"+
        "             return $arr;\n"+
        "         }\n"+ 
        "     }\n"+
        "     return false;\n"+
        "}\n"+
	"\n"+
	"function split_keys($toSend){\n"+
	"$payload = array(\"value\" => preg_split(\"//u\", $toSend, -1, PREG_SPLIT_NO_EMPTY));\n"+
	"return $payload;\n"+
	"}\n\n",
  end:
    "$session->close();\n"+
	"?>",
  lineForType: {
    "get":
      "$session->open(\"{url}\");\n",
    "goBack":
      "$session->back();\n",
    "goForward":
      "$session->forward();\n",
    "clickElement":
      "$session->element({locatorBy}, \"{locator}\")->click();\n",
    "sendKeysToElement":
      "$session->element({locatorBy}, \"{locator}\")->value(\"{text}\");\n",
    "setElementSelected":
      "if (!($session->element({locatorBy}, \"{locator}\")->selected())) {\n" +
	  "    $session->element({locatorBy}, \"{locator}\")->click();\n"+
	  "}\n",
    "setElementNotSelected":
      "if ($session->element({locatorBy}, \"{locator}\")->selected()) {\n" +
	  "    $session->element({locatorBy}, \"{locator}\")->click();\n"+
	  "}\n",
    "submitElement":
      "$session->element({locatorBy}, \"{locator}\")->submit();\n",
    "close":
      "",
    "verifyTextPresent":
      "if ({posNot}(strpos(session->element(\"tag name\", \"html\")->text(), \"{text}\") === false)) {\n" +
	  "    echo \"{negNot}verifyTextPresent failed\";\n"+
	  "}\n",
    "assertTextPresent":
      "if ({posNot}(strpos(session->element(\"tag name\", \"html\")->text(), \"{text}\") === false)) {\n" +
	  "    $session->close();\n" +
	  "    throw new Exception(\"{negNot}assertTextPresent failed\");\n"+
	  "}\n",
    "waitForTextPresent":
      "",
    "verifyBodyText":
      "if ({posNot}(\"{text}\" == $session->element(\"tag_name\", \"html\")->text())) {\n" +
	  "    echo \"{negNot}verifyBodyText failed\";\n"+
	  "}\n",
    "assertBodyText":
      "if ({posNot}(\"{text}\" == $session->find_element_by_tag_name(\"html\")->text())) {\n" +
	  "    $session->close();\n" +
	  "    raise Exception(\"{negNot}assertBodyText failed\");\n"+
	  "}\n",
    "waitForBodyText":
      "",
    "verifyElementPresent":
      "if ({negNot}(strlen($session->element({locatorBy}, \"{locator}\")) == 0 )){\n" +
	  "    echo \"{negNot}verifyElementPresent failed\";\n"+
	  "}\n",
    "assertElementPresent":
      "if ({negNot}(strlen($session->element({locatorBy}, \"{locator}\")) == 0 )){\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertElementPresent failed\");\n"+
	  "}\n",
    "waitForElementPresent":
      "",
    "verifyPageSource":
      "if ({posNot}(($session->get_page_source() == \"{source}\"))) {\n" +
	  "    echo \"{negNot}verifyPageSource failed\");\n"+
	  "}\n",
    "assertPageSource":
      "if ({posNot}($session->get_page_source() == \"{source}\")) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertPageSource failed\");\n"+
	  "}\n",
    "waitForPageSource":
      "",
    "verifyText":
      "if ({posNot}($session->{locatorBy}(\"{locator}\")->text == \"{text}\")) {;\n" +
      "    echo \"{negNot}verifyText failed\";\n",
    "assertText":
      "if ({posNot}($session->{locatorBy}(\"{locator}\")->text == \"{text}\")) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertText failed\");\n"+
	  "}\n",
    "waitForText":
      "",
    "verifyCurrentUrl":
      "if ({posNot}($session->url() == \"{url}\")) {\n" +
	  "    echo \"{negNot}verifyCurrentUrl failed\");\n"+
	  "}\n",
    "assertCurrentUrl":
      "if ({posNot}($session->url() == \"{url}\")) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertCurrentUrl failed\");\n"+
	  "}\n",
    "waitForCurrentUrl":
      "",
    "verifyTitle":
      "if ({posNot}($session->title() == \"{title}\")) {\n" +
	  "    echo \"{negNot}verifyTitle failed\");\n"+
	  "}\n",
    "assertTitle":
      "if ({posNot}($session->title() == \"{title}\") {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertTitle failed\");\n"+
	  "}\n",
    "waitForTitle":
      "",
    "verifyElementSelected":
      "if {posNot}$session->element({locatorBy}, \"{locator}\")->selected() {\n" +
      "    echo \"{negNot}verifyElementSelected failed\");\n",
    "assertElementSelected":
      "if ({posNot}($session->elememt({locatorBy}, \"{locator}\")->selected())) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertElementSelected failed\");\n"+
	  "}\n",
    "waitForElementSelected":
      "",
    "verifyElementValue":
      "if ({posNot}($session->{locatorBy}(\"{locator}\")->attribute(value) == \"{value}\")) {\n" +
	  "    echo \"{negNot}verifyElementValue failed\");\n"+
	  "}\n",
    "assertElementValue":
      "if {posNot}$session->{locatorBy}(\"{locator}\")->attribute(value) == \"{value}\" {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertElementValue failed\");\n"+
	  "}\n",
    "element->waitForValue":
      "",
    "verifyCookieByName":
      "if ({posNot}(get_cookie($session->getAllCookies(), \"{name}\") == \"{value}\")) {\n" +
	  "    echo \"{negNot}verifyCookieByName failed\";\n"+
	  "}\n",
    "assertCookieByName":
      "if ({posNot}(get_cookie($session->getAllCookies(), \"{name}\") == \"{value}\")) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertCookieByName failed\");\n"+
	  "}\n",
    "waitForCookieByName":
      "",
    "verifyCookiePresent":
      "if ({posNot}($session->getAllCookie(\"{name}\")) {\n" +
	  "    echo \"{negNot}verifyCookiePresent failed\");\n"+
	  "}\n",
    "assertCookiePresent":
      "if ({posNot}($session->get_cookie(\"{name}\"))) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertCookiePresent failed\");\n"+
	  "}\n",
    "waitForCookiePresent":
      "",
    "storeTitle":
      "${{variable}} = $session->title();\n"
  },
  locatorByForType: function(stepType, locatorType, locatorIndex) {
    if ({
      "assertElementPresent": 1,
      "verifyElementPresent": 1
    }[stepType.name]) {
      return {
        "class": "\"class\"",
        "id": "\"id\"",
        "link text": "\"link text\"",
        "xpath": "\"xpath\"",
        "css selector": "\"css\"",
        "name": "\"name\""}[locatorType];
    }
    return {
        "class": "\"class\"",
        "id": "\"id\"",
        "link text": "\"link text\"",
        "xpath": "\"xpath\"",
        "css selector": "\"css\"",
        "name": "\"name\""}[locatorType];
  },
  escapeValue: function(stepType, value, pName) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  },
  usedVar: function(varName) { return varName; },
  unusedVar: function(varName) { return varName; }
}));