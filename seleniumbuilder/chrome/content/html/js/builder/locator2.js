/**
 * Data structure describing a Selenium 1/2 locator. The "values" property maps different ways of
 * locating an element to the values used to do so. (For example, mapping
 * builder.locator.methods.id to "searchField".) The "preferredMethod" property specifies which
 * method should be used.
 */
 
builder.locator = {};

/**
 * Available types of locator, to be used as keys. Use eg builder.locator.methods.xpath to refer to
 * the idea of an xpath locator.
 */
builder.locator.methods = {
  id:    {},
  name:  {},
  link:  {},
  css:   {},
  xpath: {}
};

builder.locator.methods.id[builder.selenium1] = "id";
builder.locator.methods.id[builder.selenium2] = "id";
builder.locator.methods.name[builder.selenium1] = "name";
builder.locator.methods.name[builder.selenium2] = "name";
builder.locator.methods.link[builder.selenium1] = "link";
builder.locator.methods.link[builder.selenium2] = "link text";
builder.locator.methods.css[builder.selenium1] = "css";
builder.locator.methods.css[builder.selenium2] = "css selector";
builder.locator.methods.xpath[builder.selenium1] = "xpath";
builder.locator.methods.xpath[builder.selenium2] = "xpath";

/**
 * @param The preferred location method (one of builder.locator.methods).
 * @param Map of locator methods to appropriate values.
 */
builder.locator.Locator = function(preferredMethod, values) {
  this.preferredMethod = preferredMethod;
  this.values = values || {};
};

builder.locator.Locator.prototype = {
  /** @return Ñame of the locator's preferred location method for the given version. */
  getName: function(selVersion) { return this.preferredMethod[selVersion]; },
  /** @return Value of the preferred method. */
  getValue: function()    { return this.values[this.preferredMethod] || ""; },
  /** @return The same locator with the given preferred method. */
  withPreferredMethod: function(preferredMethod) {
    var l2 = new builder.locator.Locator(preferredMethod);
    for (var t in this.values) { l2.values[t] = this.values[t]; }
  }
};

builder.locator.empty = function() {
  return new builder.locator.Locator(builder.locator.methods.id);
};

builder.locator.fromElement = function(element) {
  var values = {};
  var preferredMethod = null;

  // FIXME: This function needs a lot more thought, for example the "value" property is much
  // more useful for type="submit".
  // TODO: set locator.frame to be a locator to the frame containing the element
  
  // Locate by ID
  var id = element.getAttribute('id');
  if (id) {
    values[builder.locator.methods.id] = id;
    values[builder.locator.methods.css] = "#" + id;
    if (findNode("id", id) == element) {
      preferredMethod = builder.locator.methods.id;
    }
  }
  
  // Locate by name
  var name = element.getAttribute('name');
  if (name) {
    values[builder.locator.methods.name] = name;
    if (!preferredMethod && findNode("name", name) == element) {
      preferredMethod = builder.locator.methods.name;
    }
  }
  
  // Locate by link text
  if ((element.tagName.toUpperCase() == "A") ||
      (element.parentNode.tagName && element.parentNode.tagName.toUpperCase() == "A")) 
  {
    var link = removeHTMLTags(element.innerHTML);
    if (link) {
      values[builder.locator.methods.link] = link;
      if (!preferredMethod && findNode("link", link) == element) {
        preferredMethod = builder.locator.methods.link;
      }
    }
  }
  
  // Locate by XPath
  var xpath = getHtmlXPath(element);
  if (xpath) {
    // Contrary to the XPath spec, Selenium requires the "//" at the start, even for paths that 
    // don't start at the root.
    xpath = (stringXpath.substring(0, 2) != "//" ? ("/" + stringXpath) : stringXpath);
    values[builder.locator.methods.xpath] = xpath;
    if (!preferredMethod) {
      preferredMethod = builder.locator.methods.xpath;
    }
  }
  
  // Locate by class 
  var className = element.getAttribute('class');
  if (className && !values[builder.locator.methods.css]) {
    values[builder.locator.methods.css] = element.tagName.toLowerCase() + "." + className.replace(/ .*/, '');
    if (!preferredMethod) {
      preferredMethod = builder.locator.methods.css;
    }
  }
  
  return new builder.locator.Locator(preferredMethod, values);
};

// Helper functions:

/** The DOM type enum of an Element node, as opposed to eg an attribute or text. */
var ELEMENT_NODE_TYPE = 1;

/** 
 * Gets the XPath bit between two /s for normal elements.
 * @param node The DOM node whose XPath selector to find 
 */
function getChildSelector(node) {
  // Figure out the index of this node amongst its siblings.
  var count = 1;
  var sibling = node.previousSibling;
  while (sibling) {
    if (sibling.nodeType == ELEMENT_NODE_TYPE && sibling.nodeName == node.nodeName) {
      count++;
    }
    sibling = sibling.previousSibling;
  }
  if (count == 1) {
    // This may be the only node of its name, which would make for simpler XPath.
    var onlyNode = true;
    sibling = node.nextSibling;
    while (sibling) {
      if (sibling.nodeType == ELEMENT_NODE_TYPE && sibling.nodeName == node.nodeName) {
        onlyNode = false;
        break;
      }
      sibling = sibling.nextSibling;
    }
    if (onlyNode) {
      return node.nodeName.toLowerCase();
    }
  }

  // It's not the only node, so use the count.
  return node.nodeName.toLowerCase() + "[" + count + "]";
}

/**
 * Get the Xpath to the given node, using HTML-specific attributes.
 * @param node The DOM node whose XPath we want 
 * @param doc The document the node is in 
 */
function getMyXPath(node, doc) {
  // We try a variety of approaches here:
  var nodeName = node.nodeName.toLowerCase();

  // If the node has an ID unique in the document, select by ID.
  if (node.id && doc.getElementById(node.id) == node) {
    return "//" + nodeName + "[@id='" + node.id + "']";
  }

  // If the node has a class unique in the document, select by class.
  var className = node.className;
  // The XPath syntax to match one class name out of many is atrocious.
  if (className && className.indexOf(' ') == -1 &&
      doc.getElementsByClassName(className).length == 1) 
  {
    return "//" + nodeName + "[@class='" + className + "']";
  }

  // If the node is a label for a field - whose ID we assume is unique, use that.
  if (nodeName == "label" && node.hasAttribute('for')) {
    return "//label[@for='" + node.getAttribute('for') + "']";
  }

  // If the node has a parent node which isn't the body, try the next node up.
  // If the node is a "body" or "html" element, recursing further up leads to trouble -
  // so we give up and just return a child selector. Multiple bodies or htmls are the sign of
  // deeply disturbed HTML, so we can be OK with giving up at this point.
  if (nodeName != "body" && nodeName != "html" && node.parentNode &&
      node.parentNode.nodeName.toLowerCase() != "body") 
  {
    return getMyXPath(node.parentNode, doc) + "/" + getChildSelector(node);
  } else {
    return "//" + getChildSelector(node);
  }
}

/** 
 * Get an Xpath to a node using our knowledge of HTML.
 * Uses label[@for=] classnames, and textContent in addition to tagnames and ids.
 */
function getHtmlXPath(node) {
  var nodeName = node.nodeName.toLowerCase();
  // If we're clicking on the raw "html" area, which is possible if we're clicking below the
  // body for some reason, just return the path to "html".
  if (nodeName == "html") {
    return "//html";
  }
  var parent = getMyXPath(node.parentNode, window.bridge.getRecordingWindow().document);

  if (parent.indexOf("']") > -1) {

    var text = node.textContent;
    // Escape ' characters.
    text = text.replace(/[']/gm, "&quot;");

    // Attempt to key on the text content of the node for extra precision.
    if (text && text.length < 30) {
      var win = window.bridge.getRecordingWindow();
      var attempt = parent.substr(0, parent.indexOf("']") + 2) + "//" + nodeName;
      // If the text contains whitespace characters that aren't spaces, we convert any
      // runs of whitespace into single spaces and trim off the ends, then use the
      // XPath normalize-space command to ensure it will get matched correctly. Otherwise
      // links with eg newlines in them won't work. 
      if (hasNonstandardWhitespace(text)) {
        attempt = attempt + "[normalize-space(.)='" +
            builder.normalizeWhitespace(text) + "']";
      } else {
        // (But if we can get away without it, do so!)
        attempt = attempt + "[.='" + text + "']";
      }
      // Check this actually works. 
      if (new MozillaBrowserBot(win).findElementBy("xpath", attempt, win.document, win) == node) {
        return attempt;
      }
    }
  }

  return parent + "/" + getChildSelector(node);
}

/** Whether the given text has non-space (0x20) whitespace). */
function hasNonstandardWhitespace(text) {
  return !(/^[ \S]*$/.test(text));
}

/** 
 * Uses the given locator to find the node it identifies. 
 */
function findNode(locatorType, locator) {
  var win = window.bridge.getRecordingWindow();
  return new MozillaBrowserBot(win).findElementBy(locatorType, locator, win.document, win);
}

/** Function from global.js in Windmill, licensed under Apache 2.0. */
function removeHTMLTags(str){
  str = str.replace(/&(lt|gt);/g, function (strMatch, p1) {
    return (p1 == "lt") ? "<" : ">";
  });
  var strTagStrippedText = str.replace(/<\/?[^>]+(>|$)/g, "");
  strTagStrippedText = strTagStrippedText.replace(/&nbsp;/g,"");
  return strTagStrippedText;
}