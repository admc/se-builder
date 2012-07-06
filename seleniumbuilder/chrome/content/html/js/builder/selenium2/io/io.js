builder.selenium2.io = {};

/**
 * Code for exporting/importing Selenium 2 scripts in a variety of formats.
*/
builder.selenium2.io.parseScript = function(file) {
  var scriptJSON = JSON.parse(builder.io.readFile(file));
  var script = new builder.Script(builder.selenium2);
  script.path = {
    where: "local",
    path: file.path,
    format: builder.selenium2.io.formats[0]
  };
  
  for (var i = 0; i < scriptJSON.steps.length; i++) {
    var step = new builder.Step(builder.selenium2.stepTypes[scriptJSON.steps[i].type]);
    step.negated = scriptJSON.steps[i].negated || false;
    script.steps.push(step);
    var pNames = step.getParamNames();
    for (var j = 0; j < pNames.length; j++) {
      if (scriptJSON.steps[i][pNames[j]]) {
        if (step.type.getParamType(pNames[j]) == "locator") {
          step[pNames[j]] = builder.selenium2.io.jsonToLoc(scriptJSON.steps[i][pNames[j]]);
        } else {
          step[pNames[j]] = scriptJSON.steps[i][pNames[j]];
        }
      }
    }
  }
  
  return script;
};

/** Stub: No suite implementation for Selenium 2 yet. */
builder.selenium2.io.parseSuite = function(file) {
  return null;
};

builder.selenium2.io.jsonToLoc = function(jsonO) {
  var method = builder.locator.methodForName(builder.selenium2, jsonO.type);
  var values = {};
  values[method] = [jsonO.value];
  return new builder.locator.Locator(method, 0, values);
};

builder.selenium2.io.loadScriptJSON = function(path) {
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

builder.selenium2.io.saveScript = function(script, format, path) {
  if (format.get_params) {
    format.get_params(script, function(params) {
      builder.selenium2.io.saveScriptWithParams(script, format, path, params);
    });
  } else {
    builder.selenium2.io.saveScriptWithParams(script, format, path, {});
  }
};

builder.selenium2.io.saveScriptWithParams = function(script, format, path, params) {
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
      var text = converter.ConvertFromUnicode(format.format(script, file.leafName, params));
      outputStream.write(text, text.length);
      var fin = converter.Finish();
      if (fin.length > 0) {
        outputStream.write(fin, fin.length);
      }
      outputStream.close();
      script.path = {
        where: "local",
        path: file.path,
        format: format
      };
      return true;
    } else {
      return false;
    }
  } catch (err) {
    alert("error: " + err);
    return false;
  }
};

builder.selenium2.io.formats = [];

builder.selenium2.io.createLangFormatter = function(lang_info) {
  return {
    name: lang_info.name,
    extension: lang_info.extension,
    get_params: lang_info.get_params || null,
    format: function(script, name, userParams) {
      var t = "";
      var start = lang_info.start.replace(/\{name\}/g, name.substr(0, name.indexOf(".")));
      for (var k in userParams) {
        start = start.replace("{" + k + "}", userParams[k]);
      }
      t += start;
      var used_vars = {};
      for (var i = 0; i < script.steps.length; i++) {
        var step = script.steps[i];
        var line = lang_info.lineForType[step.type.name];
        if (typeof line == 'undefined') {
          throw("Cannot export step of type \"" + step.type.name + "\".");
        }
        if (line instanceof Function) {
          t += line(step, lang_info.escapeValue, userParams);
          continue;
        }
        for (var k in userParams) {
          line = line.replace("{" + k + "}", userParams[k]);
        }
        var pNames = script.steps[i].getParamNames();
        for (var j = 0; j < pNames.length; j++) {
          if (step.type.getParamType(pNames[j]) == "locator") {
            line = line.replace(new RegExp("\{" + pNames[j] + "\}", "g"), lang_info.escapeValue(step.type, step[pNames[j]].getValue(), pNames[j]));
            line = line.replace(new RegExp("\{" + pNames[j] + "By\}", "g"), lang_info.locatorByForType(step.type, step[pNames[j]].getName(builder.selenium2), j + 1));
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
    canExport: function(stepType) {
      return !!lang_info.lineForType[stepType.name];
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