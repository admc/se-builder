/**
 * Code for exporting Selenium 2 scripts in a variety of formats.
*/

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
          line = line.replace("{value}", lang_info.escapeValue(step.type, step.value));
        }
        if (typeof step.locator != 'undefined') {
          line = line.replace("{locator}", step.locator);
          line = line.replace("{locateBy}", lang_info.locateByForType[step.locatorType])
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
    "        WebDriver wd = new FirefoxDriver();\n",
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
    "        if ({value}wd.findElement(By.{locateBy}(\"{locator}\")).isSelected()) {\n" +
    "            wd.findElement(By.{locateBy}(\"{locator}\")).toggle();\n" +
    "        }\n",
    /*"getKeyboard.sendKeys": "        wd.getKeyboard().sendKeys(\"{value}\");\n",*/
    "verifyTextPresent": "        wd.findElement(By.tagName(\"html\")).getText().contains(\"{value}\");\n",
    "switchTo": "        wd = wd.switchTo().window(\"{value}\");\n"
  },
  locateByForType: {
    "class": "className",
    "id": "id",
    "link": "linkText",
    "xpath": "xpath",
    "css": "cssSelector",
    "name": "name"
  },
  escapeValue: function(stepType, value) {
    if (stepType == "element.setSelected") {
      return value ? "" : "!";
    }
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
  locateByForType: {
    "class": "find_element_by_class_name",
    "id": "find_element_by_id",
    "link": "find_element_by_link_text",
    "xpath": "find_element_by_xpath",
    "css": "find_element_by_css_selector",
    "name": "find_element_by_name"
  },
  escapeValue: function(stepType, value) {
    if (stepType == "element.setSelected") {
      return value ? "" : "not ";
    }
    return value.replace(/\\/, "\\\\").replace(/"/, "\\\"");
  }
}));