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
  jQuery('#' + stepID + '-type').text(step.type);
  for (var i = 0; i < 2; i++) {
    if (paramNames.length > i) {
      jQuery('#' + stepID + 'edit-p' + i).show();
      jQuery('#' + stepID + 'edit-p' + i + '-name').text(paramNames[i]);
      jQuery('#' + stepID + '-p' + i).show();
      jQuery('#' + stepID + '-p' + i + '-name').text(paramNames[i]);
      if (paramNames[i].startsWith("locator")) {
        jQuery('#' + stepID + '-p' + i + '-value').text(step[paramNames[i]].type + ": " + step[paramNames[i]].value);
      } else {
        jQuery('#' + stepID + '-p' + i + '-value').text(step[paramNames[i]]);
      }
      if (paramNames.length > 1) {
        jQuery('#' + stepID + '-p' + i).css("display", "block");
        jQuery('#' + stepID + '-p' + i + '-name').show();
      } else {
        jQuery('#' + stepID + '-p' + i).css("display", "inline");
        jQuery('#' + stepID + '-p' + i + '-name').hide();
      }
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

function editType(stepID) {
  var sel = newNode('select');
  var step = builder.getCurrentScript().getStepWithID(stepID);
  for (var i = 0; i < builder.sel2.types.length; i++) {
    if (builder.sel2.types[i] == step.type) {
      sel.appendChild(newNode('option', builder.sel2.types[i], { value: builder.sel2.types[i], selected: 'true' }));
    } else {
      sel.appendChild(newNode('option', builder.sel2.types[i], { value: builder.sel2.types[i] }));
    }
  }
  var editDiv = newNode(
    'div',
    {
      id: stepID + '-edit-div'
    },
    sel,
    newNode('a', "OK", {
      class: 'button',
      href: '#',
      click: function (e) {
        step.changeType(jQuery('#' + stepID + '-edit-div select').val());
        jQuery('#' + stepID + '-edit-div').remove();
        jQuery('#' + stepID + '-type').show();
        builder.sel2.updateStepDisplay(stepID);
      }
    })
  );
  
  jQuery('#' + stepID + '-type').after(editDiv);
  jQuery('#' + stepID + '-type').hide();
}

function editParam(stepID, pIndex) {
  var step = builder.getCurrentScript().getStepWithID(stepID);
  var pName = step.getParamNames()[pIndex];
  if (pName.startsWith("locator")) {
    var typeDropDown = newNode(
      'select',
      {
        id: stepID + '-p' + pIndex + '-locator-type-chooser'
      }
    );
    var editDiv = newNode(
      'div',
      {
        id: stepID + '-p' + pIndex + '-edit-div'
      },
      typeDropDown,
      ": ",
      newNode('input', {id: stepID + '-p' + pIndex + '-edit-input', type:'text', value: step[pName].value}),
      newNode('a', "OK", {
        class: 'button',
        href: '#',
        click: function (e) {
          step[pName].type = jQuery('#' + stepID + '-p' + pIndex + '-locator-type-chooser').val();
          step[pName].value = jQuery('#' + stepID + '-p' + pIndex + '-edit-input').val();
          jQuery('#' + stepID + '-p' + pIndex + '-edit-div').remove();
          jQuery('#' + stepID + '-p' + pIndex).show();
          builder.sel2.updateStepDisplay(stepID);
        }
      })
    );
    
    for (var i = 0; i < builder.sel2.locatorTypes.length; i++) {
      var lType = builder.sel2.locatorTypes[i];
      if (lType == step[pName].type) {
        jQuery(typeDropDown).append(newNode(
          'option', lType, { selected: "true" }
        ));
      } else {
        jQuery(typeDropDown).append(newNode(
          'option', lType
        ));
      }
    }
    
    jQuery('#' + stepID + '-p' + pIndex).after(editDiv);
    jQuery('#' + stepID + '-p' + pIndex).hide();
  } else {
    var editDiv = newNode(
      'div',
      {
        id: stepID + '-p' + pIndex + '-edit-div'
      },
      newNode('input', {id: stepID + '-p' + pIndex + '-edit-input', type:'text', value: step[pName]}),
      newNode('a', "OK", {
        class: 'button',
        href: '#',
        click: function (e) {
          step[pName] = jQuery('#' + stepID + '-p' + pIndex + '-edit-input').val();
          jQuery('#' + stepID + '-p' + pIndex + '-edit-div').remove();
          jQuery('#' + stepID + '-p' + pIndex).show();
          builder.sel2.updateStepDisplay(stepID);
        }
      })
    );
    
    jQuery('#' + stepID + '-p' + pIndex).after(editDiv);
    jQuery('#' + stepID + '-p' + pIndex).hide();
  }
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
          click: function() { editType(step.id); }
        }),
        newNode('a', "edit ", newNode('span', 'p0', {id: step.id + 'edit-p0-name'}), {
          id: step.id + 'edit-p0',
          href: '#',
          class: 'b-task',
          click: function() { editParam(step.id, 0); }
        }),
        newNode('a', "edit ", newNode('span', 'p1', {id: step.id + 'edit-p1-name'}), {
          id: step.id + 'edit-p1',
          href: '#',
          class: 'b-task',
          click: function() { editParam(step.id, 1); }
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
            click: function() { editType(step.id); }
          }),
      
          // The first parameter
          newNode('span', {id: step.id + '-p0'},
            newNode('a', {
              id: step.id + '-p0-name',
              class:'b-param-type',
              href: '#',
              click: function() { editParam(step.id, 0); }
            }),
            newNode('a', '', {
              id: step.id + '-p0-value',
              class:'b-param',
              href: '#',
              click: function() { editParam(step.id, 0); }
            })
          ),
          
          // The second parameter
          newNode('span', {id: step.id + '-p1'},
            newNode('a', {
              id: step.id + '-p1-name',
              class:'b-param-type',
              href: '#',
              click: function() { editParam(step.id, 1); }
            }),
            newNode('a', '', {
              id: step.id + '-p1-value',
              class:'b-param',
              href: '#',
              click: function() { editParam(step.id, 1); }
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