builder.selenium2.io.formats.push(builder.selenium2.io.createLangFormatter({
  name: "C#",
  extension: ".cs",
  not: "!",
  start:
    "using OpenQA.Selenium;\n" +
     "using OpenQA.Selenium.Remote;\n" +
     "using OpenQA.Selenium.Support.UI;\n"+
      "using System;" +
    "\n" +
    "namespace se_builder {\n" +
    "  public class {name} {\n" +
    "    static void Main(string[] args) {\n" +
	"        IWebDriver wd = new RemoteWebDriver (DesiredCapabilities.Firefox ());\n",
  end:
    "        wd.Quit();\n" +
    "    }\n" +
    "  }\n}\n",
  lineForType: {
    "print":
      "        Console.WriteLine({text});\n",
    "store":
      "        ${{variable}:string} = \"\" + {text};\n",
    "get":
      "        wd.Navigate().GoToUrl({url});\n",
    "goBack":
      "        wd.Navigate().Back();\n",
    "goForward":
      "        wd.Navigate().Forward();\n",
    "clickElement":
      "        wd.FindElement(By.{locatorBy}({locator})).Click();\n",
    "setElementText":
      "        wd.FindElement(By.{locatorBy}({locator})).Click();\n" +
      "        wd.FindElement(By.{locatorBy}({locator})).Clear();\n" +
      "        wd.FindElement(By.{locatorBy}({locator})).SendKeys({text});\n",
    "sendKeysToElement":
      "        wd.FindElement(By.{locatorBy}({locator})).Click();\n" +
      "        wd.FindElement(By.{locatorBy}({locator})).SendKeys({text});\n",
    "setElementSelected":
      "        if (!wd.FindElement(By.{locatorBy}({locator})).Selected) {\n" +
      "            wd.FindElement(By.{locatorBy}({locator})).Click();\n" +
      "        }\n",
    "setElementNotSelected":
      "        if (wd.FindElement(By.{locatorBy}({locator})).Selected) {\n" +
      "            wd.FindElement(By.{locatorBy}({locator})).Click();\n" +
      "        }\n",
    "submitElement":
      "        wd.FindElement(By.{locatorBy}({locator})).Submit();\n",
    "close":
      "        wd.Close();\n",
    "refresh":
      "        wd.Navigate().Refresh();\n",
    "addCookie":
      function(step, escapeValue) {
	var c_name = "c" + step.id;
        var r = "        Cookie " + c_name + " = new Cookie(" + escapeValue(step.type, step.name) + ", " + escapeValue(step.type, step.value);
        var opts = step.options.split(",");
        for (var i = 0; i < opts.length; i++) {
          var kv = opts[i].trim().split("=");
          if (kv.length == 1) { continue; }
          if (kv[0] == "path") {
            var path = escapeValue(step.type, kv[1]);
          }
          if (kv[0] == "max_age") {
            var max_age = "DateTime.Now.AddSeconds((double)" + parseInt(kv[1])+")";
          }
        }
	  if (path) {
	      r += ", "+path;
	      if (max_age) {
		  r += ", "+max_age;
	      }
	  }
	  r += ");\n";
	r += "        wd.Manage().Cookies.AddCookie(c" + step.id + ");\n";	
	return r;
      },
    "deleteCookie":
      function(step, escapeValue) {
        return(
        "        Cookie c" + step.id + " = wd.Manage().Cookies.GetCookieNamed(" + escapeValue(step.type, step.name) + ");\n" +
        "        if (c" + step.id + " != null) { wd.Manage().Cookies.DeleteCookie(c" + step.id + "); }\n");
      },
    "assertTextPresent":
      "        if ({posNot}(wd.FindElement(By.TagName(\"html\")).Text.Contains({text}))) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertTextPresent failed\");\n" +
      "        }\n",
    "verifyTextPresent":
      "        if ({posNot}(wd.FindElement(By.TagName(\"html\")).Text.Contains({text}))) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyTextPresent failed\");\n" +
      "        }\n",
    "waitForTextPresent":
      "",
    "storeTextPresent":
      "        ${{variable}:bool} = wd.FindElement(By.TagName(\"html\")).Text.Contains({text});\n",
    "assertBodyText":
      "        if ({posNot}(wd.FindElement(By.TagName(\"html\")).Text == {text})) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertBodyText failed\");\n" +
      "        }\n",
    "verifyBodyText":
      "        if ({posNot}(wd.FindElement(By.TagName(\"html\")).Text == {text})) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyBodyText failed\");\n" +
      "        }\n",
    "waitForBodyText":
      "",
    "storeBodyText":
      "        ${{variable}:string} = wd.FindElement(By.TagName(\"html\")).Text;\n",
    "assertElementPresent":
      "        if ({negNot}(wd.FindElements(By.{locatorBy}({locator})).Count == 0)) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertElementPresent failed\");\n" +
      "        }\n",
    "verifyElementPresent":
      "        if ({negNot}(wd.FindElements(By.{locatorBy}({locator})).Count == 0)) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyElementPresent failed\");\n" +
      "        }\n",
    "waitForElementPresent":
      "",
    "storeElementPresent":
      "        ${{variable}:bool} = wd.FindElements(By.{locatorBy}({locator})).Count == 0;\n",
    "assertPageSource":
      "        if ({posNot}(wd.PageSource == {source})) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertPageSource failed\");\n" +
      "        }\n",
    "verifyPageSource":
      "        if ({posNot}(wd.PageSource == {source})) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyPageSource failed\");\n" +
      "        }\n",
    "waitForPageSource":
      "",
    "storePageSource":
      "        ${{variable}:string} = wd.PageSource;\n",
    "assertText":
      "        if ({posNot}(wd.FindElement(By.{locatorBy}({locator})).Text == {text})) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertText failed\");\n" +
      "        }\n",
    "verifyText":
      "        if ({posNot}(wd.FindElement(By.{locatorBy}({locator})).Text == {text})) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyText failed\");\n" +
      "        }\n",
    "waitForText":
      "",
    "storeText":
      "        ${{variable}:string} = wd.FindElement(By.{locatorBy}({locator})).Text;\n",
    "assertCurrentUrl":
      "        if ({posNot}(wd.Url == {url})) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertCurrentUrl failed\");\n" +
      "        }\n",
    "verifyCurrentUrl":
      "        if ({posNot}(wd.Url == {url})) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyCurrentUrl failed\");\n" +
      "        }\n",
    "storeCurrentUrl":
      "        ${{variable}:string} = wd.Url;\n",
    "waitForCurrentUrl":
      "",
    "assertTitle":
      "        if ({posNot}(wd.Title == {title})) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertTitle failed\");\n" +
      "        }\n",
    "verifyTitle":
      "        if ({posNot}(wd.Title == {title})) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyTitle failed\");\n" +
      "        }\n",
    "storeTitle":
      "        ${{variable}:string} = wd.Title;\n",
    "waitForTitle":
      "",
    "assertElementSelected":
      "        if ({posNot}(wd.FindElement(By.{locatorBy}({locator})).Selected)) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertElementSelected failed\");\n" +
      "        }\n",
    "verifyElementSelected":
      "        if ({posNot}(wd.FindElement(By.{locatorBy}({locator})).Selected)) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyElementSelected failed\");\n" +
      "        }\n",
    "waitForElementSelected":
      "",
    "storeElementSelected":
      "        ${{variable}:bool} = wd.FindElement(By.{locatorBy}({locator})).Selected;\n",
    "assertElementValue":
      "        if ({posNot}(wd.FindElement(By.{locatorBy}({locator})).GetAttribute(\"value\") == {value})) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertElementValue failed\");\n" +
      "        }\n",
    "verifyElementValue":
      "        if ({posNot}(wd.FindElement(By.{locatorBy}({locator})).GetAttribute(\"value\") == {value})) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyElementValue failed\");\n" +
      "        }\n",
    "waitForElementValue":
      "",
    "storeElementValue":
      "        ${{variable}:string} = wd.FindElement(By.{locatorBy}({locator})).GetAttribute(\"value\");\n",
    "assertElementAttribute":
      "        if ({posNot}({value} == wd.FindElement(By.{locatorBy}({locator})).GetAttribute({attributeName}))) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertElementValue failed\");\n" +
      "        }\n",
    "verifyElementAttribute":
    "        if ({posNot}({value} == wd.FindElement(By.{locatorBy}({locator})).GetAttribute({attributeName}))) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyElementValue failed\");\n" +
      "        }\n",
    "waitForElementAttribute":
      "",
    "storeElementAttribute":
      "        ${{variable}:string} = wd.FindElement(By.{locatorBy}({locator})).GetAttribute({attributeName});\n",
    "assertCookieByName":
      "        if ({posNot}({value} == wd.Manage().Cookies.GetCookieNamed({name}).Value)) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertCookieByName failed\");\n" +
      "        }\n",
    "verifyCookieByName":
      "        if ({posNot}({value} == wd.Manage().Cookies.GetCookieNamed({name}).Value)) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyCookieByName failed\");\n" +
      "        }\n",
    "waitForCookieByName":
      "",
    "storeCookieByName":
      "        ${{variable}:string} = wd.Manage().Cookies.GetCookieNamed({name}).Value;\n",
    "assertCookiePresent":
      "        if ({negNot}((wd.Manage().Cookies.GetCookieNamed({name}) == null))) {\n" +
      "            wd.Close();\n" +
      "            throw new SystemException(\"{negNot}assertCookiePresent failed\");\n" +
      "        }\n",
    "verifyCookiePresent":
      "        if ({negNot}(wd.Manage().Cookies.GetCookieNamed({name}) == null)) {\n" +
      "            Console.Error.WriteLine(\"{negNot}verifyCookiePresent failed\");\n" +
      "        }\n",
    "waitForCookiePresent":
      "",
    "storeCookiePresent":
      "        ${{variable}:bool} = wd.Manage().Cookies.GetCookieNamed({name}) != null;\n",
    /*"saveScreenshot":
      "        //wd.getScreenshotAs(FILE).renameTo(new File({file}));\n"*/
  },
  locatorByForType: function(stepType, locatorType, locatorIndex) {
    if ({"select.select":1, "select.deselect":1}[stepType.name] && locatorIndex == 2) {
      return {
        "index": "ByIndex",
        "value": "ByValue",
        "label": "ByVisibleText",
        "id":    "[NOT IMPLEMENTED]"
      };
    }
    return {
      "class name": "ClassName",
      "id": "Id",
      "link text": "LinkText",
      "xpath": "XPath",
      "css selector": "CssSelector",
      "name": "Name",
      "tag name": "TagName",
      "partial link text": "PartialLinkText"}[locatorType];
  },
  /**
   * Processes a parameter value into an appropriately escaped expression. Mentions of variables
   * with the ${foo} syntax are transformed into expressions that concatenate the variables and
   * literals.  
   * For example:
   * a${b}c
   * becomes:
   * "a" + b + "c"
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
          if (output.length > 0) { output += " + "; }
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
              if (output.length > 0) { output += " + "; }
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
      if (output.length > 0) { output += " + "; }
      output += esc(lastChunk);
    }
    return output;
  },
  usedVar: function(varName, varType) { return varName; },
  unusedVar: function(varName, varType) { return varType + " " + varName; }
}));