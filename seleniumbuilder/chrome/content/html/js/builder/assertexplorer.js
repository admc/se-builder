/**
 * Converts runs of whitespace into single spaces and trims string to match behaviour of
 * XPath's normalize-space.
 */
builder.normalizeWhitespace = function(text) {
  return text.replace(/\s+/g, " ").replace(/^ /, "").replace(/ $/, "");
};

/**
 * Used for making assertions and choosing new locators. Called from dialogs/locator.js, in 
 * attachSearchers, to allow selection of new locator. Called from interface.js to record an
 * assertion.
 * 
 * Creating an AssertExplorer attaches listeners to all frames in the browser so that when the user
 * clicks on a DOM node/HTML element, the change_status function is called. To show the user which
 * node will be chosen if they click now the node is given a outline border.
 *
 * For historical reasons this returns the "assert*" flavour of methods at the moment, the consumer
 * simply replaces this by "verify".
 *
 * @param {Window} The frame to explore
 * @param {Function(locator, contents)} A function to be called when an element is hovered over
 * @param {Function(method, params)} A function to be called when an assertion has been created
 * @param {boolean} Whether the explorer is being used to chose a new locator
 */
builder.AssertExplorer = function (top_window, change_status, record_assertion, for_choosing_locator) {
  /** The DOM element the user is currently hovering over and that has been highlit. */
  var highlit_element;

  /**
   * Highlights the mousedover element, removes highlight from old element, and tells the
   * change_status function the locator and value (innerHTML / INPUT value) of the hovered 
   * element.
   */
  function handleMouseover(e) {
    var value = (e.target.tagName.toUpperCase() == "INPUT") ? e.target.value : e.target.innerHTML;
    var locator = builder.locator.create(e.target);
    // If there is a previous highlit element, remove its borders
    if (highlit_element) {
      resetBorder({
        target: highlit_element
      });
    }
    highlit_element = e.target;
    e.target.style.outline = '1px solid #003366';

    change_status(locator, value);
  }

  /**
   * Informs whatever is listening to record_assertion that an assertion has been made.
   * This will usually result in us being destroy()ed by whatever is listening.
   */
  function handleMouseup(e) {
    // Figures out what assertion to record for the element clicked on, or if
    // for_choosing_locator is set, just returns with a assertVisible assertion that (I guess)
    // can be used to set the new locator.
    e.cancelBubble = true;
    e.stopPropagation();
    e.preventDefault();

    window.focus();

    // Setup the params
    var params = builder.locator.create(e.target);

    // If we're only interested in the params (for locator choosing), just do this:
    if (for_choosing_locator) {
      record_assertion('assertVisible', params);
      return;
    }

    var tag = e.target.nodeName.toUpperCase();
    var selection = window.bridge.getRecordingWindow().getSelection();

    if (selection && selection.toString().replace(/^\s*/, '').replace(/\s*$/, '').length > 0) {
      record_assertion('assertTextPresent', {
        "pattern": builder.normalizeWhitespace(selection.toString())
      });
    }
    else if (tag == "SELECT") {
      params['equal to'] = e.target.value;
      record_assertion('assertSelectedValues', params);
    }
    else if (tag == "INPUT") {
      var type = e.target.getAttribute('type');
      if (type) { type = type.toLowerCase(); }
      // If the type is some weird thing or undefined, just set it to text.
      if (!({"text":1, "password":1, "file":1, "hidden":1, "checkbox":1, "radio":1}[type])) {
        type = "text";
      }

      if (["checkbox", "radio"].indexOf(type) > -1) {
        // NOTE: if this event is handled synchronously, firefox helpfully toggles the checked status
        // to what it would be after the click has finished if we hadn't called preventDefault above.
        // This means that it is impossible to tell whether a radio button is selected, because no-matter
        // what its current status, after clicking on it it becomes checked. By delaying this evaluation
        // until after the event handling has finished, we get access to the actual checked property.
        setTimeout(function () {
          if (e.target.checked) {
            record_assertion('assertChecked', params);
          } else {
            record_assertion('assertNotChecked', params);
          }
        }, 0);
      } else { // type = text, password, file, hidden, submit, button, reset, image
        params['equal to'] = e.target.value;
        record_assertion('assertValue', params);
      }
    }
    else if (tag == "TEXTAREA") {
      params['equal to'] = e.target.value;
      record_assertion('assertValue', params);
    }
    else if (e.target.textContent != "") {
      var text = e.target.textContent;
      if (text.length > 200) {
        var nextSpace = text.indexOf(' ', 200);
        if (nextSpace > -1 && nextSpace < 250) {
          text = text.substr(0, nextSpace);
        } else {
          nextSpace = text.substr(200).lastIndexOf(' ');
          if (nextSpace > 50) {
            text = text.substr(0, 50);
          } else {
            text = text.substr(0, 100);
          }
        }
      }
      record_assertion('assertTextPresent', {
        pattern: builder.normalizeWhitespace(text)
      });
    } else {
      record_assertion('assertVisible', params);
    }
  }

  /**
   * Prevent the default action from firing on the click event.
   * This needs to be explicit because we only catch the mouseup.
   */
  function absorbClick(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  /**
   * With Mousedown the default action is to allow text selection, so don't preventDefault.
   * This way, the user can select what part of the text on the page they wish to make an
   * assertion about.
   */
  function absorbMousedown(e) {
    e.stopPropagation();
  }

  /**
   * Remove the outline from any node that has been outlined.
   *
   * FIXME: If a page specifies an outline on the node, this process will remove it.
   * (CSS outline properties should be OK.)
   */
  function resetBorder(e) {
    if (highlit_element == e.target) { highlit_element = null; }
    e.target.style.outline = ''; // FIXME
  }

  /**
   * Attach the AssertExplorer to the given frame, listening for clicks and hovers.
   */
  function attach(frame, level) {
    jQuery(frame.document).
        bind('mouseover', {}, handleMouseover, true).
        bind('mouseout', {}, resetBorder, true).
        bind('mouseup', {}, handleMouseup, true).
        bind('mousedown', {}, absorbMousedown, true).
        bind('click', {}, absorbClick, true);
  }

  /**
   * Stop listening to the document.
   */
  function detach(frame, level) {
    jQuery(frame.document).
        unbind('mouseover', handleMouseover, true).
        unbind('mouseout', resetBorder, true).
        unbind('mouseup', handleMouseup, true).
        unbind('mousedown', absorbMousedown, true).
        unbind('click', absorbClick, true);
  }
  
  // Now call attach on all frames in the browser to allow the user to select a DOM node.
  builder.loadlistener.on_all_frames(top_window, attach, 0);

  return {
    destroy: function () {
      // We're done: clean up any border currently active.
      if (highlit_element) { resetBorder({ target: highlit_element }); }
      builder.loadlistener.on_all_frames(top_window, detach, 0);
    }
  };
};