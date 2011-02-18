/**
 * An implementation of the observer pattern to maintain loose coupling between components.
 * Used to store data and notify other parts of the recorder about changes via listeners. Listeners
 * are functions attached to fields via the addChangeListener function, and detached via the
 * removeChangeListener function.
 * 
 * Also contains an Url class to help manipulate URLs.
 */
builder.storage = new(function () {
  // Map of names to values.
  var values = {};
  /**
   * Map of names to listener lists. All values to be stored need to have an explicitly declared
   * list of listeners.
   */
  var listeners = {
    // The username that the current user has on the frontend
    username: [],
    // The current url of the content page 
    currenturl: [],
    // Whether we are waiting for a page to load
    pageloading: [],
    // An object with either:
    // { where: "remote", customer_name:, customer_subdomain:, project_name:, test_script: }
    // or:
    // { where: "local", path:, format: }
    testscriptpath: [],
    // A boolean that should be true when there are unsaved changes to the current test script
    save_required: [],
    // The baseurl of the current test script, eg http://foo.com for http://foo.com/bar/baz/
    baseurl: [],
    // A boolean that is set to true if loading fails
    loaderror: [],
    // Old value of the currently focused field
    oldValue: [],
    // The currently focused field
    oldValueField: [],
    // The path of the current suite, if any
    suitePath: [],
    // Whether the current suite has unsaved changes
    suiteSaveRequired: []
  };

  /**
   * Add a listener to be called when the value of the named property is changed. If the property
   * has already been set, calls onchange immediately with the current value.
   * @param name The name of the property to listen for changes on
   * @param onchange The listener to call, which should take a single argument: the new value
   */
  this.addChangeListener = function(name, onchange) {
    listeners[name].push(onchange);

    if (typeof(values[name]) != 'undefined') {
      onchange(values[name]);
    }
  };

  /**
   * Removes listener from the list of functions to call when the value of the named property is
   * changed.
   * Note that "arguments.callee" is the easiest way to get a reference to the current function,
   * so use this in an anonymous function that needs to be able to unbind itself. 
   * @param name The name of the property for which we want to unbind a listener
   * @param onchange The listener to unbind
   */
  this.removeChangeListener = function(name, onchange) {
    if (listeners[name].indexOf(onchange) > -1) {
      listeners[name].splice(listeners[name].indexOf(onchange), 1);
    } else {
      throw ReferenceError("This handler is not listening on the '" + name + "' property");
    }
  };

  /**
   * Sets the value associated with "name" to "value" and calls anyone listening. Note that
   * listeners are not called if there is no change.
   */
  this.set = function (name, value) {
    if (values[name] === name) {
      return;
    }

    values[name] = value;

    for (var i = 0; i < listeners[name].length; i++) {
      listeners[name][i](value);
    }
  };

  /**
   * Gets the value associated with "name", returns "fallback" if it is not defined.
   */
  this.get = function (name, fallback) {
    if (typeof(values[name]) == 'undefined') {
      return fallback;
    }
    return values[name];
  };
})();

/**
 * A helper object for extracting particular parts of an URL. 
 *
 * @param url If this doesn't contain ://, a http:// is prefixed.
 */
builder.Url = function (url) {
  if (url) {
    this.base = url.indexOf('://') < 0 ? 'http://' + url : url;
  } else {
    this.base = null;
  }
};

builder.Url.prototype = {
  /**
   * @return everything before the first "/" in the path including protocol, hostname, and port
   * Example: http://www.foo.com:8000/bar -> http://www.foo.com:8000
   */
  server: function () {
    return this.base ? this.base.replace(/^([a-z]*:\/\/[^\/\?#]+).*$/i, "$1") : null;
  },

  /**
   * @return The hostname
   * Example: http://www.foo.com:8000/bar -> www.foo.com
   */
  hostname: function () {
    return this.base ? this.base.replace(/^.*:\/\/([^:\/\?#]*)$/, "$1") : null;
  },
  
  /**
   * @return Everything after and including the first "/" in the path. This is guaranteed to
   *         start with a "/", even if the URL contained no path component.
   * Example: http://www.foo.com:8000/bar -> /bar
   * Example: http://www.foo.com -> /
   */
  path: function () {
    if (!this.base) { return null; }

    var attempt = this.base.replace(this.server(), "");
    if (attempt.indexOf('/') != 0) {
      attempt = "/" + attempt;
    }
    return attempt;
  },

  /**
   * @return The entire URL
   * Example: http://www.foo.com:8000/bar -> http://www.foo.com:8000/bar
   */
  href: function () {
    return this.server() + this.path();
  }
};