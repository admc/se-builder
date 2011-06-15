builder.setCurrentScript = function(script) {
  builder.storage.set('script', script);
};

builder.getCurrentScript = function() {
  return builder.storage.get('script');
};

/**
 * Defines a Sel2Script object that encapsulates a single test script.
*/
builder.sel2.Sel2Script = function() {
  this.steps = [];
  this.path = null;
  this.seleniumVersion = "2";
  this.version = "1";
};

builder.sel2.Sel2Script.prototype = {
  getStepWithID: function(id) {
    for (var i = 0; i < this.steps.length; i++) {
      if (this.steps[i].id == id) { return this.steps[i]; }
    }
    return null;
  }
};

builder.sel2.__idCounter = 0;

/**
 * @param type The type of step
 * Further arguments used as parameters
 */
builder.sel2.Sel2Step = function(type) {
  this.type = type;
  this.id = builder.sel2.__idCounter;
  builder.sel2.__idCounter++;
  var pNames = builder.sel2.paramNames[this.type];
  for (var i = 0; i < pNames; i++) {
    if (i + 1 < arguments.length) {
      this[pNames[i]] = arguments[i + 1];
    } else {
      this[pNames[i]] = "";
    }
  }
};

builder.sel2.Sel2Step.prototype = {
  getParamNames: function() {
    return builder.sel2.paramNames[this.type];
  },
  changeType: function(newType) {
    this.type = newType;
    var pNames = builder.sel2.paramNames[this.type];
    for (var i = 0; i < pNames; i++) {
      if (!(pNames[i] in this)) {
        this[pNames[i]] = "";
      }
    }
  }
};