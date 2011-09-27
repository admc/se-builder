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
  getStepIndexForID: function(id) {
    for (var i = 0; i < this.steps.length; i++) {
      if (this.steps[i].id == id) { return i; }
    }
    return -1;
  },
  getStepWithID: function(id) {
    var index = this.getStepIndexForID(id);
    return index == -1 ? null : this.steps[index];
  },
  getLastStep: function() {
    return this.steps.length == 0 ? null : this.steps[this.steps.length - 1];
  },
  removeStepWithID: function(id) {
    var index = this.getStepIndexForID(id);
    if (index != -1) {
      var step = this.steps[index];
      this.steps.splice(index, 1);
      return step;
    }
    return null;
  },
  addStep: function(step, afterID) {
    if (afterID) {
      var index = this.getStepIndexForID(afterID);
      if (index != -1) {
        this.steps.splice(index, 0, step);
      }
    }
    this.steps.push(step);
  },
  moveStepToBefore: function(stepID, beforeStepID) {
    var step = this.removeStepWithID(stepID);
    this.steps.splice(this.getStepIndexForID(beforeStepID), 0, step);
  },
  moveStepToAfter: function(stepID, afterStepID) {
    var step = this.removeStepWithID(stepID);
    if (this.getLastStep().id == afterStepID) {
      this.steps.push(step);
    } else {
      this.steps.splice(this.getStepIndexForID(afterStepID) + 1, 0, step);
    }
  },
  reorderSteps: function(reorderedIDs) {
    var newSteps = [];
    for (var i = 0; i < reorderedIDs.length; i++) {
      newSteps.push(this.getStepWithID(reorderedIDs[i]));
    }
    this.steps = newSteps;
  }
};

builder.sel2.__idCounter = 1; // Start at 1 so the ID is always true.

/**
 * @param type The type of step
 * Further arguments used as parameters
 */
builder.sel2.Sel2Step = function(type) {
  this.type = type;
  this.id = builder.sel2.__idCounter;
  builder.sel2.__idCounter++;
  var pNames = builder.sel2.paramNames[this.type];
  if (pNames) {
    for (var i = 0; i < pNames.length; i++) {
      if (i + 1 < arguments.length) {
        this[pNames[i]] = arguments[i + 1];
      } else {
        this[pNames[i]] = pNames[i].startsWith("locator") ? {type: "id", value: ""} : "";
      }
    }
  }
  this.changeType(this.type);
};

builder.sel2.Sel2Step.prototype = {
  getParamNames: function() {
    return builder.sel2.paramNames[this.type];
  },
  changeType: function(newType) {
    this.type = newType;
    var pNames = builder.sel2.paramNames[this.type];
    for (var i = 0; i < pNames.length; i++) {
      if (!this[pNames[i]]) {
        this[pNames[i]] = pNames[i].startsWith("locator") ? {type: "id", value: ""} : "";
      }
    }
  }
};