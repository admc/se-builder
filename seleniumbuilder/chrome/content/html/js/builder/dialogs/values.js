/**
 * In testing it's sometimes useful to have consistent but random user names and email addresses
 * to enter into forms and compare against. That is, unique_username_1 will be different with each
 * test run, but the same across multiple steps of that same run.
 *
 * To quote the GUI itself:
 * When testing the sign-up process it is useful to have a source of unique identifiers. Each time
 * any test-script is run, new values are used.
 * ${unique_username_1} will be replaced by a value of the form 'sbxxxxx' where each x represents
 * a lower-case letter.
 * ${unique_email_1} gives 'sbxxxxx@<your domain>.???.com'.
 *
 * This is a GUI component for picking special field values that behave in that way when played
 * back.
 */
builder.dialogs.values = new(function () {
  /** The DOM components that make up the dialog. */
  var dom;
  /** The step whose field we're editing. */
  var current_step;
  /** The HTML field we're editing. */
  var value_input;
  /** A ul list of suggested unique values. */
  var unique_variables;

  /** Creates dialog's DOM components, and caches them. */
  function getDom() {
    if (dom) {
      return dom;
    }

    unique_variables = newNode('ul', newNode('p', newNode('b', 'Unique variables')));

    dom = newNode(
      'span',
      {
        class: 'locator-dialog',
        mousedown: function (e) { e.stopPropagation(); },
        click: function (e) { e.stopPropagation(); }
      },
      newNode('a', 'OK', {
        class: 'ui-state-default ui-corner-all record-button',
        click: function () { builder.dialogs.values.hide(); },
        href: '#save'
      }),
      unique_variables,
      newNode('p', { class: 'warning' },
        "When testing the sign-up process it is useful to have a source of unique identifiers. Each time any test-script is run, new values are used.", newNode('br'), newNode('code', "${unique_username_1}"), " will be replaced by a value of the form 'sbxxxxx' where each x represents a lower-case letter.", newNode('br'), newNode('code', "${unique_email_1}"), " gives 'sbxxxxx@<your domain>.???.com'.", newNode('br'), "For more detail ", newNode('a', { href: '#help' }, "see our help document"))
    );
    return dom;
  }

  /** Sets the contents of the field we're editing when the user clicks on a suggestion. */
  function setValue(event) {
    builder.storage.set('save_required', true);
    value_input.value = this.innerHTML; // "this" being the suggestion link
    event.preventDefault();
  }

  /** (Re-)generates the list of unique username/email special values. */
  function updateChoice() {
    // The special values are numbered, so we need to figure out what the highest number used
    // in the script for both username and email values is.
    var steps = builder.getScript().steps;
    var limits = {
      username: 0,
      email: 0
    };
    for (var i = 0; i < steps.length; i++) {
      for (var j in { locator: 1, option: 1 }) {
        if (steps[i][j]) {
          // Uses a regexp to check on the step's locator and option fields to see if
          // they contain a ${unique_username_<number>} or ${unique_email_<number>}
          // value.
          // Deliberately don't match >9
          steps[i][j].replace(/\$\{unique_(username|email)_([0-9])\}/, function (a, type, index) {
            limits[type] = Math.max(limits[type], Number(index));
          });
        }
      }
    }

    jQuery('li', unique_variables).remove();
    
    // If the field doesn't already contain an "unique_x" value, make changing the field back
    // to what it was the first of the options on the list.
    if (!value_input.value.match(/^\$\{unique_(username|email)_([0-9])\}$/)) {
      unique_variables.appendChild(
        newNode(
          'li',
          newNode('a', value_input.value, { href: '#original', click: setValue })
        )
      );
    }

    // Now create suggestions for both usernames and emails, using all numbers up to the
    // highest used yet, plus one. For example, if there are steps in the script that use
    // ${unique_email_1} and ${unique_email_3}, suggest ${unique_email_1} through
    // ${unique_email_4}.
    for (var type in limits) {
      for (var i = 1; i < limits[type] + 2; i++) {
        var name = 'unique_' + type + '_' + i;
        unique_variables.appendChild(newNode(
          'li',
          newNode('a', '${' + name + '}', {
            href: '#' + name,
            click: setValue
          })
        ));
      }
    }
  }
  
  /** Stops event propagation to prevent a click *on* the method dialog from closing it. */  
  function preventHide(e) {
    e.stopPropagation();
  }

  return {
    /**
     * Create a values dialog and insert it after the given node.
     * @param step The step we're editing.
     * @param node The field we're editing.
     */
    show: function (step, field_node) {
      if (current_step) {
        builder.dialogs.values.hide();
      }
      value_input = field_node;
      current_step = step;
      if (field_node.nextSibling) {
        field_node.parentNode.insertBefore(getDom(), field_node.nextSibling);
      } else {
        field_node.parentNode.appendChild(getDom());
      }
      updateChoice();
      // Put in a listener to close the dialog if the user clicks anywhere but the dialog.
      setTimeout(function () {
        if (current_step) {
          jQuery(window).bind('click', builder.dialogs.values.hide);
          jQuery(value_input).bind('click', preventHide);
        }
      }, 0);
    },

    hide: function () {
      dom.parentNode.removeChild(dom);
      current_step = null;
      jQuery(window).unbind('click', builder.dialogs.values.hide);
      jQuery(value_input).unbind('click', preventHide);
    }
  };
})();