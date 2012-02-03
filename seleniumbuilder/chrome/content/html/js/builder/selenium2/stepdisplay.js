var reorderHandlerInstalled = false;

/** Functions for displaying Selenium 2 steps. */
builder.sel2.clearStepsDisplay = function() {
  jQuery("#steps").empty();
  jQuery('#recordingSuite0').empty();
};

builder.sel2.updateStepsDisplay = function() {
  if (!reorderHandlerInstalled) {
    // Make steps sortable by dragging.
    jQuery('#steps').sortable({
      items: ".b-step",
      axis: "y",
      update: function(evt, ui) {
        var reorderedSteps = jQuery('#steps .b-step').get();
        var reorderedIDs = [];
        for (var i = 0; i < reorderedSteps.length; i++) {
          reorderedIDs.push(reorderedSteps[i].id);
        }
        builder.getCurrentScript().reorderSteps(reorderedIDs);
      }
    });
    reordered = true;
  }
  builder.sel2.clearStepsDisplay();
  var script = builder.getCurrentScript();
  for (var i = 0; i < script.steps.length; i++) {
    addStep(script.steps[i]);
  }
};

builder.sel2.updateStepDisplay = function(stepID) {
  var step = builder.getCurrentScript().getStepWithID(stepID);
  var paramNames = step.getParamNames();
  if (step.negated) {
    jQuery('#' + stepID + '-type').text("not " + step.type);
  } else {
    jQuery('#' + stepID + '-type').text(step.type);
  }
  if (builder.sel2.playback.playbackFunctions[step.type]) {
    jQuery('#' + stepID + '-unplayable').hide();
  } else {
    jQuery('#' + stepID + '-unplayable').show();
  }
  for (var i = 0; i < 3; i++) {
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
      } else {
        jQuery('#' + stepID + '-p' + i).css("display", "inline");
      }
      if (paramNames.length > 1 || step[paramNames[i]] == "") {
        jQuery('#' + stepID + '-p' + i + '-name').show();
      } else {
        jQuery('#' + stepID + '-p' + i + '-name').hide();
      }
    } else {
      jQuery('#' + stepID + 'edit-p' + i).hide();
      jQuery('#' + stepID + '-p' + i).hide();
    }
  }
};

builder.sel2.showProgressBar = function(stepID) {
  jQuery('#' + stepID + '-progress-done').show();
  jQuery('#' + stepID + '-progress-notdone').show();
};

builder.sel2.hideProgressBar = function(stepID) {
  jQuery('#' + stepID + '-progress-done').hide();
  jQuery('#' + stepID + '-progress-notdone').hide();
};

builder.sel2.setProgressBar = function(stepID, percent) {
  jQuery('#' + stepID + '-progress-done').css('width', percent);
  jQuery('#' + stepID + '-progress-notdone').css('left', percent).css('width', 100 - percent);
  builder.sel2.showProgressBar(stepID);
};

builder.sel2.addNewStep = function() {
  var newStep = new builder.sel2.Sel2Step('clickElement');
  builder.getCurrentScript().addStep(newStep);
  addStep(newStep);
  builder.storage.set('save_required', true);
  return newStep.id;
};

function addNewStepBefore(beforeStepID) {
  var id = builder.sel2.addNewStep();
  var beforeStepDOM = jQuery('#' + beforeStepID)[0];
  var newStepDOM = jQuery("#" + id)[0];
  newStepDOM.parentNode.removeChild(newStepDOM);
  beforeStepDOM.parentNode.insertBefore(newStepDOM, beforeStepDOM);
  builder.getCurrentScript().moveStepToBefore(id, beforeStepID);
  builder.storage.set('save_required', true);
}

function addNewStepAfter(afterStepID) {
  var id = builder.sel2.addNewStep();
  var afterStep = jQuery('#' + afterStepID);
  var newStepDOM = jQuery("#" + id)[0];
  newStepDOM.parentNode.removeChild(newStepDOM);
  afterStep.after(newStepDOM);
  builder.getCurrentScript().moveStepToAfter(id, afterStepID);
  builder.storage.set('save_required', true);
}

function deleteStep(stepID) {
  builder.getCurrentScript().removeStepWithID(stepID);
  jQuery('#' + stepID).remove();
  builder.storage.set('save_required', true);
}

var searchers = [];
var hasSearchers = false;
var searcherInterval = null;

function toggleSearchers(stepID, pIndex) {
  if (hasSearchers) { stopSearchers(stepID, pIndex); } else { startSearchers(stepID, pIndex); }
}

function stopSearchers(stepID, pIndex) {
  if (searcherInterval) {
    clearInterval(searcherInterval);
  }
  for (var i = 0; i < searchers.length; i++) {
    searchers[i].destroy();
  }
  searchers = [];
  hasSearchers = false;
}

function startSearchers(stepID, pIndex) {
  //builder.interface.record.pause(); qqDPS
  hasSearchers = true;
  attachSearchers(stepID, pIndex, true);
  // Keep on looking for new frames with no attached searchers.
  searcherInterval = setInterval(function() { attachSearchers(stepID, pIndex); }, 500, true);
  window.bridge.focusRecordingTab();
}

/**
 * Attach a VerifyExplorer to each frame in Firefox to allow the user to select a new locator.
 * The code also attaches a boolean to the frames to prevent attaching multiple searchers, but
 * since this can't be easily cleared when searching is complete, it can be overridden with the
 * force parameter.
 */
function attachSearchers(stepID, pIndex, force) {
  // To do this, we first must iterate over the windows in the browser - but of course
  // each window may contain multiple tabs!
  var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
  var en = windowManager.getZOrderDOMWindowEnumerator(null, false);
  while (en.hasMoreElements()) {
    var w = en.getNext();
    for (var i = 0; i < w.frames.length; i++) {
      // This expression filters out the frames that aren't browser tabs.
      // I'm sure there's a better way to detect this, but this would require meaningful
      // documentation in Firefox! qqDPS
      if ((w.frames[i] + "").indexOf("ChromeWindow") == -1) {
        var frame = w.frames[i];
        // Don't attach to the recording window, lest confusion reign.
        if (frame == window) {
          continue;
        }
        // Prevent multiple attached searchers unless force is true.
        if (frame._selenium_builder_hasSearcher && !force) {
          continue;
        }
        frame._selenium_builder_hasSearcher = true;
        searchers.push(new builder.VerifyExplorer(
          frame,
          function() {},
          // This function is called when the user selects a new element.
          function(recordedStep) {
            var originalStep = builder.getCurrentScript().getStepWithID(stepID);
            originalStep[originalStep.getParamNames()[pIndex]] = recordedStep.locator;
            stopSearchers();
            window.bridge.focusRecorderWindow();
            builder.sel2.updateStepDisplay(stepID);
            builder.storage.set('save_required', true);
            // Update the edit-param view.
            jQuery('#' + stepID + '-p' + pIndex + '-edit-div').remove();
            jQuery('#' + stepID + '-p' + pIndex).show();
            editParam(stepID, pIndex);
          }
        ));
      }
    }
  }
}


function updateTypeDivs(stepID, newType) {
  if (newType.startsWith("assert") || newType.startsWith("verify")) {
    jQuery('#' + stepID + '-edit-negate').show();
    jQuery('#' + stepID + '-edit-negate-label').show();
  } else {
    jQuery('#' + stepID + '-edit-negate').hide();
    jQuery('#' + stepID + '-edit-negate-label').hide();
  }
  jQuery('#' + stepID + '-type-info').html(getTypeInfo(newType));
  var cD = jQuery('#' + stepID + '-edit-cat-list');
  var tD = jQuery('#' + stepID + '-edit-type-list');
  cD.attr('__sb-stepType', newType);
  cD.html('');
  tD.html('');
  for (var i = 0; i < builder.sel2.categories.length; i++) {
    var inCat = false;
    for (var j = 0; j < builder.sel2.categories[i][1].length; j++) {
      if (builder.sel2.categories[i][1][j] == newType) {
        inCat = true;
      }
    }
    if (inCat) {
      cD.append(newNode('li', newNode(
        'span',
        builder.sel2.categories[i][0],
        {
          class: 'selected-cat'
        }
      )));
      for (var j = 0; j < builder.sel2.categories[i][1].length; j++) {
        if (builder.sel2.categories[i][1][j] == newType) {
          tD.append(newNode('li',newNode(
            'span',
            builder.sel2.categories[i][1][j],
            {
              class: 'selected-type'
            }
          )));
        } else {
          tD.append(newNode('li', newNode(
            'a',
            builder.sel2.categories[i][1][j],
            {
              class: 'not-selected-type',
              href: '#',
              click: mkUpdate(stepID, builder.sel2.categories[i][1][j])
            }
          )));
        }
      }
    } else {
      cD.append(newNode('li', newNode(
        'a',
        builder.sel2.categories[i][0],
        {
          class: 'not-selected-cat',
          href: '#',
          click: mkUpdate(stepID, builder.sel2.categories[i][1][0])
        }
      )));
    }
  }
}

function mkUpdate(stepID, newType) {
  return function() { updateTypeDivs(stepID, newType); };
}

function getTypeInfo(type) {
  var paramInfo = "";
  var longParamInfo = newNode('ul', {class: 'type-info-longparam'});
  var pNames = builder.sel2.paramNames[type];
  for (var i = 0; i < pNames.length; i++) {
    paramInfo += pNames[i];
    if (i != pNames.length - 1) {
      paramInfo += ", ";
    }
    jQuery(longParamInfo).append(newNode('li',
      newNode('b', pNames[i]), ": " + builder.sel2.docs[type].params[pNames[i]]));
  }
  if (pNames.length > 0) { paramInfo = " (" + paramInfo + ")"; }
    
  var body = newNode('div', {class: 'type-info-body'});
  jQuery(body).html(builder.sel2.docs[type].description + " Parameter expressions of the form <i>${varname}</i> are replaced by the contents of the variable <i>varname</i>");
  
  return newNode(
    'div',
    { class: 'type-info' },
    newNode('div', {class: 'type-info-head'}, type + paramInfo),
    longParamInfo,
    body
  );
}

function editType(stepID) {
  var step = builder.getCurrentScript().getStepWithID(stepID);
  
  var catL = newNode(
    'ul',
    {
      id: stepID + '-edit-cat-list',
      class: 'cat-list'
    }
  );
  var typeL = newNode(
    'ul',
    {
      id: stepID + '-edit-type-list',
      class: 'type-list'
    }
  );
  
  var editDiv = newNode(
    'div',
    {
      id: stepID + '-edit-div',
      style: 'margin-bottom: 5px;'
    },
    newNode('table', { class: 'cat-table', cellpadding: '0', cellspacing: '0' }, newNode('tr',
      newNode('td', catL),
      newNode('td', typeL),
      newNode('td', { id: stepID + '-type-info' })
    )),
    newNode(
      'input',
      {
        id: stepID + '-edit-negate',
        type: 'checkbox',
        style: 'display: none;'
      }
    ),
    newNode(
      'span',
      " Negate assertion/verification",
      {
        id: stepID + '-edit-negate-label',
        style: 'display: none;'
      }
    ),
    newNode('p'),
    newNode('a', "OK", {
      class: 'button',
      href: '#',
      click: function (e) {
        var type = jQuery('#' + stepID + '-edit-cat-list').attr('__sb-stepType');
        if (type) {
          step.changeType(type);
          step.negated = (step.type.startsWith("assert") || step.type.startsWith("verify")) && jQuery('#' + stepID + '-edit-negate').attr('checked');
        }
        jQuery('#' + stepID + '-edit-div').remove();
        jQuery('#' + stepID + '-type').show();
        builder.sel2.updateStepDisplay(stepID);
        builder.storage.set('save_required', true);
      }
    })
  );
  
  jQuery('#' + stepID + '-type').after(editDiv);
  jQuery('#' + stepID + '-type').hide();
  updateTypeDivs(stepID, step.type);
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
    
    function okf() {
      step[pName].type = jQuery('#' + stepID + '-p' + pIndex + '-locator-type-chooser').val();
      step[pName].value = jQuery('#' + stepID + '-p' + pIndex + '-edit-input').val();
      if (step[pName].alternatives && step[pName].alternatives[step[pName].type] != step[pName].value) {
        step[pName].alternatives = {};
      }
      jQuery('#' + stepID + '-p' + pIndex + '-edit-div').remove();
      jQuery('#' + stepID + '-p' + pIndex).show();
      builder.sel2.updateStepDisplay(stepID);
      builder.storage.set('save_required', true);
    }
    
    var editDiv = newNode(
      'div',
      {
        id: stepID + '-p' + pIndex + '-edit-div'
      },
      typeDropDown,
      ": ",
      newNode('input', {id: stepID + '-p' + pIndex + '-edit-input', type:'text', value: step[pName].value}),
      newNode('a', "OK", {
        id: stepID + '-p' + pIndex + '-OK',
        class: 'button',
        href: '#',
        click: function (e) { okf(); }
      }),
      newNode('div',
        newNode('a', "Find a different target", {
          href: '#',
          click: function() { toggleSearchers(stepID, pIndex); }
        })
      )
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
        
    if (step[pName].alternatives) {
      var alternativesList = newNode(
        'ul',
        {
          id: stepID + '-p' + pIndex + '-alternatives-list',
          class: 'b-alternatives'
        }
      );
      var alternativesDiv = newNode(
        'div',
        {
          id: stepID + '-p' + pIndex + '-alternatives-div'
        },
        newNode('p', "Suggested alternatives:"),
        alternativesList
      );
      
      var hasAlts = false;
      for (var altName in step[pName].alternatives) {
        if (typeof altName == "string") {
          hasAlts = true;
          jQuery(alternativesList).append(createAltItem(step, pIndex, pName, altName, step[pName].alternatives[altName]));
        }
      }
      
      if (hasAlts) {
        jQuery(editDiv).append(alternativesDiv);
      }
    }
    
    jQuery('#' + stepID + '-p' + pIndex).after(editDiv);
    jQuery('#' + stepID + '-p' + pIndex).hide();
    jQuery('#' + stepID + '-p' + pIndex + '-edit-input').focus().select().keypress(function (e) {
      if (e.which == 13) {
        okf();
      }
    });
  } else {
    function okf() {
      step[pName] = jQuery('#' + stepID + '-p' + pIndex + '-edit-input').val();
      jQuery('#' + stepID + '-p' + pIndex + '-edit-div').remove();
      jQuery('#' + stepID + '-p' + pIndex).show();
      builder.sel2.updateStepDisplay(stepID);
      builder.storage.set('save_required', true);
    }
    
    var editDiv = newNode(
      'div',
      {
        id: stepID + '-p' + pIndex + '-edit-div'
      },
      newNode('input', {id: stepID + '-p' + pIndex + '-edit-input', type:'text', value: step[pName]}),
      newNode('a', "OK", {
        id: stepID + '-p' + pIndex + '-OK',
        class: 'button',
        href: '#',
        click: function (e) { okf(); }
      })
    );
    
    jQuery('#' + stepID + '-p' + pIndex).after(editDiv);
    jQuery('#' + stepID + '-p' + pIndex).hide();
    jQuery('#' + stepID + '-p' + pIndex + '-edit-input').focus().select().keypress(function (e) {
      if (e.which == 13) {
        okf();
      }
    });
  }
}

/** Creates list item for alternative locator. */
function createAltItem(step, pIndex, pName, altName, altValue) {
  return newNode(
    'li',
    newNode(
      'a',
      altName + ": " + altValue,
      {
        href: '#',
        click: function(e) {
          jQuery('#' + step.id + '-p' + pIndex + '-locator-type-chooser').val(altName);
          jQuery('#' + step.id + '-p' + pIndex + '-edit-input').val(altValue);
        }
      }
    )
  );
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
          click: function() { builder.sel2.playback.runTestBetween(null, step.id, step.id); }
        }),
        newNode('a', "run from here", {
          id: step.id + 'run-from-here',
          href: '#',
          class: 'b-task',
          click: function() { builder.sel2.playback.runTestBetween(null, step.id, null); }
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
          
          // The third parameter
          newNode('span', {id: step.id + '-p2'},
            newNode('a', {
              id: step.id + '-p2-name',
              class:'b-param-type',
              href: '#',
              click: function() { editParam(step.id, 2); }
            }),
            newNode('a', '', {
              id: step.id + '-p2-value',
              class:'b-param',
              href: '#',
              click: function() { editParam(step.id, 2); }
            })
          ),
      
          // Message display
          newNode('div', {style:"width: 100px; height: 3px; background: #333333; display: none", id: step.id + "-progress-done"}),
          newNode('div', {style:"width: 0px; height: 3px; background: #bbbbbb; position: relative; top: -3px; left: 100px; display: none", id: step.id + "-progress-notdone"}),
          newNode('div', {class:"b-step-message", id: step.id + "-message", style:'display: none'}),
          newNode('div', {class:"b-step-error", id: step.id + "-error", style:'display: none'}),
          newNode('div', "Warning: playback not supported for this step type.", {class:"b-step-error", id: step.id + "-unplayable", style:'display: none'})
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
  builder.storage.set('save_required', true);
}