/*
 * Contains a number of GUI components inserted in-line for various purposes.
 *
 * It contains the following dialogs:
 * - method    the method selection dialog
 * - locator   the location selection dialog
 * - save      the save-file dialog
 * - open      the list of files to open
 * - values    dialog for selecting unique randomised emails/usernames
 * - xhrfailed an alert on network failure
 */

// Set up dialogs namespace.
builder.dialogs = {};

/**
 * A custom interface component for the Builder method selection interface, displaying a list of
 * options to choose from.
 *
 * The user-facing component is a wrapped <input type="select">, with no scroll-bars, and always of
 * size 12 (because that's the maximum in any list at the moment).
 *
 * The major benefit of using this component is the support for modifiers:
 * A modifier is an object with a public method "active" that takes a string and returns a string.
 * When the modifyList method of the PrettySelect is called, it re-generates the text values of its
 * options by passing the values it extracted from the constructor's list through all of the
 * registered modifiers in the order that they were registered.
 *
 * Modifiers typically have two functions, when_on and when_off, and are activated by setting their
 * "active" function to the when_on function.
 *
 * For example, actions (like "click") have an "andWait" modifier, whose when_on function appends
 * "andWait" to the action's text, and whose when_off function just returns the text.
 *
 * @constructor
 * @param {Array} list  A list of strings, or objects with the attribute "property"
 * @param {Function(Number, String)} onchange  A function to be called when the user selects a value,
 *                                             p1 is the index of the selection,
 *                                             p2 the current modified text value of the selection.
 * @param {String} property If the list consists of objects, instead of strings, use the property
 *                          with this name to extract the values.
 */
builder.dialogs.PrettySelect = function (list, onchange, property) {
  // Set up the GUI components: the <select> list and an enclosing div, which is what is returned
  // as the PrettySelect component.
  var select = newNode('select', {
    size: 12,
    change: function () {
      onchange(Number(this.value), this.childNodes[this.value].textContent);
    }
  });
  var node = newNode('div', {
    class: 'select-helper'
  }, select);

  var modifiers = [];

  // Populate the list.
  for (var i = 0; i < list.length; i++) {
    select.appendChild(newNode('option', { value: i }));
  }

  /** Runs a string through all the modifiers registered. */
  function modify(text) {
    for (var i = 0; i < modifiers.length; i++) {
      text = modifiers[i].active(text);
    }
    return text;
  }

  /**
   * Change the list's values and/or modifiers. This function should be called whenever a
   * modifier's active function changes, and to change the modifiers used, or the values used.
   *
   * @param new_modifiers New list of modifiers to replace the old one, optional.
   * @param new_list New list of values to replace the old one, optional.
   * @param new_property If new_list is made of objects, not strings, the property to use to
   *                     extract the values.
   */
  node.modifyList = function (new_modifiers, new_list, new_property) {
    if (new_modifiers) { modifiers = new_modifiers; }

    if (new_list) {
      // Remove the old values.
      while (select.firstChild) { select.removeChild(select.firstChild); }

      // Add the new values.
      for (var i = 0; i < new_list.length; i++) {
        var text = modify(new_property ? new_list[i][new_property] : new_list[i]);
        select.appendChild(newNode('option', { value: i }, text));
      }
    } else {
      // Re-modify the list's values.
      for (var i = 0; i < list.length; i++) {
        select.childNodes[i].textContent = modify(property ? list[i][property] : list[i]);
      }
    }
    // Since the width of the options may have changed, call adjustWidth to change the width of
    // the PrettySelect as a whole.
    if (this.clientWidth) { builder.dialogs.PrettySelect.adjustWidth(this.parentNode); }
  }

  /** Programmatically selects the given index. */
  node.selectIndex = function (i) {
    select.childNodes[i].selected = "selected";
  }

  // Now call modifyList with no arguments to run the list's values through the initially
  // registered modifiers.
  node.modifyList();

  return node;
}

/** Sets the width of the PrettySelect's outer div to be the same as its first option's. */
builder.dialogs.PrettySelect.adjustWidth = function (node) {
  setTimeout(function () { // need to set timeout to give the browser a chance to recalculate the clientWidth
    jQuery(node).find('.select-helper').each(function () {
      jQuery(this).css('width', (jQuery(this).find('option').get(0) || { clientWidth: 0 }).clientWidth);
    });
  }, 0);
}

// Currently just an alert, would be nice to do some diagnostics
builder.dialogs.xhrfailed = new(function () {
  return {
    show: function (on_login) {
      alert('We are unable to contact the server. This is likely because:\n\n' +

      '1. The network is temporarily down.\n' + '2. ' + (on_login ? '' : 'You have logged out of your account.\n3. ') + 'Our systems are not responding.\n\n' +

      'If the problem persists. Please contact us.')
    },
    hide: function () {}
  }
})();
