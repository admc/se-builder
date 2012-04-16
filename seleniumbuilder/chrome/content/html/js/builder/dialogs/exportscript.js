/**
 * Dialog that can be inserted to allow the user to export the current script using a variety of
 * formats, via builder.selenium1.adapter et al.
 */
builder.dialogs.exportscript = {};

/** The DOM node into which to insert the dialog, replacing its contents. */
builder.dialogs.exportscript.node = null;

builder.dialogs.exportscript.show = function(node) {
  builder.dialogs.exportscript.node = node;
  
  var format_list = newNode('ul');
  
  var cancel_b = newNode('a', 'Cancel', {
    class: 'button',
    click: function () {
      builder.dialogs.exportscript.hide();
    },
    href: '#cancel'
  });
  
  jQuery(node).html('').
      append(newNode('h3', 'Choose export format')).
      append(format_list).
      append(cancel_b);
  
  // Option to overwrite the already-saved file.
  if (builder.getScript().path &&
      builder.getScript().path.where == "local")
  {
    jQuery(format_list).append(create_overwrite_li());
  }
  
  if (builder.getScript().seleniumVersion == builder.selenium2) {
    for (var i = 0; i < builder.selenium2.io.formats.length; i++) {
      jQuery(format_list).append(create_sel2_format_li(builder.selenium2.io.formats[i]));
    }
  } else {
    if (builder.versionconverter.canConvert(builder.getScript(), builder.selenium2)) {
      jQuery(format_list).append(newNode("span", "Selenium 2:"));
      for (var i = 0; i < builder.selenium2.io.formats.length; i++) {
        jQuery(format_list).append(create_sel2_format_li(builder.selenium2.io.formats[i]));
      }
      jQuery(format_list).append(newNode("span", "Selenium 1:"));
    } else {
      var iList = builder.versionconverter.nonConvertibleStepNames(builder.getScript(), builder.selenium2);
      var inconvertibles = "";
      for (var i = 0; i < iList.length; i++) {
        inconvertibles += iList[i] + " ";
      }
      jQuery(format_list).append(newNode("span", "This script contains steps that can't be saved as Selenium 2 yet:", newNode("br"), inconvertibles));
    }
    var formats = builder.selenium1.adapter.availableFormats();
    for (var i = 0; i < formats.length; i++) {
      jQuery(format_list).append(create_sel1_format_li(formats[i]));
    }
  }
};

builder.dialogs.exportscript.hide = function () {
  builder.dialogs.exportscript.node.html('');
};

builder.dialogs.exportscript.do_export_sel1 = function(myFormat, hostPort, browserString) {
  if (hostPort) {
    myFormat.getFormatter().options.environment = browserString;
    var hAndP = hostPort.split(":");
    if (hAndP.length > 1) {
      myFormat.getFormatter().options.rcHost = hAndP[0];
      myFormat.getFormatter().options.rcPort = hAndP[1];
    }
  }
  var file = builder.selenium1.adapter.exportScriptWithFormat(
    builder.getScript(),
    myFormat);
  if (file) {
    builder.suite.setCurrentScriptSaveRequired(false);
    builder.getScript().path = 
      {
        where: "local",
        path: file.path,
        format: myFormat
      };
    builder.gui.suite.update();
    builder.suite.broadcastScriptChange();
  }
  builder.dialogs.exportscript.hide();
};

/**
 * Creates a li node for selecting a format to export with.
 * @param format The format to export with.
 */
function create_sel1_format_li(myFormat) {
  var li_node = newNode('li',
    newNode('a', myFormat.name, {
      click: function(event) {
        if (myFormat.name == "HTML") {
          builder.dialogs.exportscript.do_export_sel1(myFormat);
        } else {
          builder.dialogs.rc.show(builder.dialogs.exportscript.node, null, function(hostPort, browserString) {
              builder.dialogs.exportscript.do_export_sel1(myFormat, hostPort, browserString);
            }, "Save");
        }
      },
      href: '#export-' + myFormat.id
    })
  );
  return li_node;
};

function create_sel2_format_li(myFormat) {
  var script = builder.getScript();
  if (script.seleniumVersion == builder.selenium1) {
    script = builder.versionconverter.convertScript(script, builder.selenium2);
  }
  var nonExportables = myFormat.nonExportables(script);
  if (nonExportables.length > 0) {
    var l = "";
    for (var i = 0; i < nonExportables.length; i++) {
      if (i != 0) { l += ", "; }
      l += nonExportables[i];
    }
    return newNode('li', "Cannot export as " + myFormat.name + ". The following steps are not supported: " + l + ".");
  }
  var li_node = newNode('li',
    newNode('a', myFormat.name, {
      click: function(event) {
        if (builder.selenium2.io.saveScript(script, myFormat)) {
          builder.getScript().path = script.path; // If the 
          builder.suite.setCurrentScriptSaveRequired(false);
          builder.gui.suite.update();
        }
        builder.dialogs.exportscript.hide();
      },
      href: '#export-sel2'
    })
  );
  return li_node;
};

/** Creates a li node for overwriting the existing file. */
function create_overwrite_li() {
  var script = builder.getScript();
  var path = script.path;
  return newNode('li', newNode('a', "Save as " + path.format.name + " to " + path.path, {
    click: function(event) {
      if (builder.getScript().seleniumVersion == builder.selenium1) {
        if (builder.selenium2.io.formats.indexOf(path.format) != -1) {
          script = builder.versionconverter.convertScript(script, builder.selenium2);
        } else {
          var file = builder.selenium1.adapter.exportScriptWithFormatToPath(
            script,
            path.format,
            path.path);
          if (file) {
            builder.suite.setCurrentScriptSaveRequired(false);
            builder.gui.suite.update();
          }
        }
      }
      if (script.seleniumVersion == builder.selenium2) {
        if (builder.selenium2.io.saveScript(script, path.format, path.path)) {
          builder.suite.setCurrentScriptSaveRequired(false);
          builder.gui.suite.update();
        }
      }
      builder.dialogs.exportscript.hide();
    },
    href: '#export-overwrite'
  }));
}