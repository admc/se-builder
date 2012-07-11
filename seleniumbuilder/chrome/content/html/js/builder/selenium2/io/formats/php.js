builder.selenium2.io.formats.push(builder.selenium2.io.createLangFormatter({
  name: "Php",
  extension: ".php",
  not: "! ",
  start:
    "<?php\n"+
    "require_once 'php-webdriver';" +
	"\n" +
	"$wd = new WebDriver();\n" +
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
	"      $payload = array(\"value\" => preg_split(\"//u\", $toSend, -1, PREG_SPLIT_NO_EMPTY));\n"+
	"      return $payload;\n"+
	"}\n\n",
  end:
    "\n$session->close();\n"+
	"?>",
  lineForType: {
    "get":
      "$session->open({url});\n",
    "goBack":
      "$session->back();\n",
    "goForward":
      "$session->forward();\n",
    "clickElement":
      "$session->element({locatorBy}, {locator})->click();\n",
    "setElementText":
      "$session->element({locatorBy}, {locator})->click();\n" +
      "$session->element({locatorBy}, {locator})->clear();\n" +
      "$session->element({locatorBy}, {locator})->value(split_keys({text}));\n",
    "sendKeysToElement":
      "$session->element({locatorBy}, {locator})->click();\n" +
      "$session->element({locatorBy}, {locator})->value(split_keys({text}));\n",
    "setElementSelected":
      "if (!($session->element({locatorBy}, {locator})->selected())) {\n" +
	  "    $session->element({locatorBy}, {locator})->click();\n"+
	  "}\n",
    "setElementNotSelected":
      "if ($session->element({locatorBy}, {locator})->selected()) {\n" +
	  "    $session->element({locatorBy}, {locator})->click();\n"+
	  "}\n",
    "submitElement":
      "$session->element({locatorBy}, {locator})->submit();\n",
    "close":
      "",
    "verifyTextPresent":
      "if ({posNot}(strpos(session->element(\"tag name\", \"html\")->text(), {text}) === false)) {\n" +
	  "    echo \"{negNot}verifyTextPresent failed\";\n"+
	  "}\n",
    "assertTextPresent":
      "if ({posNot}(strpos(session->element(\"tag name\", \"html\")->text(), {text}) === false)) {\n" +
	  "    $session->close();\n" +
	  "    throw new Exception(\"{negNot}assertTextPresent failed\");\n"+
	  "}\n",
    "waitForTextPresent":
      "",
    "verifyBodyText":
      "if ({posNot}({text} == $session->element(\"tag_name\", \"html\")->text())) {\n" +
	  "    echo \"{negNot}verifyBodyText failed\";\n"+
	  "}\n",
    "assertBodyText":
      "if ({posNot}({text} == $session->find_element_by_tag_name(\"html\")->text())) {\n" +
	  "    $session->close();\n" +
	  "    raise Exception(\"{negNot}assertBodyText failed\");\n"+
	  "}\n",
    "waitForBodyText":
      "",
    "verifyElementPresent":
      "if ({negNot}(strlen($session->element({locatorBy}, {locator})) == 0 )){\n" +
	  "    echo \"{negNot}verifyElementPresent failed\";\n"+
	  "}\n",
    "assertElementPresent":
      "if ({negNot}(strlen($session->element({locatorBy}, {locator})) == 0 )){\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertElementPresent failed\");\n"+
	  "}\n",
    "waitForElementPresent":
      "",
    "verifyPageSource":
      "if ({posNot}(($session->get_page_source() == {source}))) {\n" +
	  "    echo \"{negNot}verifyPageSource failed\");\n"+
	  "}\n",
    "assertPageSource":
      "if ({posNot}($session->get_page_source() == {source})) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertPageSource failed\");\n"+
	  "}\n",
    "waitForPageSource":
      "",
    "verifyText":
      "if ({posNot}($session->{locatorBy}({locator})->text == {text})) {;\n" +
      "    echo \"{negNot}verifyText failed\";\n",
    "assertText":
      "if ({posNot}($session->{locatorBy}({locator})->text == {text})) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertText failed\");\n"+
	  "}\n",
    "waitForText":
      "",
    "verifyCurrentUrl":
      "if ({posNot}($session->url() == {url})) {\n" +
	  "    echo \"{negNot}verifyCurrentUrl failed\");\n"+
	  "}\n",
    "assertCurrentUrl":
      "if ({posNot}($session->url() == {url})) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertCurrentUrl failed\");\n"+
	  "}\n",
    "waitForCurrentUrl":
      "",
    "verifyTitle":
      "if ({posNot}($session->title() == {title})) {\n" +
	  "    echo \"{negNot}verifyTitle failed\");\n"+
	  "}\n",
    "assertTitle":
      "if ({posNot}($session->title() == {title}) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertTitle failed\");\n"+
	  "}\n",
    "waitForTitle":
      "",
    "verifyElementSelected":
      "if {posNot}$session->element({locatorBy}, {locator})->selected() {\n" +
      "    echo \"{negNot}verifyElementSelected failed\");\n",
    "assertElementSelected":
      "if ({posNot}($session->elememt({locatorBy}, {locator})->selected())) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertElementSelected failed\");\n"+
	  "}\n",
    "waitForElementSelected":
      "",
    "verifyElementValue":
      "if ({posNot}($session->{locatorBy}({locator})->attribute(value) == {value})) {\n" +
	  "    echo \"{negNot}verifyElementValue failed\");\n"+
	  "}\n",
    "assertElementValue":
      "if {posNot}$session->{locatorBy}({locator})->attribute(value) == {value} {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertElementValue failed\");\n"+
	  "}\n",
    "element->waitForValue":
      "",
    "verifyCookieByName":
      "if ({posNot}(get_cookie($session->getAllCookies(), {name}) == {value})) {\n" +
	  "    echo \"{negNot}verifyCookieByName failed\";\n"+
	  "}\n",
    "assertCookieByName":
      "if ({posNot}(get_cookie($session->getAllCookies(), {name}) == {value})) {\n" +
	  "    $session->close();\n" +
	  "    throw Exception(\"{negNot}assertCookieByName failed\");\n"+
	  "}\n",
    "waitForCookieByName":
      "",
    "verifyCookiePresent":
      "if ({posNot}($session->getAllCookie({name})) {\n" +
	  "    echo \"{negNot}verifyCookiePresent failed\");\n"+
	  "}\n",
    "assertCookiePresent":
      "if ({posNot}($session->get_cookie({name}))) {\n" +
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
  /**
   * Processes a parameter value into an appropriately escaped expression. Mentions of variables
   * with the ${foo} syntax are transformed into expressions that concatenate the variables and
   * literals.  
   * For example:
   * a${b}c
   * becomes:
   * "a" . b . "c"
   * 
   */
  escapeValue: function(stepType, value, pName) {
    if (stepType.name.startsWith("store") && pName == "variable") { return value; }
    // This function takes a string literal and escapes it and wraps it in quotes.
    function esc(v) { return "\"" + v.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\""; }

    // The following is a transducer that produces the escaped expression by going over each
    // character of the input.
    var output = "";       // Escaped expression.
    var lastChunk = "";    // Accumulates letters of the current literal.
    var hasDollar = false; // Whether we've just encountered a $ character.
    var insideVar = false; // Whether we are reading in the name of a variable.
    var varName = "";      // Accumulates letters of the current variable.
    for (var i = 0; i < value.length; i++) {
      var ch = value.substring(i, i + 1);
      if (insideVar) {
        if (ch == "}") {
          // We've finished reading in the name of a variable.
          // If this isn't the start of the expression, use + to concatenate it.
          if (output.length > 0) { output += " . "; }
          output += varName;
          insideVar = false;
          hasDollar = false;
          varName = "";
        } else {
          // This letter is part of the name of the variable we're reading in.
          varName += ch;
        }
      } else {
        // We're not currently reading in the name of a variable.
        if (hasDollar) {
          // But we *have* just encountered a $, so if this character is a {, we are about to
          // do a variable.
          if (ch == "{") {
            insideVar = true;
            if (lastChunk.length > 0) {
              // Add the literal we've read in to the text.
              if (output.length > 0) { output += " . "; }
              output += esc(lastChunk);
            }
            lastChunk = "";
          } else {
            // No, it was just a lone $.
            hasDollar = false;
            lastChunk += "$" + ch;
          }
        } else {
          // This is the "normal case" - accumulating the letters of a literal. Unless the letter
          // is a $, in which case this may be the start of a 
          if (ch == "$") { hasDollar = true; } else { lastChunk += ch; }
        }
      }
    }
    // Append the final literal, if any, to the output.
    if (lastChunk.length > 0) {
      if (output.length > 0) { output += " . "; }
      output += esc(lastChunk);
    }
    return output;
  },
  usedVar: function(varName) { return varName; },
  unusedVar: function(varName) { return varName; }
}));