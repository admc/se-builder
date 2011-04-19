/**
 * Dialog for selecting a new locator for a method parameter (Note that the parameters are called
 * "locator" and "option", but both of them can be locators.
 * Consists of a button to find a locator within the open frames in the browser, and a list of
 * suggested locators to click on.
 */
builder.dialogs.locator = new(function () {
  // The user interface components for the locator dialog
  var dom;
  // The dom node it replaced, for swapping back in on hide
  var replaced_node;
  // The step we are editing
  var current_step;
  // The node we are editing
  var current_property;
  // The name of the step's property we are editing
  var current_property_name;
  // The alt name of that property 
  var alt_property;
  // The input text field for the property we are editing
  var locator_input;
  // An ul of suggested alternate locators
  var locator_suggestions;
  // The map of alts currently available, mapping locator types to values
  var current_alts;
  // The locator before we started editing, only used to check if we changed anything
  var original_locator;

  // Whether there are currently AssertExplorers attached to the tabs.
  var hasSearchers = false;
  // The AssertExplorers attached to the tabs.
  var searchers = [];
  // Interval to look for new frames that need AssertExplorers.
  var searcherInterval;

  /**
   * Adds/removes AssertExplorers to/from all frames.
   */
  function toggle_searcher() {
    if (hasSearchers) {
      jQuery(dom).find('.is-on').removeClass('is-on');
      if (searcherInterval) {
        clearInterval(searcherInterval);
      }
      for (var i = 0; i < searchers.length; i++) {
        searchers[i].destroy();
      }
      searchers = [];
      hasSearchers = false;
    } else {
      jQuery(this).addClass('is-on')
      builder.interface.record.pause();
      hasSearchers = true;
      attachSearchers(true);
      // Keep on looking for new frames with no attached searchers.
      searcherInterval = setInterval(attachSearchers, 500, true);
      window.bridge.focusContent();
    }
  }

  /**
   * Attach an AssertExplorer to each frame in Firefox to allow the user to select a new locator.
   * The code also attaches a boolean to the frames to prevent attaching multiple searchers, but
   * since this can't be easily cleared when searching is complete, it can be overridden with the
   * force parameter.
   */
  function attachSearchers(force) {
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
          searchers.push(new builder.AssertExplorer(
            frame,
            function() {},
            // This function is called when the user selects a new element.
            function(method, params) {
              builder.storage.set('save_required', true);
              // Since we don't know where the new locator will take us, set the URLs
              // of subsequent steps to [unknown] and erase any warnings.
              builder.clearURLsFrom(current_step.id);
              var call = new SeleniumFunction(method).extract_call(params);
              locator_input.value = call[current_property_name];
              current_alts = call[alt_property];
              update_suggested();
              toggle_searcher();
              window.bridge.focusWindow();
              setTimeout(function () { builder.interface.record.resume() }, 0);
            },
            /*for_choosing_locator*/ true)
          );
        }
      }
    }
  }

  /** @return Creates and caches the GUI for the locator selection dialog. */
  function getDom() {
    //if (dom) { return dom; }

    dom = newNode(
      'span',
      {
        class: 'b-param-row locator-dialog',
        style: 'margin-top: 5px;',
        click: function (e) {
          e.stopPropagation();
        },
        mousedown: function (e) {
          e.stopPropagation();
        }
      },
      locator_input = newNode('input', {type: 'text', class:'b-param-input', value: current_property.html()}),
      newNode('a', 'OK', {
        class: 'ui-state-default ui-corner-all record-button',
        click: function () {
          builder.dialogs.locator.hide();
        },
        href: '#save'
      }),
      newNode('div', {class:'b-alt-locators'},
        newNode('a', {
          href: '#find',
          name: '#find',
          click: toggle_searcher,
          class: 'b-find-new-locator' },
          newNode('span', { class: 'when-off' }, "Find a different target"),
          newNode('span', { class: 'when-on' }, "Cancel finding")
        ),
        locator_suggestions = newNode(
          'ul',
          newNode('p', newNode('b', 'Suggested locators'))
        ),
        newNode('p', { class: 'warning' }, "Complex locators can be \"fragile\" causing unnecessary errors if your page layout changes. See ", newNode('a', { href: 'http://release.seleniumhq.org/selenium-core/1.0/reference.html', target: "_blank" }, "help on choosing good locators"))
      )
    );
    
    return dom;
  }

  /** Called when clicking on suggested alt locator, set the locator value to that alt. */
  function use_suggestion() {
    locator_input.value = this.textContent;
    builder.storage.set('save_required', true);
    return false;
  }

  /** Refreshes ul list of suggested alt locators. */
  function update_suggested() {
    var props = current_alts;
    var show = false;

    jQuery(locator_suggestions).find('li').remove();

    for (var type in props) {
      if (type != "_default" && type != 'implicit') {
        locator_suggestions.appendChild(
          newNode(
            'li',
            newNode(
              'a',
              type + '=' + props[type],
              {
                href: '#' + type,
                name: '#' + type,
                click: use_suggestion
              }
            )
          )
        );
        show = true;
      }
    }

    if (show) {
      jQuery(locator_suggestions).show();
    } else {
      jQuery(locator_suggestions).hide();
    }
  }
  
  /** Stops event propagation to prevent a click *on* the locator dialog from closing it. */  
  function prevent_hide(event) {
    event.stopPropagation();
  }

  return {
    /**
     * @param step The step to operate on
     * @param node the input field for the step's parameter we're editing
     * @param property the field we're editing
     */
    show: function (step, node, property, property_name) {
      if (replaced_node) {
        this.hide();
      }
      builder.dialogs.method.hide(); // Shouldn't be necessary...
      replaced_node = node;
      current_step = step;
      current_property = property;
      current_property_name = property_name;
      alt_property = 'alt' + property_name.substr(0, 1).toUpperCase() + property_name.substr(1);
      jQuery(replaced_node).hide();
      replaced_node.parentNode.insertBefore(getDom(), replaced_node);
      jQuery(locator_input).click(prevent_hide);
      original_locator = step[property_name]();
      current_alts = step[alt_property]();
      update_suggested();
      setTimeout(function () {
        jQuery(window).bind('click', builder.dialogs.locator.hide);
        jQuery(dom).bind('click', prevent_hide);
      }, 0);
    },
    hide: function () {
      if (replaced_node) {
        jQuery(replaced_node).show();
        dom.parentNode.removeChild(dom);
        replaced_node = null;
      }
      if (current_step) {
        if (current_step[current_property_name]() != jQuery(locator_input).val()) {
          builder.storage.set('save_required', true);
          current_step[current_property_name](jQuery(locator_input).val());
          current_step[alt_property](current_alts);
        }
        current_step = null;
      }
      jQuery(window).unbind('click', builder.dialogs.locator.hide);
      jQuery(dom).unbind('click', prevent_hide);
      jQuery(locator_input).unbind('click', prevent_hide);
      
      try { current_step._updateDisplay(); }
      catch(err){}
    }
  };
})();