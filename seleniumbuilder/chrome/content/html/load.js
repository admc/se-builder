/**
 * This is the server-side file for loading the IDE.
 * This is included into the SB window by recorder.html and is responsible for loading the IDE.
 *
 * When this code is run, we can expect:
 * - window.bridge as a link to the bootstrap (seleniumBuilder.js)
 * - window.assumeDeadBy as a timeout waiting for us to load
 * - The html tag to have a class of "boot"
 */

// Called by the windmill loading code
function incProgressBar() {}

var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

/**
 * Create a new DOM node for the current document.
 * @param tagname The name of the node
 * 
 * Further parameters are treated as follows:
 *   strings: put inside verbatim
 *   DOM nodes: put inside node
 *   objects (maps): used to set attributes: strings are attributes, functions are evt handlers
 *
 * @return A DOM node
 *
 * Basic usage: var mySpan = newNode('span', "Hello World!");
 *
 * Supports attributes and event handlers:
 * var mySpan = newNode('span', {style:"color: red", focus: function(){alert(this)}, id:"hello"},
 *              "World, Hello!");
 * Also allows nesting to create trees:
 * var myPar = newNode('p', newNode('b',{style:"color: blue"},"Hello"), mySpan)
 */
function newNode(tagname) {
  var node = document.createElement(tagname);
  for (var i = 1; i < arguments.length; i++) {
    var arg = arguments[i];
    if (typeof arg == 'string') {
      // Text node
      node.appendChild(document.createTextNode(arg));
    } else if (typeof arg == 'object') {
      if (arg.nodeName) {
        // It' a DOM Node
        node.appendChild(arg);
      } else {
        // It's a map specifying class, style, event handlers or attributes
        for (var key in arg) {
          var value = arg[key];
          if (key == 'class') {
            // Class is treated differently from normal attributes...
            node.className = value;
          } else if (key == 'style') {
            // ...as is style
            node.style.cssText = value;
          } else if (typeof value == 'function') {
            // It's an event handler
            try {
              node.addEventListener(key, value, false); //W3C
            } catch (e) {
              try {
                node.attachEvent('on' + key, value, "Language"); //MSIE
              } catch (e2) {
                node['on' + key] = value;
              }
            }
          } else { // It's a normal attribute!
            node.setAttribute(key, value);
          }
        } // End loop over arg
      } // End else clause of checking for DOM node.
    } // End check for typeof object
  } // End loop over extra arguments
  return node;
}
/**
 * A complement to newNode above that allows you to create a set of nodes with no explicit parent
 * element.
 *
 * Accepts text and DOM node objects as arguments.
 *
 * @return A document fragment, i.e a list of DOM nodes
 */
function newFragment() {
  var frag = document.createDocumentFragment();
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] == 'string') { //Text
      frag.appendChild(document.createTextNode(arguments[i]));
    } else { //DOM Node (hopefully)
      frag.appendChild(arguments[i]);
    }
  }
  return frag;
}

// Our namespace
var builder = {
  /**
   * Roots given relative URL on domain name used by this install, and postfixes a random number
   * as a get-param to ensure fresh load. If the relative path starts with a slash, it's appended
   * directly to the domain name, otherwise, it's put into the /recorder/ sub-folder.
   *
   * @param relative A relative URL on the builder site
   * @return The correct absolute URL to use
   */
  urlFor: function (relative) {
    var base = window.bridge.recorderURL();
    if (relative.charAt(0) == "/") {
      return base.substr(0, base.indexOf("/", 9)) + relative +
          (relative.indexOf("?") > -1 ? "&" : "?") + Math.random();
    } else {
      return base + relative + (relative.indexOf("?") > -1 ? "&" : "?") + Math.random();
    }
  }
};

builder.extensions = [];

// The windmill namespace
var windmill = {};

// FYI this function is executed immediately.
builder.Loader = (function /* load */ () {
  var progress = newNode('ul', {
    style: "position: absolute; color: grey; top: 0px; left: 0px;"
  });
  document.body.appendChild(progress);

  /**
   * Takes all arguments as the paths to scripts and imports them into the window by attaching
   * them to its DOM as script nodes.
   */
  function importScripts() {
    for (var i = 0; i < arguments.length; i++) {
      document.getElementsByTagName("head")[0].appendChild(
      newNode('script', {
        src: builder.urlFor("js/" + arguments[i]),
        type: "text/javascript"
      }));
    }
  }
  
  if (prefManager.prefHasUserValue("extensions.seleniumbuilder.extensions")) {
    var exts = prefManager.getCharPref("extensions.seleniumbuilder.extensions").split(",");
    for (var i = 0; i < exts.length; i++) {
      document.getElementsByTagName("head")[0].appendChild(
        newNode('script', {
          src: exts[i],
          type: "text/javascript"
        }));
    }
  }
  
  // Windmill by default will compress this lot into one blob - so should we!
  // I think the order is reasonably important, but I haven't analysed the dependencies
  importScripts(
    // Load Libraries
    "lib/cssQuery-p.js",
    "lib/fleegix_js/fleegix.js",
    "lib/jquery/jquery-1.3.2.min.js",
    "lib/jquery/jquery-ui-1.7.2.custom.min.js",
    "lib/jquery/hoverIntent.js",
    "lib/jquery/jquery.bgiframe.js",
    "lib/jquery/jquery.dimensions.js",
    "lib/jquery/jquery.tooltip.min.js",
    "lib/browserdetect.js",
    "lib/json2.js",
    "lib/js-xpath.js",
    // Load Selenium IDE Formats & TestCase/Suite
    "selenium-ide/xhtml-entities.js",
    "selenium-ide/preferences.js",
    "selenium-ide/tools.js",
    "selenium-ide/file-utils.js",
    "selenium-ide/testCase.js",
    "selenium-ide/testSuite.js",
    "selenium-ide/format.js",
    // Load SB/Selenium IDE format adapter
    "builder/seleniumadapter.js",
    // Load Selenium
    "selenium/htmlutils.js",
    "selenium/selenium-logging.js",
    "selenium/selenium-browserdetect.js",
    "selenium/selenium-browserbot.js",
    "selenium/selenium-api.js",
    "selenium/selenium-commandhandlers.js",
    // Load Selenium Builder
    "builder/storage.js",
    "builder/loadlistener.js",
    "builder/seleniumfunction.js",
    "builder/locator.js",
    "builder/recorder.js",
    "builder/assertexplorer.js",
    "builder/interface.js",
    "builder/seleniumpatch.js",
    "builder/methods.js",
    // Load in user-extensions.js
    "user-extensions.js",
    // Deal with the changes it made
    "builder/extensions.js",
    "builder/selenium2/methods.js",
    "builder/selenium2/versionconverter.js",
    "builder/selenium2/io.js",
    "builder/selenium2/script.js",
    "builder/selenium2/stepdisplay.js",
    "builder/selenium2/playback.js",
    "builder/dialogs/dialogs.js",
    "builder/dialogs/method.js",
    "builder/dialogs/locator.js",
    "builder/dialogs/values.js",
    "builder/dialogs/exportscript.js",
    "builder/dialogs/editparam.js",
    "builder/dialogs/rc.js",
    "builder/dialogs/record.js",
    "builder/dialogs/runall.js",
    "builder/step.js",
    "builder/rc.js",
    "builder/local.js",
    "builder/suite.js"
  );
})();