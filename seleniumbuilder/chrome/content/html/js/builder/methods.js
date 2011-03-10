// Remember what the original members of the Selenium prototype are, so we can tell what the new
// ones are after loading user-extensions.js. This allows us to add them to builder.methods in
// extensions.js.
builder.originalSelMembers = {};
for (m in Selenium.prototype) {
  builder.originalSelMembers[m] = true;
}


/**
 * A structured registry of most Selenium commands.
 * There are some commands in here that the main registry doesn't know about (server-control ones).
 * There are many more that this doesn't know about, but the main registry does (i.e. the ones that
 * only make sense in server-side scripts and the really bizarre ones (waitForPageToLoadAndWait??)
 *
 * The structure is as follows:
 * [
 *  {
 *   name: String,  (the top level tabs 'action', 'assertion' etc)
 *   modifiers: {     (functions to auto-generate more commands from the ones in the categories)
 *    before: Modifier, (the modifier to put above the select boxes)
 *    after: Modifier   (the modifier to put below the select boxes)
 *   }
 *   categories: {  (the contents of the select boxes)
 *    name: String, (the name of the category, in the left select box)
 *    contents: [   (the contents of the right select box)
 *     String
 *    ]
 *   }
 *  }
 * ]
 *
 * A modifier is:
 * {
 *  text: String (or Array[String, String]),  (the user-interface text, if an array two options are used, otherwise one checkbox)
 *  when_off: String Function(String),        (.active() is set to this if the checkbox is not ticked)
 *  when_on: String Function(String)          (.active() is set to this if the checkbox is ticked)
 * }
 */
builder.methods = [
  {
    name: 'action',
    modifiers: {
      before: {
        text: "Wait for a new page to load after executing this action",
        when_off: function (name) { return name; },
        when_on: function (name) { return name + 'AndWait'; },
        name: 'wait'
      }
    },
    categories: [
      {
        name: 'clicks',
        contents: [
          'click',
          'clickAt',
          'doubleClick',
          'doubleClickAt',
          'dragAndDrop',
          'dragAndDropToObject'
        ]
      },
      {
        name: 'mouse events',
        contents: [
          'mouseDown',
          'mouseDownAt',
          'mouseDownRight',
          'mouseDownRightAt',
          'mouseMove',
          'mouseMoveAt',
          'mouseOut',
          'mouseOver',
          'mouseUp',
          'mouseUpAt',
          'mouseUpRight',
          'mouseUpRightAt'
        ]
      },
      {
        name: 'keyboard events',
        contents: [
          'keyDown',
          'keyDownNative',
          'keyPress',
          'keyPressNative',
          'keyUp',
          'keyUpNative',
          'type', 
          'typeKeys'
        ]
      },
      {
        name: 'keyboard modifiers',
        contents: [
          'altKeyDown',
          'altKeyUp',
          'controlKeyDown',
          'controlKeyUp',
          'metaKeyDown',
          'metaKeyUp',
          'shiftKeyDown',
          'shiftKeyUp'
        ]
      },
      {
        name: 'form fields',
        contents: [
          'addSelection',
//          'attachFile',
          'check',
          'focus',
          'removeAllSelections',
          'removeSelection',
          'select',
          'setCursorPosition',
          'submit',
          'uncheck'
        ]
      },
      {
        name: 'browsing',
        contents: [
          'close',
          'goBack',
          'open',
          'openWindow',
          'refresh',
          'selectFrame',
          'selectWindow',
          'windowFocus',
          'windowMaximize'
        ]
      },
      {
        name: 'popups and menus',
        contents: [
          'answerOnNextPrompt',
          'chooseCancelOnNextConfirmation',
          'chooseOkOnNextConfirmation',
          'contextMenu',
          'contextMenuAt'
        ]
      }
    ]
  },
  {
    name: 'assertion',
    modifiers: {
      before: {
        text: newFragment('assert that something is ', newNode('b', 'not'), ' true'),
        when_off: function (name) {
          return name;
        },
        when_on: function (name) {
          if ((/Present/).test(name)) {
            return name.replace('Present', 'NotPresent');
          } else {
            return name.replace(/^(is|get|verify|assert)/, "$1Not");
          }
        },
        name: 'false'
      },
      after: {
        text: ['assert (fail immediately if the condition is not true)',
          'verify (continue and fail at the end of the script)'],
        when_off: function (name) {
          return name.replace(/^(is|get)/, 'assert');
        },
        when_on: function (name) {
          return name.replace(/^(is|get)/, 'verify');
        },
        name: 'verify'
      }
    },
    categories: [
      {
        name: 'page content',
        contents: [
          'getAllLinks',
          'getAttribute',
          'getBodyText',
          'isElementPresent',
          'getHtmlSource',
          'isOrdered',
          'getTable',
          'getText',
          'isTextPresent',
          'isVisible'
        ]
      },
      {
        name: 'page positioning',
        contents: [
          'getElementHeight',
          'getElementIndex',
          'getElementPositionLeft',
          'getElementPositionTop',
          'getElementWidth'
        ]
      },
      {
        name: 'popups',
        contents: [
          'isAlertPresent',
          'isConfirmationPresent',
          'isPromptPresent',
          'getPrompt',
          'getConfirmation',
          'getAlert'
        ]
      },
      {
        name: 'browser window',
        contents: [
          'getAllWindowIds',
          'getAllWindowNames',
          'getAllWindowTitles',
          'getAttributeFromAllWindows',
          'getLocation',
          'getTitle'
  //           'getWhetherThisFrameMatchFrameExpression',
 //           'getWhetherThisWindowMatchWindowExpression'
        ]
      },
      {
        name: 'form fields',
        contents: [
          'getAllButtons',
          'getAllFields',
          'isChecked',
          'getCursorPosition',
          'isEditable',
          'getSelectOptions',
         //   'getSelectedId', the singular versions act exactly like the plural ones when only one item is selected
          'getSelectedIds',
         //   'getSelectedIndex', so I have disabled them so that this list fits into 12
          'getSelectedIndexes',
         //   'getSelectedLabel',
          'getSelectedLabels',
         //   'getSelectedValue',
          'getSelectedValues',
          'isSomethingSelected',
          'getValue'
        ]
      },
      {
        name: 'selenium',
        contents: [
          'getExpression',
          'getEval',
          'getMouseSpeed',
          'getSpeed',
          'getXpathCount'
        ]
      },
      {
        name: 'cookies',
        contents: [
          'getCookie',
          'getCookieByName',
          'isCookiePresent'
        ]
      }
    ]
  },
  {
    name: 'wait for condition',
    modifiers: {
      before: {
        text: newNode('span', 'wait for the condition to ', newNode('b', 'stop'), ' being true.'),
        when_off: function (name) {
          return name.replace(/^(is|get)/, 'waitFor');
        },
        when_on: function (name) {
          return (/Present/.test(name) ? name.replace("Present", "NotPresent").replace(/^(is|get)/, "waitFor") : name.replace(/^(is|get)/, 'waitForNot'));
        },
        name: 'false'
      }
    },
    categories: [
      {
        //These don't negate themselves!
        name: 'common',
        contents: [
          'waitForCondition',
          'waitForFrameToLoad',
          'waitForPageToLoad',
          'waitForPopUp'
        ]
        // The contents of the assert category is added here
      }
    ]
  },
  {
    // Selenium allows most of these to take "AndWait", but it's utterly pointless
    name: 'other',
    categories: [
      {
        name: 'selenium settings',
        contents: [
          'addLocationStrategy',
          'allowNativeXpath',
          'ignoreAttributesWithoutValue',
          'setBrowserLogLevel',
          'setContext',
          'setMouseSpeed',
          'setSpeed',
          'setTimeout',
          'useXpathLibrary'
        ]
      },
      {
        name: 'screenshots',
        contents: [
          'captureEntirePageScreenshot',
          'captureScreenshot',
          'captureScreenshotToString'
        ]
      },
      {
        name: 'cookies',
        contents: [
          'createCookie',
          'deleteCookie',
          'deleteAllVisibleCookies'
        ]
      },
      {
        name: 'special',
        contents: [
          'addScript',
          'assignId',
          'fireEvent',
          'highlight',
          'rollup',
          'runScript',
          'echo'
//          'shutDownSeleniumServer',
        ]
      }
    ]
  },
  {
    name: 'store',
    categories: [
      // All added in the code below by deriving from assert's categories.
    ]
  }
];

// Wait-for has the same categories as assert.
builder.methods[2].categories = builder.methods[2].categories.concat(builder.methods[1].categories);

// Store has the same categories as assert but with different names. Whereas wait-for and assert
// have varying prefixes and hence use modifiers to change them, the prefix here is consistently
// "store".
for (var i = 0; i < builder.methods[1].categories.length; i++) {
  var cat = builder.methods[1].categories[i];
  var newCat = { name: cat.name, contents: [] };
  for (var j = 0; j < cat.contents.length; j++) {
    newCat.contents.push(cat.contents[j].replace(/^(is|get)/, "store"));
  }
  builder.methods[4].categories.push(newCat); // Meow
}