/**
 * Code for exporting/importing Selenium 2 scripts in a variety of formats.
*/

builder.sel2.loadScript = function(path) {
  var scriptJSON = builder.loadSel2Script(path);
  var script = new builder.sel2.Sel2Script();
  script.path = scriptJSON.path;
  script.path.format = builder.sel2Formats[0];
  script.seleniumVersion = scriptJSON.seleniumVersion;
  script.version = scriptJSON.version;

  for (var i = 0; i < scriptJSON.steps.length; i++) {
    var step = new builder.sel2.Sel2Step(scriptJSON.steps[i].type);
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

builder.loadSel2Script = function(path) {
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

builder.saveSel2Script = function(script, format, path) {
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
      for (var i = 0; i < script.steps.length; i++) {
        var step = script.steps[i];
        var line = lang_info.lineForType[step.type];
        if (typeof line == 'undefined') {
          throw("Cannot export step of type \"" + step.type + "\".");
        }
        var pNames = script.steps[i].getParamNames();
        for (var j = 0; j < pNames.length; j++) {
          if (pNames[j].startsWith("locator")) {
            line = line.replace(new RegExp("\{" + pNames[j] + "\}", "g"), lang_info.escapeValue(step.type, step[pNames[j]].value, j + 1));
            line = line.replace(new RegExp("\{" + pNames[j] + "By\}", "g"), lang_info.locatorByForType(step.type, step[pNames[j]].type, j + 1));
          } else {
            line = line.replace(new RegExp("\{" + pNames[j] + "\}", "g"), lang_info.escapeValue(step.type, step[pNames[j]], j + 1));
          }
        }
        t += line;
      }
      t += lang_info.end;
      return t;
    },
    nonExportables: function(script) {
      var nes = [];
      for (var i = 0; i < script.steps.length; i++) {
        var step = script.steps[i];
        var line = lang_info.lineForType[step.type];
        if (typeof line == 'undefined') {
          nes.push(step.type);
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
      var cleanStep = { type: script.steps[i].type };
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
  start:
    "import java.util.concurrent.TimeUnit;\n" +
    "import org.openqa.selenium.firefox.FirefoxDriver;\n" +
    "import org.openqa.selenium.*;\n" +
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
    "get":
      "        wd.get(\"{url}\");\n",
    "goBack":
      "        wd.navigate().back();\n",
    "goForward":
      "        wd.navigate().forward();\n",
    "clickElement":
      "        wd.findElement(By.{locatorBy}(\"{locator}\")).click();\n",
    "sendKeysToElement":
      "        wd.findElement(By.{locatorBy}(\"{locator}\")).sendKeys(\"{text}\");\n",
    "setElementSelected":
      "        if (!wd.findElement(By.{locatorBy}(\"{locator}\")).isSelected()) {\n" +
      "            wd.findElement(By.{locatorBy}(\"{locator}\")).setSelected();\n" +
      "        }\n",
    "setElementNotSelected":
      "        if (wd.findElement(By.{locatorBy}(\"{locator}\")).isSelected()) {\n" +
      "            wd.findElement(By.{locatorBy}(\"{locator}\")).toggle();\n" +
      "        }\n",
    "clickElementWithOffset":
      "        wd.actionsBuilder().moveToElement(wd.findElement(By.{locatorBy}(\"{locator}\"))).moveByOffset({offset}).click().build().perform();\n",
    "doubleClickElement":
      "        wd.actionsBuilder().doubleClick(wd.findElement(By.{locatorBy}(\"{locator}\"))).build().perform();\n",
    "element.dragToAndDrop":
      "        wd.actionsBuilder().dragAndDrop(wd.findElement(By.{locatorBy}(\"{locator}\")), wd.findElement(By.{locator2By}(\"{locator2}\"))).build().perform();\n",
    "element.clickAndHold":
      "        wd.actionsBuilder().clickAndHold(wd.findElement(By.{locatorBy}(\"{locator}\"))).build.perform();\n",
    "element.release":
      "        wd.actionsBuilder().release(wd.findElement(By.{locatorBy}(\"{locator}\"))).build.perform();\n",
    "select.select":
      "        new Select(wd.findElement(By.{locatorBy}(\"{locator}\"))).select{locator2By}(\"{locator2}\");\n",
    "select.deselectAll":
      "        new Select(wd.findElement(By.{locatorBy}(\"{locator}\"))).deselectAll();\n",
    "select.deselect":
      "        new Select(wd.findElement(By.{locatorBy}(\"{locator}\"))).deselect{locator2By}(\"{locator2}\");\n",
    "element.submit":
      "        wd.findElement(By.{locatorBy}(\"{locator}\")).submit();\n",
    "close":
      "        wd.close();\n",
    "navigate.refresh":
      "        wd.navigate().refresh();\n",
    "assertTextPresent":
      "        if (!wd.findElement(By.tagName(\"html\")).getText().contains(\"{text}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"element.assertTextPresent failed\");\n" +
      "        }\n",
    "verifyTextPresent":
      "        if (!wd.findElement(By.tagName(\"html\")).getText().contains(\"{text}\")) {\n" +
      "            System.err.println(\"verifyTextPresent failed\");\n" +
      "        }\n",
    "waitForTextPresent":
      "",
    "assertBodyText":
      "        if (!wd.findElement(By.tagName(\"html\")).getText().equals(\"{text}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"assertBodyText failed\");\n" +
      "        }\n",
    "verifyBodyText":
      "        if (!wd.findElement(By.tagName(\"html\")).getText().equals(\"{text}\")) {\n" +
      "            System.err.println(\"verifyBodyText failed\");\n" +
      "        }\n",
    "waitForBodyText":
      "",
    "assertElementPresent":
      "        if (wd.findElements(By.{locatorBy}(\"{locator}\")).size() == 0) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"element.assertPresent failed\");\n" +
      "        }\n",
    "verifyElementPresent":
      "        if (wd.findElements(By.{locatorBy}(\"{locator}\")).size() == 0) {\n" +
      "            System.err.println(\"element.verifyPresent failed\");\n" +
      "        }\n",
    "waitForELementPresent":
      "",
    "assertPageSource":
      "        if (!wd.getPageSource().equals(\"{source}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"assertHTMLSource failed\");\n" +
      "        }\n",
    "verifyPageSource":
      "        if (!wd.getPageSource().equals(\"{source}\")) {\n" +
      "            System.err.println(\"verifyHTMLSource failed\");\n" +
      "        }\n",
    "waitForPageSource":
      "",
    "assertText":
      "        if (!wd.findElement(By.{locatorBy}(\"{locator}\")).getText().equals(\"{text}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"element.assertText failed\");\n" +
      "        }\n",
    "verifyText":
      "        if (wd.findElement(By.{locatorBy}(\"{locator}\")).getText().equals(\"{text}\")) {\n" +
      "            System.err.println(\"element.verifyText failed\");\n" +
      "        }\n",
    "waitForText":
      "",
    "assertCurrentUrl":
      "        if (!wd.getCurrentUrl().equals(\"{url}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"assertCurrentURL failed\");\n" +
      "        }\n",
    "verifyCurrentUrl":
      "        if (!wd.getCurrentUrl().equals(\"{url}\")) {\n" +
      "            System.err.println(\"verifyCurrentURL failed\");\n" +
      "        }\n",
    "waitForCurrentUrl":
      "",
    "assertTitle":
      "        if (!wd.getTitle().equals(\"{title}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"assertTitle failed\");\n" +
      "        }\n",
    "verifyTitle":
      "        if (!wd.getTitle().equals(\"{title}\")) {\n" +
      "            System.err.println(\"verifyTitle failed\");\n" +
      "        }\n",
    "waitForTitle":
      "",
    "assertElementSelected":
      "        if (!wd.findElement(By.{locatorBy}(\"{locator}\")).is_selected()) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"assertSelected failed\");\n" +
      "        }\n",
    "verifyElementSelected":
      "        if (!wd.findElement(By.{locatorBy}(\"{locator}\")).is_selected()) {\n" +
      "            System.err.println(\"verifySelected failed\");\n" +
      "        }\n",
    "waitForElementSelected":
      "",
    "assertElementValue":
      "        if (!wd.findElement(By.{locatorBy}(\"{locator}\")).getValue().equals(\"{value}\")) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"element.assertValue failed\");\n" +
      "        }\n",
    "verifyElementValue":
      "        if (!wd.findElement(By.{locatorBy}(\"{locator}\")).getValue().equals(\"{value}\")) {\n" +
      "            System.err.println(\"element.verifyValue failed\");\n" +
      "        }\n",
    "waitForElementValue":
      "",
    "assertCookieByName":
      "        if (!\"{value}\".equals(wd.manage().getCookieNamed(\"{name}\"))) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"manage.assertCookieNamed failed\");\n" +
      "        }\n",
    "verifyCookieByName":
      "        if (!\"{value}\".equals(wd.manage().getCookieNamed(\"{name}\"))) {\n" +
      "            System.err.println(\"manage.verifyCookieNamed failed\");\n" +
      "        }\n",
    "manage.waitForCookieNamed":
      "",
    "assertCookiePresent":
      "        if (wd.manage().getCookieNamed(\"{name}\") == null) {\n" +
      "            wd.close();\n" +
      "            throw new RuntimeException(\"manage.assertCookieNamedPresent failed\");\n" +
      "        }\n",
    "verifyCookiePresent":
      "        if (wd.manage().getCookieNamed(\"{name}\") == null) {\n" +
      "            System.err.println(\"manage.verifyCookieNamedPresent failed\");\n" +
      "        }\n",
    "waitForCookiePresent":
      ""
  },
  locatorByForType: function(stepType, locatorType, locatorIndex) {
    if ({"select.select":1, "select.deselect":1}[stepType] && locatorIndex == 2) {
      return {
        "index": "ByIndex",
        "value": "ByValue",
        "label": "ByVisibleText",
        "id":    "[NOT IMPLEMENTED]"
      };
    }
    return {
      "class": "className",
      "id": "id",
      "link": "linkText",
      "xpath": "xpath",
      "css": "cssSelector",
      "name": "name"}[locatorType];
  },
  escapeValue: function(stepType, value, valueIndex) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }
}));

builder.sel2Formats.push(builder.createLangSel2Formatter({
  name: "Python",
  extension: ".py",
  start:
    "from selenium.webdriver.firefox.webdriver import WebDriver" +
    "\n" +
    "wd = WebDriver()\n" +
    "wd.implicitly_wait(60)\n",
  end:
    "wd.close()\n",
  lineForType: {
    "get": "wd.get(\"{value}\")\n",
    "navigate.back": "wd.back()\n",
    "navigate.forward": "wd.forward()\n",
    "element.click": "wd.{locatorBy}(\"{locator}\").click()\n",
    "element.sendKeys": "wd.{locatorBy}(\"{locator}\").send_keys(\"{value}\")\n",
    "element.setSelected":
    "if not wd.{locatorBy}(\"{locator}\").is_selected():\n" +
    "    wd.{locatorBy}(\"{locator}\").select()\n",
    "element.setNotSelected":
    "if wd.{locatorBy}(\"{locator}\").is_selected():\n" +
    "    wd.{locatorBy}(\"{locator}\").toggle()\n",
    "element.submit":
    "wd.{locatorBy}(\"{locator}\").submit()\n",
    "close":
    "",
    "assertTextPresent":
    "if not \"{value}\" in wd.find_element_by_tag_name(\"html\").text:\n" +
    "    print(\"assertTextPresent failed\")\n",
    "verifyTextPresent":
    "if not \"{value}\" in wd.find_element_by_tag_name(\"html\").text:\n" +
    "    wd.close()\n" +
    "    raise Exception(\"verifyTextPresent failed\")\n",
    "waitForTextPresent":
    "",
    "assertBodyText":
    "if not \"{value}\" == wd.find_element_by_tag_name(\"html\").text:\n" +
    "    print(\"assertBodyText failed\")\n",
    "verifyBodyText":
    "if not \"{value}\" == wd.find_element_by_tag_name(\"html\").text:\n" +
    "    wd.close()\n" +
    "    raise Exception(\"verifyBodyText failed\")\n",
    "waitForBodyText":
    "",
    "element.assertPresent":
    "if len(wd.{locatorBy}(\"{locator}\")) == 0:\n" +
    "    print(\"element.assertPresent failed\")\n",
    "element.verifyPresent":
    "if len(wd.{locatorBy}(\"{locator}\")) == 0:\n" +
    "    wd.close()\n" +
    "    raise Exception(\"verifyPresent failed\")\n",
    "element.waitForPresent":
    "",
    "assertHTMLSource":
    "if wd.get_page_source() != \"{value}\":\n" +
    "    print(\"assertHTMLSource failed\")\n",
    "verifyHTMLSource":
    "if wd.get_page_source() != \"{value}\":\n" +
    "    wd.close()\n" +
    "    raise Exception(\"verifyHTMLSource failed\")\n",
    "waitForHTMLSource":
    "",
    "element.assertText":
    "if wd.{locatorBy}(\"{locator}\").text != \"{value}\":\n" +
    "    print(\"element.assertText failed\")\n",
    "element.verifyText":
    "if wd.{locatorBy}(\"{locator}\").text != \"{value}\":\n" +
    "    wd.close()\n" +
    "    raise Exception(\"element.verifyText failed\")\n",
    "element.waitForText":
    "",
    "assertCurrentURL":
    "if wd.current_url != \"{value}\":\n" +
    "    print(\"assertCurrentURL failed\")\n",
    "verifyCurrentURL":
    "if wd.current_url != \"{value}\":\n" +
    "    wd.close()\n" +
    "    raise Exception(\"verifyCurrentURL failed\")\n",
    "waitForCurrentURL":
    "",
    "assertTitle":
    "if wd.title != \"{value}\":\n" +
    "    print(\"assertTitle failed\")\n",
    "verifyTitle":
    "if wd.current_url != \"{value}\":\n" +
    "    wd.close()\n" +
    "    raise Exception(\"verifyTitle failed\")\n",
    "waitForTitle":
    "",
    "element.assertSelected":
    "if not wd.{locatorBy}(\"{locator}\").is_selected():\n" +
    "    print(\"element.assertSelected failed\")\n",
    "element.verifySelected":
    "if not wd.{locatorBy}(\"{locator}\").is_selected():\n" +
    "    wd.close()\n" +
    "    raise Exception(\"element.verifySelected failed\")\n",
    "element.waitForSelected":
    "",
    "element.assertValue":
    "if wd.{locatorBy}(\"{locator}\").value != \"{value}\":\n" +
    "    print(\"element.assertValue failed\")\n",
    "element.verifyValue":
    "if wd.{locatorBy}(\"{locator}\").value != \"{value}\":\n" +
    "    wd.close()\n" +
    "    raise Exception(\"element.verifyValue failed\")\n",
    "element.waitForValue":
    "",
    "manage.assertCookieNamed":
    "if wd.get_cookie(\"{value}\") != \"{value2}\":\n" +
    "    print(\"manage.assertCookieNamed failed\")\n",
    "manage.verifyCookieNamed":
    "if wd.get_cookie(\"{value}\") != \"{value2}\":\n" +
    "    wd.close()\n" +
    "    raise Exception(\"manage.verifyCookieNamed failed\")\n",
    "manage.waitForCookieNamed":
    "",
    "manage.assertCookieNamedPresent":
    "if not wd.get_cookie(\"{value}\"):\n" +
    "    print(\"manage.assertCookieNamedPresent failed\")\n",
    "manage.verifyCookieNamed":
    "if not wd.get_cookie(\"{value}\"):\n" +
    "    wd.close()\n" +
    "    raise Exception(\"manage.verifyCookieNamedPresent failed\")\n",
    "manage.waitForCookieNamedPresent":
    ""
  },
  locatorByForType: function(stepType, locatorType, locatorIndex) {
    if ({
      "element.assertPresent": 1,
      "element.verifyPresent": 1
    }[stepType]) {
      return {
        "class": "find_elements_by_class_name",
        "id": "find_elements_by_id",
        "link": "find_elements_by_link_text",
        "xpath": "find_elements_by_xpath",
        "css": "find_elements_by_css_selector",
        "name": "find_elements_by_name"}[locatorType];
    }
    return {
      "class": "find_element_by_class_name",
      "id": "find_element_by_id",
      "link": "find_element_by_link_text",
      "xpath": "find_element_by_xpath",
      "css": "find_element_by_css_selector",
      "name": "find_element_by_name"}[locatorType];
  },
  escapeValue: function(stepType, value, valueIndex) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }
}));