// The method selection dialog
builder.dialogs.method = (function () {
  // Import the list of methods to be displayed. (see methods.js)
  var methods = builder.methods;

  /**
   * Gets a DOM fragment containing help for a method.
   *
   * Returns null if the help_document was not loaded, or if the method is undocumented in it.
   *
   * @param name  The base method name to get documentation for.
   */
  var getHelp = (function () {
    // First, we load in the documentation and define a helper function before returning the 
    // getHelp function.
    var help_document;

    // Load the documentation document when the recorder is started up.
    builder.interface.addOnloadHook(function () {
      window.bridge.load(jQuery, {
        url: builder.urlFor("iedoc.xml"),
        success: function (doc) {
          help_document = doc;
        },
        error: function () {
          //Not having the help isn't a total disaster
          if (typeof console != 'undefined') {
            console.log("Loading help failed:");
            console.log(arguments);
          }
        },
        dataType: "xml"
      });
    });
    
    // The documentation is in an XML format that contains HTML-like structure. We need to
    // convert their <b> nodes into HTML <b> nodes.
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

    return function getHelp(name) {
      if (help_document) {
        var base = new SeleniumFunction(new_method.value).base_name;
        var node = jQuery(help_document).find("function[name='" + base + "'] comment").get(0);
        if (node) {
          return newFragment(newNode('b', base), ": ", fakeCloneChildren(node));
        }
      }
      return null;
    }
  })();
  
  // Keep track of the status of modifiers.
  var modifiers = {};
  
  function includeModifier(modifier) {
    if (!modifiers[modifier.name]) { modifiers[modifier.name] = []; }
    modifiers[modifier.name].push(modifier);
    modifier.active = modifier.when_off;
  }
  
  for (var i = 0; i < methods.length; i++) {
    if (methods[i].modifiers) {
      if (methods[i].modifiers.before) {
        includeModifier(methods[i].modifiers.before);
      }
      if (methods[i].modifiers.after) {
        includeModifier(methods[i].modifiers.after);
      }
    }
  }
  
  /**
   * Set the status of a modifier.
   *
   * When the status of a modifier is set, the linked modifiers (i.e. those with the same "name")
   * are kept in the same state.
   *
   * If the current_method depends on the modifier, it will be updated.
   *
   * @param modifier  The modifier
   * @param value   The state it should be in (true => on, false => off)
   */
  function setModifierStatus(modifier, is_active) {
    var name = modifier.name;
    for (var i = 0; i < modifiers[name].length; i++) {
      modifiers[name][i].active = modifiers[name][i][is_active ? 'when_on' : 'when_off'];
    }
    if (typeof tab_index != 'undefined') {
      var selected_index = jQuery.inArray(jQuery('option[selected]', method_select).get(0), jQuery('option', method_select));
      method_select.modifyList(current_modifiers, methods[tab_index].categories[category_index].contents);
      if (selected_index > -1) {
        switchMethod(selected_index);
      }
    }
  }
  
  /** @return The status (whether it is on or off) of a modifier. */
  function getModifierStatus(modifier) {
    var name = modifier.name;
    return modifiers[name][0].active == modifiers[name][0].when_on;
  }


  // Keep track of the last category that was selected in each tab.
  var last_selected_category = {};
  
  /**
   * Set the last category selected for a given tab.
   *
   * @param tab_index
   * @param category_index
   */
  function setLastCategoryIndex(tab_index, category_index) {
    last_selected_category[tab_index] = category_index;
  }
  
  function getLastCategoryIndex(tab_index) {
    return last_selected_category[tab_index] || 0;
  }
  
  // The text field containing the name of the method currently chosen  
  var new_method; 
  // a PrettySelect for choosing a category (left list)
  var category_select;
  // a PrettySelect for choosing an option ( right list)
  var method_select; 
  //  used to cache the DOM node used for selecting a method dialog.
  var dom;
  // The step we are editing
  var current_step;
  // The DOM node which dom has replaced, preserved so it can be swapped back in in hide()
  var replaced_node;
  // The method the step had before we started editing
  var original_method;
  // is the index of which block of methods we're looking at (actions, asserts, etc.)
  var tab_index;
  // Which category (the left-hand list) we've selected
  var category_index;
  // Which method in the category we've selected
  var method_index;
  // List of the filters from the current tab
  var current_modifiers;
  // Whether to ignore switchTab invocations. Used to prevent infinite recursion.
  var blockSwitchTab = false;

  /** Returns the DOM node used for selecting a method dialog. */
  function getDom() {
    if (dom) { return dom; }

    new_method = newNode('input', {
      id: 'new-method',
      name: 'new-method',
      class: 'texta',
      change: function (event) {
        selectOriginalMethod(this.value);
      },
      keyup: function (event) {
        if (event.which == 13) { builder.dialogs.method.hide(); }
      }
    });
    category_select = new builder.dialogs.PrettySelect([], function (index, text) {
      switchCategory(index);
    });
    jQuery(category_select).addClass("category-select");
    method_select = new builder.dialogs.PrettySelect([], function (index, text) {
      builder.storage.set('save_required', true);
      switchMethod(index);
    });

    // div containing list of radio buttons for selecting tabs.
    var tab_bar = newNode('div', { class: 'tab-bar' });
    for (var i = 0; i < methods.length; i++) {
      var rNode = newNode('input', {
        type: 'radio',
        id: 'method-dialog-tab-' + i,
        name: 'method-dialog-type',
        value: i,
        change: function () { switchTab(/* selectTabRadioButton*/ false, this.value); }
        });
      // Setting action as the default selected radio button
      if (i == 0) {
          rNode.checked = true;
      }
      tab_bar.appendChild(rNode);
      tab_bar.appendChild(newNode('label', { 'for': 'method-dialog-tab-' + i }, methods[i].name));
    }

    dom = newNode('div', { class: 'method-dialog' },
      new_method,
      newNode('a', "OK", {
        class: 'record-button ui-state-default ui-corner-all',
        href: '#change',
        click: function (e) {
          builder.dialogs.method.hide();
          e.preventDefault();
          e.stopPropagation();
        }
      }),
      tab_bar,
      newNode('div', { class: "tab-container" },
        newNode('div', { id: "before-modifier" }),
        newNode('div', { style: "clear: both" },
          category_select,
          method_select
        ),
        newNode('div', { style: "clear: both;border-bottom: 1px dashed #CCCCCC;" }),
        newNode('div', { id: "after-modifier" }),
        newNode('div', { class: "help", id: "method-dialog-help" })
      )
    );
    return dom;
  }

  // A function to set the status of a modifier when its checkbox or radio button is pressed.
  function modifierToggle(modifier) {
    return function () {
      if ((this.type == 'checkbox' && this.checked) || (this.type == 'radio' && this.value == '1')) {
        setModifierStatus(modifier, true);
      } else {
        setModifierStatus(modifier, false);
      }
    }
  }

  /**
   * Creates a check box or pair of radio buttons for activating/de-activating a modifier.
   * 
   * @param name The name of the modifier
   * @param modifier The modifier itself 
   */
  function modifierFragment(name, modifier) {
    var text = modifier.text;
    if (text.cloneNode) { text = text.cloneNode(true); }

    var ret;
    var a, b;

    if (modifier.text instanceof Array) {
      ret = newFragment(
        b = newNode('input', {
          type: 'radio',
          id: name + 'a',
          name: name,
          value: "0",
          change: modifierToggle(modifier)
        }), 
        newNode('label', { for: name + 'a' }, text[0]),
        newNode('br'),
        a = newNode('input', {
          type: 'radio',
          id: name + 'b',
          name: name,
          value: "1",
          change: modifierToggle(modifier)
        }),
        newNode('label', { for: name + 'b' }, text[1])
      );
    } else {
      ret = newFragment(
        a = newNode('input', {
          type: 'checkbox',
          id: name,
          name: name,
          value: "1",
          change: modifierToggle(modifier)
        }),
        newNode('label', { for: name }, text)
      );
    }
    
    if (a && getModifierStatus(modifier)) {
      a.checked = true;
    } else {
      if (b) { b.checked = true; }
    }

    return ret;
  }

  /** Stops event propagation to prevent a click *on* the method dialog from closing it. */  
  function preventHide(event) {
    event.stopPropagation();
  }

  /**
   * Tries to toggle the method's modifiers such that running base through them returns name.
   *
   * Does not toggle any modifiers unless it returns true.
   *
   * @param name The target (e.g. verifyNotText)
   * @param tab The tab object with a .modifiers attribute.
   * @param base The starting string (e.g. getText)
   * @return Boolean The modifiers have been set correctly.
   */
  function setOriginalModifiers(name, tab, base) {
    var modifiers = [];

    if (tab.modifiers && tab.modifiers.before) {
      modifiers.push(tab.modifiers.before);
    }
    if (tab.modifiers && tab.modifiers.after) {
      modifiers.push(tab.modifiers.after);
    }
    return fixModifiers(name, base, modifiers);
  }

  /**
   * Explores all the re-combinations of modifiers being turned on or off to find a combination 
   * where name == base, and if one can be found, set the modifiers accordingly. 
   */
  function fixModifiers(name, base, modifiers) {
    if (modifiers.length == 0) {
      return name == base;
    }

    if (fixModifiers(name, modifiers[0].when_on(base), modifiers.slice(1))) {
      setModifierStatus(modifiers[0], true);
      return true;
    }
    if (fixModifiers(name, modifiers[0].when_off(base), modifiers.slice(1))) {
      setModifierStatus(modifiers[0], false);
      return true;
    }

    return false;
  }
  
  /**
   * Tries to select the tab, category and method and modifiers that would, when selected, cause
   * the value of the text box to equal original_method.
   *
   * @param original_method The string that we want in the text box
   */
  function selectOriginalMethod(original_method, selectTabRadioButton) {
    // The method may be known by its base name.
    var base = new SeleniumFunction(original_method).base_name;

    for (var tabIndex = 0; tabIndex < methods.length; tabIndex++) {
      var tab = methods[tabIndex];
      for (var categoryIndex = 0; categoryIndex < tab.categories.length; categoryIndex++) {
        var category = tab.categories[categoryIndex].contents;
        for (var methodIndex = 0; methodIndex < category.length; methodIndex++) {
          if (category[methodIndex] == original_method ||
              (category[methodIndex] == base && setOriginalModifiers(original_method, tab, base)))
          {
            return switchTab(selectTabRadioButton, tabIndex, categoryIndex, methodIndex);
          }
        }
      }
    }

    return switchTab(selectTabRadioButton, tab_index || 0, category_index || 0);
  }

  /**
   * Switch to a new "tab" (action/assertion/etc.)
   *
   * Causes the tab to look selected and the contents to appear.
   *
   * If newCategoryIndex is not specified, a value will be guessed,
   * if newMethodIndex is not specified, no method will be selected.
   *
   * @param selectTabRadioButton Whether to also select the radio tab's radio button
   * @param newTabIndex  The index of the tab to select
   * @param newCategoryIndex* The index of the category to select
   * @param newMethodIndex* The index of the method to select
   */
  function switchTab(selectTabRadioButton, newTabIndex, newCategoryIndex, newMethodIndex) {
    if (blockSwitchTab) { return; }
    if (selectTabRadioButton) {
      blockSwitchTab = true;
      jQuery("#method-dialog-tab-" + newTabIndex).click();
      blockSwitchTab = false;
    }
    
    // Show new modifiers
    current_modifiers = [];
    if (methods[newTabIndex].modifiers && methods[newTabIndex].modifiers.before) {
      jQuery("#before-modifier").html(modifierFragment('before', methods[newTabIndex].modifiers.before, dom)).show();
      current_modifiers.push(methods[newTabIndex].modifiers.before);
    } else {
      jQuery("#before-modifier").html("").hide();
    }
    if (methods[newTabIndex].modifiers && methods[newTabIndex].modifiers.after) {
      jQuery("#after-modifier").html(modifierFragment('after', methods[newTabIndex].modifiers.after, dom)).show();
      current_modifiers.push(methods[newTabIndex].modifiers.after);
    } else {
      jQuery("#after-modifier").html("").hide();
    }

    // Show categories
    category_select.modifyList(null, methods[newTabIndex].categories, 'name');

    // Select correct tab 
    jQuery("#method-dialog-tab-" + i).attr('checked', true);

    // If we are switching between assert and wait-for we want to use the similarity between them.
    if (typeof(category_index) != 'undefined' && tab_index == 1 && newTabIndex == 2) {
      newCategoryIndex = newCategoryIndex || category_index + 1;
      if (jQuery("option[selected]", method_select).length) {
        newMethodIndex = newMethodIndex || method_index;
      }
    } else if (category_index && tab_index == 2 && newTabIndex == 1) {
      newCategoryIndex = newCategoryIndex || category_index - 1;
      if (jQuery("option[selected]", method_select).length) {
        newMethodIndex = newMethodIndex || method_index;
      }
    } else {
      newCategoryIndex = newCategoryIndex || getLastCategoryIndex(newTabIndex);
    }

    tab_index = newTabIndex;
    switchCategory(newCategoryIndex, newMethodIndex);
  }

  /**
   * Select a category within the current tab (clicks/mouse events/etc.)
   *
   * Causes the category to be highlighted, and the method list to appear.
   *
   * If newMethodIndex is not specified, no method will be selected.
   *
   * @param newCategoryIndex The index of the category to select.
   * @param newMethodIndex* the method within the category to select
   */
  function switchCategory(newCategoryIndex, newMethodIndex) {
    method_select.modifyList(current_modifiers, methods[tab_index].categories[newCategoryIndex].contents);
    category_index = newCategoryIndex;
    setLastCategoryIndex(tab_index, newCategoryIndex);
    category_select.selectIndex(category_index);

    // disable the before modifier for common waits as they cannot be negated
    if (tab_index == 2 && newCategoryIndex == 0) {
      jQuery('#before-modifier')[0].style.visibility = "hidden";
    } else {
      jQuery('#before-modifier')[0].style.visibility = "visible";
    }

    if (typeof newMethodIndex != 'undefined') {
      switchMethod(newMethodIndex);
    }
  }

  /**
   * Select a method within the current category (open/goBack/etc.)
   *
   * This causes the method to be highlighted, the value of the text box
   * to be set, and the current_step's method to be set.
   *
   * @param newMethodIndex  The index of the method to select.
   */
  function switchMethod(newMethodIndex) {
    new_method.value = jQuery("option", method_select).get(newMethodIndex).textContent;
    current_step.method(new_method.value);
    method_index = newMethodIndex;
    method_select.selectIndex(method_index);

    var help = getHelp(new_method.value);
    if (help) {
      jQuery('#method-dialog-help').show().html(help);
    } else {
      jQuery('#method-dialog-help').hide();
    }
  }

  return {
    /**
     * @param step The step to edit
     * @param node_to_replace The DOM node to replace with this dialog
     */
    show: function (step, node_to_replace) {
      // If the method dialog is already open, hide it.
      if (current_step) {
        builder.dialogs.method.hide();
      }

      dom = getDom();
      replaced_node = node_to_replace;
      current_step = step;
      original_method = step.method();
      node_to_replace.parentNode.insertBefore(dom, node_to_replace);

      // Put in a listener to close the dialog if the user clicks anywhere but the dialog.
      setTimeout(function () {
        if (current_step) {
          jQuery(window).bind('click', builder.dialogs.method.hide);
          jQuery(dom).bind('click', preventHide);
          jQuery(dom).bind('mousedown', preventHide);
        }
      }, 0);
      jQuery(node_to_replace).hide();
      jQuery('#' + step.id).get(0).scrollIntoView(true);

      selectOriginalMethod(original_method, /*selectTabRadioButton*/ true);
    },
    hide: function () {
      if (!current_step) { return; }
      current_step.method(new_method.value);
      current_step = null;
      jQuery(window).unbind('click', builder.dialogs.method.hide);
      jQuery(dom).unbind('click', preventHide);
      jQuery(dom).unbind('mousedown', preventHide);
      jQuery(replaced_node).show();
      dom.parentNode.removeChild(dom);
    }
  };
})();
