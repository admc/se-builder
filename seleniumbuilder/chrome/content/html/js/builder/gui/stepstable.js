builder.gui.stepstable = {};

builder.gui.stepstable.makeTables = function() {
  return newNode('div', {},
    builder.gui.stepstable.makeTable(false),
    builder.gui.stepstable.makeTable(true)
  );
};

builder.gui.stepstable.makeTable = function(showOrphanedSel1Steps) {
  var table = newNode('table', {
    class: 'stepstable',
    cellpadding: '0',
    cellspacing: '0',
    id: showOrphanedSel1Steps? "stepstable-extended" : "stepstable",
    style: showOrphanedSel1Steps ? "display: none" : ""
  });
  var sel2Names = {};
  var i = 0;
  for (var sel1Name in builder.selenium1.stepTypes) {
    var sel2Name = builder.versionconverter.sel1ToSel2Steps[sel1Name] || ""; 
    if (!sel2Name && !showOrphanedSel1Steps) { continue; }
    
    if (i++ % 20 == 0) {
      var head = newNode('tr', {class: 'labels'},
        newNode('td', "Name"),
        newNode('td', "Sel 1 Translation"),
        newNode('td', "Negatable"),
        newNode('td', "Local Playback")
      );
      for (var j = 0; j < builder.selenium2.io.formats.length; j++) {
        jQuery(head).append(newNode('td', builder.selenium2.io.formats[j].name));
      }
      jQuery(table).append(head);
    }
    
    sel2Names[sel2Name] = true;
    var sel2Type = sel2Name ? builder.selenium2.stepTypes[sel2Name] : null;
    var row = newNode('tr', {class: "r" + (i % 2)},
      // Selenium 2 step name, if available
      newNode('td', {}, sel2Name),
      // Selenium 1 step name, if available
      newNode('td', {}, sel1Name),
      // Negatable
      newNode('td', {}, sel2Name ? (sel2Type.getNegatable() ? newNode('span', {class:'yes'}, "yes") : newNode('span', {class:'no'}, "no")) : ""),
      // Can play back locally
      newNode('td', {}, sel2Name ? (builder.selenium2.playback.canPlayback(sel2Type) ? newNode('span', {class:'yes'}, "yes") : newNode('span', {class:'no'}, "no")) : "")
    );
    for (var j = 0; j < builder.selenium2.io.formats.length; j++) {
      jQuery(row).append(newNode('td', {}, sel2Name ? (builder.selenium2.io.formats[j].canExport(sel2Type) ? newNode('span', {class:'yes'}, "yes") : newNode('span', {class:'no'}, "no")) : ""));   
    }
    jQuery(table).append(row);
  }
  for (var sel2Name in builder.selenium2.stepTypes) {
    if (sel2Names[sel2Name]) { continue; }
    
    if (i++ % 20 == 0) {
      var head = newNode('tr', {class: 'labels'},
        newNode('td', "Name"),
        newNode('td', "Sel 1 Translation"),
        newNode('td', "Negatable"),
        newNode('td', "Local Playback")
      );
      for (var j = 0; j < builder.selenium2.io.formats.length; j++) {
        jQuery(head).append(newNode('td', builder.selenium2.io.formats[j].name));
      }
      jQuery(table).append(head);
    }
    
    var sel2Type = sel2Name ? builder.selenium2.stepTypes[sel2Name] : null;
    var row = newNode('tr', {class: "r" + (i % 2)},
      // Selenium 2 step name, if available
      newNode('td', {}, sel2Name),
      // No Selenium 1 step name
      newNode('td', {}, ""),
      // Negatable
      newNode('td', {}, sel2Name ? (sel2Type.getNegatable() ? newNode('span', {class:'yes'}, "yes") : newNode('span', {class:'no'}, "no")) : ""),
      // Can play back locally
      newNode('td', {}, sel2Name ? (builder.selenium2.playback.canPlayback(sel2Type) ? newNode('span', {class:'yes'}, "yes") : newNode('span', {class:'no'}, "no")) : "")
    );
    for (var j = 0; j < builder.selenium2.io.formats.length; j++) {
      jQuery(row).append(newNode('td', {}, sel2Name ? (builder.selenium2.io.formats[j].canExport(sel2Type) ? newNode('span', {class:'yes'}, "yes") : newNode('span', {class:'no'}, "no")) : ""));
    }
    jQuery(table).append(row);
  }
  return table;
};

builder.gui.stepstable.show = function() {
  var win = window.open("chrome://seleniumbuilder/content/html/stepstable.html", "stepstable", "width=1000,height=700,toolbar=no,location=no,directories=no,status=yes,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes");
  builder.gui.stepstable.booter = setInterval(function() {
    if (win.wrappedJSObject.insertContent) {
      var tables = builder.gui.stepstable.makeTables();
      win.wrappedJSObject.insertContent(tables);
      clearInterval(builder.gui.stepstable.booter);
    }
  }, 10);
};