/** Functions for displaying Selenium 2 steps. */
builder.sel2.clearStepsDisplay = function() {
  jQuery("#steps").empty();
};

builder.sel2.updateStepsDisplay = function() {
  builder.sel2.clearStepsDisplay();
  var script = builder.getCurrentScript();
  for (var i = 0; i < script.steps.length; i++) {
    addStep(script.steps[i]);
  }
};

builder.sel2.updateStepDisplay = function(stepID) {
  var step = builder.getCurrentScript().getStepWithID(stepID);
  var paramNames = step.getParamNames();
  for (var i = 0; i < 2; i++) {
    if (paramNames.length > i) {
      jQuery('#' + stepID + 'edit-p' + i).show();
      jQuery('#' + stepID + 'edit-p' + i + '-name').text(paramNames[i]);
      jQuery('#' + stepID + '-p' + i).show();
      jQuery('#' + stepID + '-p' + i + '-name').text(paramNames[i]);
      jQuery('#' + stepID + '-p' + i + '-value').text(step[paramNames[i]]);
    } else {
      jQuery('#' + stepID + 'edit-p' + i).hide();
      jQuery('#' + stepID + '-p' + i).hide();
    }
  }
};

builder.sel2.addNewStep = function() {
  var newStep = new builder.sel2.Sel2Step('element.click');
  builder.getCurrentScript().addStep(newStep);
  addStep(newStep);
  return newStep.id;
};

function addNewStepBefore(beforeStepID) {
  var id = builder.sel2.addNewStep();
  var beforeStepDOM = jQuery('#' + beforeStepID)[0];
  var newStepDOM = jQuery("#" + id)[0];
  newStepDOM.parentNode.removeChild(newStepDOM);
  beforeStepDOM.parentNode.insertBefore(newStepDOM, beforeStepDOM);
}

function addNewStepAfter(afterStepID) {
  var id = builder.sel2.addNewStep();
  var afterStep = jQuery('#' + afterStepID);
  var newStepDOM = jQuery("#" + id)[0];
  newStepDOM.parentNode.removeChild(newStepDOM);
  afterStep.after(newStepDOM);
}

function deleteStep(stepID) {
  builder.getCurrentScript().removeStepWithID(stepID);
  jQuery('#' + stepID).remove();
}

/** Adds the given step to the GUI. */
function addStep(step) {
  jQuery("#steps").append(
    // List of options that materialises on rollover.
    newNode('div', {id: step.id, class: 'b-step'},
      newNode('span', {id: step.id + '-b-tasks', class: 'b-tasks'},
        newNode('a', "edit type", {
          id: step.id + 'edit',
          href: '#',
          class: 'b-task',
          click: function() { /* todo */ }
        }),
        newNode('a', "edit ", newNode('span', 'p0', {id: step.id + 'edit-p0-name'}), {
          id: step.id + 'edit-p0',
          href: '#',
          class: 'b-task',
          click: function() { /* todo */ }
        }),
        newNode('a', "edit ", newNode('span', 'p1', {id: step.id + 'edit-p1-name'}), {
          id: step.id + 'edit-p1',
          href: '#',
          class: 'b-task',
          click: function() { /* todo */ }
        }),
        newNode('a', "delete step", {
          id: step.id + 'delete',
          href: '#',
          class: 'b-task',
          click: function() { deleteStep(step.id); }
        }),
        newNode('a', "new step above", {
          id: step.id + 'insert-above',
          href: '#',
          class: 'b-task',
          click: function() { addNewStepBefore(step.id); }
        }),
        newNode('a', "new step below", {
          id: step.id + 'insert-below',
          href: '#',
          class: 'b-task',
          click: function() { addNewStepAfter(step.id); }
        }),
        newNode('a', "run step", {
          id: step.id + 'run-step',
          href: '#',
          class: 'b-task',
          click: function() { alert("TODO"); /* todo */ }
        }),
        newNode('a', "run from here", {
          id: step.id + 'run-from-here',
          href: '#',
          class: 'b-task',
          click: function() { alert("TODO"); /* todo */ }
        })
      ),
      newNode('div', {class: 'b-step-content', id: step.id + '-content'},
        newNode('div', {class: 'b-step-container', id: step.id + '-container'},
          // The step number
          newNode('span', {class:'b-step-number'}),
      
          // The type
          newNode('a', step.type, {
            id: step.id + '-type',
            href: '#',
            class:'b-method',
            click: function () { /* todo */ }
          }),
      
          // The first parameter
          newNode('span', {id: step.id + '-p0'},
            newNode('a', {
              id: step.id + '-p0-name',
              class:'b-param-type',
              href: '#',
              click: function() { /* todo */ }
            }),
            newNode('a', '', {
              id: step.id + '-p0-value',
              class:'b-param',
              href: '#',
              click: function() { /* todo */ }
            })
          ),
          
          // The second parameter
          newNode('span', {id: step.id + '-p1'},
            newNode('a', {
              id: step.id + '-p1-name',
              class:'b-param-type',
              href: '#',
              click: function() { /* todo */ }
            }),
            newNode('a', '', {
              id: step.id + '-p1-value',
              class:'b-param',
              href: '#',
              click: function() { /* todo */ }
            })
          ),
      
          // Message display
          newNode('div', {class:"b-step-message", id: step.id + "-message", style:'display: none'}),
          newNode('div', {class:"b-step-error", id: step.id + "-error", style:'display: none'})
        )
      )
    )
  );
  
  // Prevent tasks menu from going off the bottom of the list.
  jQuery('#' + step.id).mouseenter(function(evt) {
    var stepEl = jQuery('#' + step.id);
    var menu = jQuery('#' + step.id + '-b-tasks');
    var bottom = jQuery('#bottom');
    if (stepEl.position().top + menu.height() > bottom.position().top &&
        bottom.position().top > 120)
    {
      menu.css("top", bottom.position().top - stepEl.position().top - menu.height() - 6);
    } else {
      menu.css("top", 2);
    }
  });

  builder.sel2.updateStepDisplay(step.id);
}