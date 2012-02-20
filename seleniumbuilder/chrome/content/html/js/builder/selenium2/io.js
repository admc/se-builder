/**
 * Code for exporting/importing Selenium 2 scripts in a variety of formats.
*/

builder.selenium2.loadScript = function(path) {
  var scriptJSON = builder.selenium2.loadScriptJSON(path);
  var script = new builder.Script(builder.selenium2);
  script.path = scriptJSON.path;
  script.path.format = builder.sel2Formats[0];
  
  for (var i = 0; i < scriptJSON.steps.length; i++) {
    var step = new builder.Step(builder.selenium2.stepTypes[scriptJSON.steps[i].type]);
    script.steps.push(step);
    var pNames = step.getParamNames();
    for (var j = 0; j < pNames.length; j++) {
      if (scriptJSON.steps[i][pNames[j]]) {
        step[pNames[j]] = scriptJSON.steps[i][pNames[j]];
      }
    }
  }
    
  return script;
};

builder.selenium2.loadScriptJSON = function(path) {
  var file = null;
  if (path == null) {
    file = showFilePicker(window, "Select a File", 
                          Components.interfaces.nsIFilePicker.modeOpen,
                          Format.TEST_CASE_DIRECTORY_PREF,
                          function(fp) { return fp.file; });
  } else {
    file = FileUtils.getFile(path);
  }
  var sis = FileUtils.openFileInputStream(file);
  var script = JSON.parse(FileUtils.getUnicodeConverter('UTF-8').ConvertToUnicode(sis.read(sis.available())));
  sis.close();
  script.path = {
    where: "local",
    path: file.path
  };
  return script;
};

builder.selenium2.saveScript = function(script, format, path) {
  try {
    var file = null;
    if (path == null) {
      file = showFilePicker(window, "Save as...",
                            Components.interfaces.nsIFilePicker.modeSave,
                            Format.TEST_CASE_DIRECTORY_PREF,
                            function(fp) { return fp.file; },
                            format.extension);
    } else {
      file = FileUtils.getFile(path);
    }
    if (file != null) {
      var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
      outputStream.init(file, 0x02 | 0x08 | 0x20, 0644, 0);
      var converter = FileUtils.getUnicodeConverter('UTF-8');
      var text = converter.ConvertFromUnicode(format.format(script, file.leafName));
      outputStream.write(text, text.length);
      var fin = converter.Finish();
      if (fin.length > 0) {
        outputStream.write(fin, fin.length);
      }
      outputStream.close();
      return true;
    } else {
      return false;
    }
  } catch (err) {
    alert("error: " + err);
    return false;
  }
};

builder.sel2Formats = [];

builder.createLangSel2Formatter = function(lang_info) {
  return {
    name: lang_info.name,
    extension: lang_info.extension,
    format: function(script, name) {
      var t = "";
      t += lang_info.start.replace("{name}", name.substr(0, name.indexOf(".")));
      var used_vars = {};
      for (var i = 0; i < script.steps.length; i++) {
        var step = script.steps[i];
        var line = lang_info.lineForType[step.type.name];
        if (typeof line == 'undefined') {
          throw("Cannot export step of type \"" + step.type.name + "\".");
        }
        if (line instanceof Function) {
          t += line(step, lang_info.escapeValue);
          continue;
        }
        var pNames = script.steps[i].getParamNames();
        for (var j = 0; j < pNames.length; j++) {
          if (step.type.getParamType(pNames[j]) == "locator") {
            line = line.replace(new RegExp("\{" + pNames[j] + "\}", "g"), lang_info.escapeValue(step.type, step[pNames[j]].value, pNames[j]));
            line = line.replace(new RegExp("\{" + pNames[j] + "By\}", "g"), lang_info.locatorByForType(step.type, step[pNames[j]].type, j + 1));
          } else {
            line = line.replace(new RegExp("\{" + pNames[j] + "\}", "g"), lang_info.escapeValue(step.type, step[pNames[j]], pNames[j]));
          }
        }
        // Depending on whether the step is negated, put in the appropriate logical nots.
        if (step.negated) {
          line = line.replace(new RegExp("\{posNot\}", "g"), "");
          line = line.replace(new RegExp("\{negNot\}", "g"), lang_info.not);
        } else {
          line = line.replace(new RegExp("\{posNot\}", "g"), lang_info.not);
          line = line.replace(new RegExp("\{negNot\}", "g"), "");
        }
        // Replace ${foo} with the necessary invocation of the variable, eg "String foo" or "var foo".
        var l2 = "";
        var hasDollar = false;
        var insideVar = false;
        var varName = "";
        for (var j = 0; j < line.length; j++) {
          var ch = line.substring(j, j + 1);
          if (insideVar) {
            if (ch == "}") {
              var spl = varName.split(":", 2);
              var varType = spl.length == 2 ? spl[1] : null;
              varName = spl[0];
              if (used_vars[varName]) {
                l2 += lang_info.usedVar(varName, varType);
              } else {
                l2 += lang_info.unusedVar(varName, varType);
                used_vars[varName] = true;
              }
              insideVar = false;
              hasDollar = false;
              varName = "";
            } else {
              varName += ch;
            }
          } else {
            // !insideVar
            if (hasDollar) {
              if (ch == "{") { insideVar = true; } else { hasDollar = false; l2 += "$" + ch; }
            } else {
              if (ch == "$") { hasDollar = true; } else { l2 += ch; }
            }
          }
        }
        line = l2;
        t += line;
      }
      t += lang_info.end;
      return t;
    },
    nonExportables: function(script) {
      var nes = [];
      for (var i = 0; i < script.steps.length; i++) {
        var step = script.steps[i];
        var line = lang_info.lineForType[step.type.name];
        if (typeof line == 'undefined') {
          nes.push(step.type.name);
        }
      }
      return nes;
    }
  };
};

builder.sel2Formats.push({
  name: "Se Builder",
  extension: ".json",
  format: function(script, name) {
    var cleanScript = {
      seleniumVersion: "2",
      formatVersion: 1,
      steps: []
    };
    for (var i = 0; i < script.steps.length; i++) {
      var cleanStep = { type: script.steps[i].type.name };
      if (script.steps[i].negated) {
        cleanStep.negated = true;
      }
      var pNames = script.steps[i].getParamNames();
      for (var j = 0; j < pNames.length; j++) {
        cleanStep[pNames[j]] = script.steps[i][pNames[j]];
      }
      cleanScript.steps.push(cleanStep);
    }
    return JSON.stringify(cleanScript, null, /* indent */ 2);
  },
  nonExportables: function(script) {
    return [];
  }
});

builder.sel2Formats.push(builder.createLangSel2Formatter({
  name: "Java",
  extension: ".java",
  not: "!",
  start:
    "import java.util.concurrent.TimeUnit;\n" +
    "import java.util.Date;\n" + 
    "import java.io.File;\n" +
    "import org.openqa.selenium.support.ui.Select;\n" +
    "import org.openqa.selenium.interactions.Actions;\n" +
    "import org.openqa.selenium.firefox.FirefoxDriver;\n" +
    "import org.openqa.selenium.*;\n" +
    "import static org.openqa.selenium.OutputType.*;\n" +
    "\n" +
    "public class {name} {\n" +
    "    public static void main(String[] args) {\n" +
    "        FirefoxDriver wd = new FirefoxDriver();\n" +
    "        wd.manage().timeouts().implicitlyWait(60, TimeUnit.SECONDS);\n",
  end:
    "        wd.close();\n" +
    "    }\n" +
    "}\n",
  lineForType: {
    "print":
      "        System.out.println({text});\n",
    "store":
      "        ${{variable}:String} = \"\" + {text};\n",
    "get":
      "        wd.get({url});\n",
    "goBack":
      "        wd.navigate().back();\n",
    "goForward":
      "        wd.navigate().forward();\n",
    "clickElement":
      "        wd.findElement(By.{locatorBy}({locator})).click();\n",
    "sendKeysToElement":
      "        wd.findElement(By.{locatorBy}({locator})).sendKeys({text});\n",
    "setElementSelected":
      "        if (!wd.findElement(By.{locatorBy}({locator})).isSelected()) {\n" +
      "            wd.findElement(By.{locatorBy}({locator})).click();\n" +
      "        }\n",
    "setElementNotSelected":
      "        if (wd.findElement(By.{locatorBy}({locator})).isSelected()) {\n" +
      "            wd.findElement(By.{locatorBy}({locator})).click();\n" +
      "        }\n",
    "doubleClickElement":
      "        new Actions(wd).doubleClick(wd.findElement(By.{locatorBy}({locator}))).build().perform();\n",
    "element.dragToAndDrop":
      "        new Actions(wd).dragAndDrop(wd.findElement(By.{locatorBy}({locator})), wd.findElement(By.{locator2By}({locator2}))).build().perform();\n",
    "element.clickAndHold":
      "        new Actions(wd).clickAndHold(wd.findElement(By.{locatorBy}({locator}))).build.perform();\n",
    "element.release":
      "        new Actions(wd).release(wd.findElement(By.{locatorBy}({locator}))).build.perform();\n",
    "clearSelections":
      "        new Select(wd.findElement(By.{locatorBy}({locator}))).deselectAll();\n",
    "submitElement":
      "        wd.findElement(By.{locatorBy}({locator})).submit();\n",
    "close":
      "        wd.close();\n",
    "navigate.refresh":
      "        wd.navigate().refresh();\n",
    "addCookie":
      function(step, escapeValue) {
        var r = "        Cookie c" + step.id + " = new Cookie.Builder(" + escapeValue(step.type, step.name) + ", " + escapeValue(step.type, step.value) + ")";
        var opts = step.options.split(",");
        for (var i = 0; i < opts.length; i++) {
          var kv = opts[i].trim().split("=");
          if (kv.length == 1) { continue; }
          if (kv[0] == "path") {
            r += ".path(\"" + escapeValue(step.type, kv[1]) + "\")";
          }
          if (kv[0] == "max_age") {
            r += ".expiresOn(new Date(new Date().getTime() + " + parseInt(kv[1]) * 1000 + "l))";
          }
        }
        r += ".build();\n";
        r += "        wd.manage().addCookie(c" + step.id + ");\n";
        return r;
      },
    "deleteCookie":
      function(step, escapeValue) {
        return(
        "        Cookie c" + step.id + " = wd.manage().getCookieNamed(" + escapeValue(step.type, step.name) + ");\n" +
        "        if (c" + step.id + " != null) { wd.manage().deleteCookie(c" + step.id + "); }\n");
      },
    "assertTextPresent":
      "        if ({posNot}wd.findElement(By.tagName(\"html\")).getText().contains({text})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertTextPresent failed\");\n" +
      "        }\n",
    "verifyTextPresent":
      "        if ({posNot}wd.findElement(By.tagName(\"html\")).getText().contains({text})) {\n" +
      "            System.err.println(\"{negNot}verifyTextPresent failed\");\n" +
      "        }\n",
    "waitForTextPresent":
      "",
    "storeTextPresent":
      "        ${{variable}:boolean} = wd.findElement(By.tagName(\"html\")).getText().contains({text});\n",
    "assertBodyText":
      "        if ({posNot}wd.findElement(By.tagName(\"html\")).getText().equals({text})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertBodyText failed\");\n" +
      "        }\n",
    "verifyBodyText":
      "        if ({posNot}wd.findElement(By.tagName(\"html\")).getText().equals({text})) {\n" +
      "            System.err.println(\"{negNot}verifyBodyText failed\");\n" +
      "        }\n",
    "waitForBodyText":
      "",
    "storeBodyText":
      "        ${{variable}:String} = wd.findElement(By.tagName(\"html\")).getText();\n",
    "assertElementPresent":
      "        if ({negNot}(wd.findElements(By.{locatorBy}({locator})).size() == 0)) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertElementPresent failed\");\n" +
      "        }\n",
    "verifyElementPresent":
      "        if ({negNot}(wd.findElements(By.{locatorBy}({locator})).size() == 0)) {\n" +
      "            System.err.println(\"{negNot}verifyElementPresent failed\");\n" +
      "        }\n",
    "waitForElementPresent":
      "",
    "storeElementPresent":
      "        ${{variable}:boolean} = wd.findElements(By.{locatorBy}({locator})).size() == 0;\n",
    "assertPageSource":
      "        if ({posNot}wd.getPageSource().equals({source})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertPageSource failed\");\n" +
      "        }\n",
    "verifyPageSource":
      "        if ({posNot}wd.getPageSource().equals({source})) {\n" +
      "            System.err.println(\"{negNot}verifyPageSource failed\");\n" +
      "        }\n",
    "waitForPageSource":
      "",
    "storePageSource":
      "        ${{variable}:String} = wd.getPageSource();\n",
    "assertText":
      "        if ({posNot}wd.findElement(By.{locatorBy}({locator})).getText().equals({text})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertText failed\");\n" +
      "        }\n",
    "verifyText":
      "        if ({posNot}wd.findElement(By.{locatorBy}({locator})).getText().equals({text})) {\n" +
      "            System.err.println(\"{negNot}verifyText failed\");\n" +
      "        }\n",
    "waitForText":
      "",
    "storeText":
      "        ${{variable}:String} = wd.findElement(By.{locatorBy}({locator})).getText();\n",
    "assertCurrentUrl":
      "        if ({posNot}wd.getCurrentUrl().equals({url})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertCurrentUrl failed\");\n" +
      "        }\n",
    "verifyCurrentUrl":
      "        if ({posNot}wd.getCurrentUrl().equals({url})) {\n" +
      "            System.err.println(\"{negNot}verifyCurrentUrl failed\");\n" +
      "        }\n",
    "waitForCurrentUrl":
      "",
    "assertTitle":
      "        if ({posNot}wd.getTitle().equals({title})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertTitle failed\");\n" +
      "        }\n",
    "verifyTitle":
      "        if ({posNot}wd.getTitle().equals({title})) {\n" +
      "            System.err.println(\"{negNot}verifyTitle failed\");\n" +
      "        }\n",
    "storeTitle":
      "        ${{variable}:String} = wd.getTitle();\n",
    "waitForTitle":
      "",
    "assertElementSelected":
      "        if ({posNot}wd.findElement(By.{locatorBy}({locator})).isSelected()) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertElementSelected failed\");\n" +
      "        }\n",
    "verifyElementSelected":
      "        if ({posNot}wd.findElement(By.{locatorBy}({locator})).isSelected()) {\n" +
      "            System.err.println(\"{negNot}verifyElementSelected failed\");\n" +
      "        }\n",
    "waitForElementSelected":
      "",
    "storeElementSelected":
      "        ${{variable}:boolean} = wd.findElement(By.{locatorBy}({locator})).isSelected();\n",
    "assertElementNotSelected":
      "        if ({negNot}wd.findElement(By.{locatorBy}({locator})).isSelected()) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertElementSelected failed\");\n" +
      "        }\n",
    "verifyElementNotSelected":
      "        if ({negNot}wd.findElement(By.{locatorBy}({locator})).isSelected()) {\n" +
      "            System.err.println(\"{negNot}verifyElementSelected failed\");\n" +
      "        }\n",
    "waitForElementNotSelected":
      "",
    "assertElementValue":
      "        if ({posNot}wd.findElement(By.{locatorBy}({locator})).getAttribute(\"value\").equals({value})) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertElementValue failed\");\n" +
      "        }\n",
    "verifyElementValue":
      "        if ({posNot}wd.findElement(By.{locatorBy}({locator})).getAttribute(\"value\").equals({value})) {\n" +
      "            System.err.println(\"{negNot}verifyElementValue failed\");\n" +
      "        }\n",
    "waitForElementValue":
      "",
    "storeElementValue":
      "        ${{variable}:String} = wd.findElement(By.{locatorBy}({locator})).getAttribute(\"value\");\n",
    "assertElementAttribute":
      "        if ({posNot}{value}.equals(wd.findElement(By.{locatorBy}({locator})).getAttribute({attributeName}))) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertElementValue failed\");\n" +
      "        }\n",
    "verifyElementAttribute":
    "        if ({posNot}{value}.equals(wd.findElement(By.{locatorBy}({locator})).getAttribute({attributeName}))) {\n" +
      "            System.err.println(\"{negNot}verifyElementValue failed\");\n" +
      "        }\n",
    "waitForElementAttribute":
      "",
    "storeElementAttribute":
      "        ${{variable}:String} = wd.findElement(By.{locatorBy}({locator})).getAttribute({attributeName});\n",
    "assertCookieByName":
      "        if ({posNot}{value}.equals(wd.manage().getCookieNamed({name}).getValue())) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertCookieByName failed\");\n" +
      "        }\n",
    "verifyCookieByName":
      "        if ({posNot}{value}.equals(wd.manage().getCookieNamed({name}).getValue())) {\n" +
      "            System.err.println(\"{negNot}verifyCookieByName failed\");\n" +
      "        }\n",
    "waitForCookieByName":
      "",
    "storeCookieByName":
      "        ${{variable}:String} = wd.manage().getCookieNamed({name}).getValue();\n",
    "assertCookiePresent":
      "        if ({negNot}(wd.manage().getCookieNamed({name}) == null)) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"{negNot}assertCookiePresent failed\");\n" +
      "        }\n",
    "verifyCookiePresent":
      "        if ({negNot}(wd.manage().getCookieNamed({name}) == null)) {\n" +
      "            System.err.println(\"{negNot}verifyCookiePresent failed\");\n" +
      "        }\n",
    "waitForCookiePresent":
      "",
    "storeCookiePresent":
      "        ${{variable}:boolean} = wd.manage().getCookieNamed({name}) != null;\n",
    "saveScreenshot":
      "        wd.getScreenshotAs(FILE).renameTo(new File({file}));\n"
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
      "class name": "className",
      "id": "id",
      "link text": "linkText",
      "xpath": "xpath",
      "css selector": "cssSelector",
      "name": "name",
      "tag name": "tagName",
      "partial link text": "partialLinkText"}[locatorType];
  },
  escapeValue: function(stepType, value, pName) {
    if (stepType.name.startsWith("store") && pName == "variable") { return value; }
    function esc(v) { return "\"" + v.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\""; }
    var output = "";
    var lastChunk = "";
    var hasDollar = false;
    var insideVar = false;
    var varName = "";
    for (var i = 0; i < value.length; i++) {
      var ch = value.substring(i, i + 1);
      if (insideVar) {
        if (ch == "}") {
          if (output.length > 0) { output += " + "; }
          output += varName;
          insideVar = false;
          hasDollar = false;
          varName = "";
        } else {
          varName += ch;
        }
      } else {
        // !insideVar
        if (hasDollar) {
          if (ch == "{") {
            insideVar = true;
            if (lastChunk.length > 0) {
              if (output.length > 0) { output += " + "; }
              output += esc(lastChunk);
            }
            lastChunk = "";
          } else {
            hasDollar = false;
            lastChunk += "$" + ch;
          }
        } else {
          if (ch == "$") { hasDollar = true; } else { lastChunk += ch; }
        }
      }
    }
    if (lastChunk.length > 0) {
      if (output.length > 0) { output += " + "; }
      output += esc(lastChunk);
    }
    return output;
  },
  usedVar: function(varName, varType) { return varName; },
  unusedVar: function(varName, varType) { return varType + " " + varName; }
}));

builder.sel2Formats.push(builder.createLangSel2Formatter({
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