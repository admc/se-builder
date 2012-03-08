builder.selenium1.docs = {};

bridge.loadFile("chrome://seleniumbuilder/content/html/iedoc.xml",
  /* success */
  function(doc_data) {
    for (var n in builder.selenium1.stepTypes) {
      var stepType = builder.selenium1.stepTypes[n];
      var node = jQuery(doc_data).find("function[name='" + stepType.baseName + "'] comment").get(0);
      builder.selenium1.docs[stepType.name] = {params: {}, description: ""};
      var pNames = stepType.getParamNames();
      for (var i = 0; i < pNames.length; i++) { builder.selenium1.docs[stepType.name].params[pNames[i]] = ""; }
      if (node) {
        builder.selenium1.docs[stepType.name].description = fakeCloneChildren(node);
      }
    }
  },
  /* failure */
  function(e) {
    alert("Could not load Selenium 1 documentation: " + e);
  }
);

function fakeCloneChildren(node) {
  var frag = newFragment();

  for (var i = 0; i < node.childNodes.length; i++) {
    var child = node.childNodes[i];

    if (child.nodeType == 3) {
      text = child.textContent.split("\n\n");
      for (var j = 0; j < text.length - 1; j++) {
        if (text[j]) { frag.appendChild(newFragment(text[j], newNode('br'))); }
      }
      frag.appendChild(newFragment(text[text.length - 1]));
    } else if (child.nodeType == 1) {
      frag.appendChild(newNode(child.nodeName, fakeCloneChildren(child)));
    }
  }

  return frag;
}