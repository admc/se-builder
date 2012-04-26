builder.dialogs.convert = {};

builder.dialogs.convert.node = null;
builder.dialogs.convert.dialog = null;

function createConversionLi(script, version) {
  return newNode('li', {}, newNode('a', { href: '#', click: function() {
    builder.setScript(builder.versionconverter.convertScript(script, version));
    builder.stepdisplay.update();
    builder.suite.setCurrentScriptSaveRequired(true);
    builder.gui.suite.update();
    builder.dialogs.convert.hide();
  } }, version.name));
};

builder.dialogs.convert.show = function(node) {
  var script = builder.getScript();
  var conversionOptions = [];
  for (var i = 0; i < builder.seleniumVersions.length; i++) {
    var version = builder.seleniumVersions[i];
    if (version == script.seleniumVersion) { continue; }
    if (builder.versionconverter.canConvert(script, version)) {
      conversionOptions.push(version);
    }
  }
  
  if (conversionOptions.length == 1) {
    builder.setScript(builder.versionconverter.convertScript(script, conversionOptions[0]));
    builder.stepdisplay.update();
    builder.suite.setCurrentScriptSaveRequired(true);
    builder.gui.suite.update();
    return;
  }
  
  builder.dialogs.convert.dialog = newNode('div', {class: 'dialog'});
  jQuery(node).append(builder.dialogs.convert.dialog);
  
  var format_list = newNode('ul');  
  var cancel_b = newNode('a', 'Cancel', {
    class: 'button',
    click: function () {
      builder.dialogs.convert.hide();
    },
    href: '#cancel'
  });
  jQuery(builder.dialogs.convert.dialog).
      append(newNode('h3', "Conversion")).
      append(format_list).
      append(newNode('p', cancel_b));
  
  for (var i = 0; i < builder.seleniumVersions.length; i++) {
    var version = builder.seleniumVersions[i];
    if (version == script.seleniumVersion) { continue; }
    if (builder.versionconverter.canConvert(script, version)) {
      jQuery(format_list).append(createConversionLi(script, version));
    } else {
      var iList = builder.versionconverter.nonConvertibleStepNames(builder.getScript(), version);
      var inconvertibles = "";
      for (var i = 0; i < iList.length; i++) {
        inconvertibles += iList[i] + " ";
      }
      jQuery(format_list).append(newNode('li', version.name + ": The following steps can't be converted: " + inconvertibles));
    }
  }
};

builder.dialogs.convert.hide = function() {
  jQuery(builder.dialogs.convert.dialog).remove();
};