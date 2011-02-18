/**
 * Dialog for editing a step parameter.
 */
builder.dialogs.editparam = new(function () {
  // The user interface components for the locator dialog
  var dom;
  // The dom node it replaced, for swapping back in on hide
  var replaced_node;
  // The step we are editing
  var current_step;
  // The gettersetter of the property we are editing.
  var current_property;
  // The input text field for the property we are editing
  var input_field;

  /** @return Creates and caches the GUI for the locator selection dialog. */
  function getDom() {
    if (dom) { return dom; }
    
    dom = newNode(
      'span', {class:jQuery(replaced_node).hasClass('b-param-row') ? 'b-param-row' : ''},
      input_field = newNode('input', {type: 'text', class:'b-param-input', value: current_property.html()}),
      newNode('a', 'OK', {
        class: 'ui-state-default ui-corner-all record-button',
        click: function () {
          builder.dialogs.editparam.hide();
        },
        href: '#save'
      })
    );
    
    return dom;
  }
  
  /** Stops event propagation to prevent a click *on* the param dialog from closing it. */  
  function prevent_hide(event) {
    event.stopPropagation();
  }

  return {
    /**
     * @param step The step to operate on
     * @param node the input field for the step's parameter we're editing
     * @param property the name of the property we're editing
     */
    show: function (step, node, property) {
      if (replaced_node) {
        this.hide();
      }
      builder.dialogs.method.hide(); // Shouldn't be necessary...
      current_step = step;
      current_property = property;
      replaced_node = node;
      jQuery(replaced_node).hide();
      var dom = getDom();
      replaced_node.parentNode.insertBefore(dom, replaced_node);
      jQuery(input_field).click(prevent_hide);
      setTimeout(function () {
        jQuery(window).bind('click', builder.dialogs.editparam.hide);
        jQuery(dom).bind('click', prevent_hide);
      }, 0);
    },
    hide: function () {
      if (replaced_node) {
        jQuery(replaced_node).show();
        if (current_property.html() != jQuery(input_field).val()) {
          builder.storage.set('save_required', true);
          current_property.html(jQuery(input_field).val());
        }
        dom.parentNode.removeChild(dom);
        replaced_node = null;
        dom = null;
      }
      jQuery(window).unbind('click', builder.dialogs.editparam.hide);
      jQuery(dom).unbind('click', prevent_hide);
      jQuery(input_field).unbind('click', prevent_hide);
      current_step._updateDisplay();
    }
  };
})();