/**
 * Code for exporting Selenium 2 scripts in a variety of formats.
*/

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
        if (typeof step.value != 'undefined') {
          line = line.replace("{value}", lang_info.escapeValue(step.type, step.value, 1));
        }
        if (typeof step.value2 != 'undefined') {
          line = line.replace("{value2}", lang_info.escapeValue(step.type, step.value2, 2));
        }
        if (typeof step.locator != 'undefined') {
          line = line.replace("{locator}", step.locator);
          line = line.replace("{locateBy}", lang_info.locateByForType(step.type, step.locatorType, 1));
        }
        if (typeof step.locator2 != 'undefined') {
          line = line.replace("{locator2}", step.locator2);
          line = line.replace("{locateBy2}", lang_info.locateByForType(step.type, step.locator2Type, 2));
        }
        t += line;
      }
      t += lang_info.end;
      return t;
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
      steps: script.steps
    };
    return JSON.stringify(cleanScript, null, /* indent */ 2);
  }
});

builder.sel2Formats.push(builder.createLangSel2Formatter({
  name: "Java",
  extension: ".java",
  start:
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
    "get": "        wd.get(\"{value}\");\n",
    "navigate.back": "        wd.navigate().back();\n",
    "navigate.forward": "        wd.navigate().forward();\n",
    "element.click": "        wd.findElement(By.{locateBy}(\"{locator}\")).click();\n",
    "element.sendKeys": "        wd.findElement(By.{locateBy}(\"{locator}\")).sendKeys(\"{value}\");\n",
    "element.setSelected":
    "        if (!wd.findElement(By.{locateBy}(\"{locator}\")).isSelected()) {\n" +
    "            wd.findElement(By.{locateBy}(\"{locator}\")).toggle();\n" +
    "        }\n",
    "element.setNotSelected":
    "        if (wd.findElement(By.{locateBy}(\"{locator}\")).isSelected()) {\n" +
    "            wd.findElement(By.{locateBy}(\"{locator}\")).toggle();\n" +
    "        }\n",
    /*"getKeyboard.sendKeys": "        wd.getKeyboard().sendKeys(\"{value}\");\n",*/
    /*"switchToWindow": "        wd = wd.switchTo().window(\"{value}\");\n",*/
    "element.clickWithOffset": "        wd.actionsBuilder().moveToElement(wd.findElement(By.{locateBy}(\"{locator}\"))).moveByOffset({value}).click().build().perform();\n",
    "element.doubleClick": "        wd.actionsBuilder().doubleClick(wd.findElement(By.{locateBy}(\"{locator}\"))).build().perform();\n",
    "element.dragToAndDrop": "        wd.actionsBuilder().dragAndDrop(wd.findElement(By.{locateBy}(\"{locator}\")), wd.findElement(By.{locateBy2}(\"{locator2}\"))).build().perform();\n",
    "element.clickAndHold": "        wd.actionsBuilder().clickAndHold(wd.findElement(By.{locateBy}(\"{locator}\"))).build.perform();\n",
    "element.release": "        wd.actionsBuilder().release(wd.findElement(By.{locateBy}(\"{locator}\"))).build.perform();\n",
    "select.select": "        new Select(wd.findElement(By.{locateBy}(\"{locator}\"))).select{locateBy2}(\"{locator2}\");\n",
    "select.deselectAll": "        new Select(wd.findElement(By.{locateBy}(\"{locator}\"))).deselectAll();\n",
    "select.deselect": "        new Select(wd.findElement(By.{locateBy}(\"{locator}\"))).deselect{locateBy2}(\"{locator2}\");\n",
    "element.submit": "        wd.findElement(By.{locateBy}(\"{locator}\")).submit();\n",
    "close": "        wd.close();\n",
    "navigate.refresh": "        wd.navigate().refresh();\n",
    "assertTextPresent":
    "        if (!wd.findElement(By.tagName(\"html\")).getText().contains(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"element.assertTextPresent failed\");\n" +
    "        }\n",
    "verifyTextPresent":
    "        if (!wd.findElement(By.tagName(\"html\")).getText().contains(\"{value}\")) {\n" +
    "            System.err.println(\"verifyTextPresent failed\");\n" +
    "        }\n",
    "waitForTextPresent": "",
    "assertBodyText":
    "        if (!wd.findElement(By.tagName(\"html\")).getText().equals(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"assertBodyText failed\");\n" +
    "        }\n",
    "verifyBodyText":
    "        if (!wd.findElement(By.tagName(\"html\")).getText().equals(\"{value}\")) {\n" +
    "            System.err.println(\"verifyBodyText failed\");\n" +
    "        }\n",
    "waitForBodyText": "",
    "element.assertPresent":
    "        if (wd.findElements(By.{locateBy}(\"{locator}\")).size() == 0) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"element.assertPresent failed\");\n" +
    "        }\n",
    "element.verifyPresent":
    "        if (wd.findElements(By.{locateBy}(\"{locator}\")).size() == 0) {\n" +
    "            System.err.println(\"element.verifyPresent failed\");\n" +
    "        }\n",
    "element.waitForPresent": "",
    "assertHTMLSource":
    "        if (!wd.getPageSource().equals(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"assertHTMLSource failed\");\n" +
    "        }\n",
    "verifyHTMLSource":
    "        if (!wd.getPageSource().equals(\"{value}\")) {\n" +
    "            System.err.println(\"verifyHTMLSource failed\");\n" +
    "        }\n",
    "waitForHTMLSource": "",
    "element.assertText":
    "        if (!wd.findElements(By.{locateBy}(\"{locator}\")).getText().equals(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"element.assertText failed\");\n" +
    "        }\n",
    "element.verifyText":
    "        if (wd.findElements(By.{locateBy}(\"{locator}\")).getText().equals(\"{value}\")) {\n" +
    "            System.err.println(\"element.verifyText failed\");\n" +
    "        }\n",
    "element.waitForText": "",
    "assertCurrentUrl":
    "        if (!wd.getCurrentUrl().equals(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"assertCurrentUrl failed\");\n" +
    "        }\n",
    "verifyCurrentURL":
    "        if (!wd.getCurrentUrl().equals(\"{value}\")) {\n" +
    "            System.err.println(\"verifyCurrentURL failed\");\n" +
    "        }\n",
    "waitForCurrentURL": "",
    "assertTitle":
    "        if (!wd.getTitle().equals(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"assertTitle failed\");\n" +
    "        }\n",
    "verifyTitle":
    "        if (!wd.getTitle().equals(\"{value}\")) {\n" +
    "            System.err.println(\"verifyTitle failed\");\n" +
    "        }\n",
    "waitForTitle": "",
    "assertChecked":
    "        if (!wd.findElements(By.{locateBy}(\"{locator}\")).isSelected()) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"assertChecked failed\");\n" +
    "        }\n",
    "verifyChecked":
    "        if (!wd.findElements(By.{locateBy}(\"{locator}\")).isSelected()) {\n" +
    "            System.err.println(\"verifyChecked failed\");\n" +
    "        }\n",
    "waitForChecked": "",
    "element.assertValue":
    "        if (!wd.findElements(By.{locateBy}(\"{locator}\")).getValue().equals(\"{value}\")) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"element.assertValue failed\");\n" +
    "        }\n",
    "element.verifyValue":
    "        if (wd.findElements(By.{locateBy}(\"{locator}\")).getValue().equals(\"{value}\")) {\n" +
    "            System.err.println(\"element.verifyValue failed\");\n" +
    "        }\n",
    "element.waitForValue": "",
    "manage.assertCookieNamed":
    "        if (!\"{value2}\".equals(wd.manage().getCookieNamed(\"{value}\"))) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"manage.assertCookieNamed failed\");\n" +
    "        }\n",
    "manage.verifyCookieNamed":
    "        if (!\"{value2}\".equals(wd.manage().getCookieNamed(\"{value}\"))) {\n" +
    "            System.err.println(\"manage.verifyCookieNamed failed\");\n" +
    "        }\n",
    "manage.waitForCookieNamed": "",
    "manage.assertCookieNamedPresent":
    "        if (wd.manage().getCookieNamed(\"{value}\") == null) {\n" +
    "            wd.close();\n" +
    "            throw new RuntimeException(\"manage.assertCookieNamedPresent failed\");\n" +
    "        }\n",
    "manage.verifyCookieNamedPresent":
    "        if (wd.manage().getCookieNamed(\"{value}\") == null) {\n" +
    "            System.err.println(\"manage.verifyCookieNamedPresent failed\");\n" +
    "        }\n",
    "manage.waitForCookieNamedPresent": ""
  },
  locateByForType: function(stepType, locatorType, locatorIndex) {
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
    return value.replace(/\\/, "\\\\").replace(/"/, "\\\"");
  }
}));

builder.sel2Formats.push(builder.createLangSel2Formatter({
  name: "Python",
  extension: ".py",
  start:
    "from selenium.webdriver.firefox.webdriver import WebDriver" +
    "\n" +
    "wd = WebDriver()\n",
  end:
    "wd.close()\n",
  lineForType: {
    "get": "wd.get(\"{value}\")\n",
    "navigate.back": "wd.back()\n",
    "navigate.forward": "wd.forward()\n",
    "element.click": "wd.{locateBy}(\"{locator}\").click()\n",
    "element.sendKeys": "wd.{locateBy}(\"{locator}\").send_keys(\"{value}\")\n",
    "element.setSelected":
    "if {value}wd.{locateBy}(\"{locator}\").isSelected():\n" +
    "    wd.{locateBy}(\"{locator}\").toggle()\n",
    /*"getKeyboard.sendKeys": "?",*/
    "verifyTextPresent":
    "if not \"{value}\" in wd.find_element_by_tag_name(\"html\").text:\n" +
    "    raise Exception(\"Text not found in page.\")\n",
    "switchTo": "        wd = wd.switch_to_window(\"{value}\")\n"
  },
  locateByForType: function(stepType, locatorType, locatorIndex) {
    return {
      "class": "find_element_by_class_name",
      "id": "find_element_by_id",
      "link": "find_element_by_link_text",
      "xpath": "find_element_by_xpath",
      "css": "find_element_by_css_selector",
      "name": "find_element_by_name"}[locatorType];
  },
  escapeValue: function(stepType, value, valueIndex) {
    if (stepType == "element.setSelected") {
      return value ? "" : "not ";
    }
    return value.replace(/\\/, "\\\\").replace(/"/, "\\\"");
  }
}));