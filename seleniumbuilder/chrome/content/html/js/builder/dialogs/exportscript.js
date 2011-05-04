/**
 * Dialog that can be inserted to allow the user to export the current script using a variety of
 * formats, via builder.seleniumadapter.
 */
builder.dialogs.exportscript = new(function () {
  /** The DOM node into which to insert the dialog, replacing its contents. */
  var node;
  
  /**
   * Creates a li node for selecting a format to export with.
   * @param format The format to export with.
   */
  function create_format_li(myFormat) {
    var li_node = newNode('li',
      newNode('a', myFormat.name, {
        click: function(event) {
          if (myFormat.name == "HTML") {
            builder.dialogs.exportscript.do_export(myFormat);
          } else {
            builder.dialogs.rc.show(node, null, function(hostPort, browserString) {
                builder.dialogs.exportscript.do_export(myFormat, hostPort, browserString);
              }, "Save");
          }
        },
        href: '#export-' + myFormat.id
      })
    );
    return li_node;
  };
  
  function create_sel2_format_li(myFormat) {
    var nonExportables = myFormat.nonExportables(builder.convertSel1To2(builder.getScript()));
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
          if (builder.saveSel2Script(builder.convertSel1To2(builder.getScript()), myFormat)) {
            builder.storage.set('save_required', false);
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
    return newNode('li', newNode('a', "Save as " + builder.storage.get('testscriptpath').format.name + " to " + builder.storage.get('testscriptpath').path, {
      click: function(event) {
        var path = builder.storage.get('testscriptpath');
        var file = builder.seleniumadapter.exportScriptWithFormatToPath(
          builder.getScript(),
          path.format,
          path.path);
        if (file) {
          builder.storage.set('save_required', false);
          builder.interface.suite.update();
        }
        builder.dialogs.exportscript.hide();
      },
      href: '#export-overwrite'
    }));
  }
  
  return {
    /**
     * Exports the current script for the given host/port/browser string.
     */
    do_export: function(myFormat, hostPort, browserString) {
      if (hostPort) {
        myFormat.getFormatter().options.environment = browserString;
        var hAndP = hostPort.split(":");
        if (hAndP.length > 1) {
          myFormat.getFormatter().options.rcHost = hAndP[0];
          myFormat.getFormatter().options.rcPort = hAndP[1];
        }
      }
      var file = builder.seleniumadapter.exportScriptWithFormat(
        builder.getScript(),
        myFormat);
      if (file) {
        builder.storage.set('save_required', false);
        builder.storage.set('testscriptpath',
          {
            where: "local",
            path: file.path,
            format: myFormat
          }
        );
        builder.interface.suite.update();
      }
      builder.dialogs.exportscript.hide();
    },
    /**
     * Insert an export script dialog.
     * @param anode The DOM node into which to insert the dialog, replacing its contents.
     */
    show: function (anode) {
      node = anode;
      
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
      if (builder.storage.get('testscriptpath') &&
          builder.storage.get('testscriptpath').where == "local")
      {
        jQuery(format_list).append(create_overwrite_li());
      }
      var formats = builder.seleniumadapter.availableFormats();
      if (builder.isSel1ScriptConvertible(builder.getScript())) {
        jQuery(format_list).append(newNode("span", "Selenium 2:"));
        for (var i = 0; i < builder.sel2Formats.length; i++) {
          jQuery(format_list).append(create_sel2_format_li(builder.sel2Formats[i]));
        }
        jQuery(format_list).append(newNode("span", "Selenium 1:"));
      } else {
        jQuery(format_list).append(newNode("span", "This script contains steps that can't be saved as Selenium 2 yet:", newNode("br"), builder.getInconvertibleSel1Steps(builder.getScript())));
      }
      for (var i = 0; i < formats.length; i++) {
        jQuery(format_list).append(create_format_li(formats[i]));
      }
    },
    hide: function () {
      node.html('');
    }
  }
})();
