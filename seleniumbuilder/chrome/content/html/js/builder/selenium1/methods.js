builder.selenium1.__methodRegistry = [
  {
    name: 'action',
    variants: [
      function(n) { return n; },
      function(n) { return n + 'andWait'; }
    ],
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
    variants: [
      function(n) { return n.replace(/^(is|get)/, 'assert'); },
      function(n) { return n.replace(/^(is|get)/, 'verify'); }
    ],
    negator: function(n) {
      if ((/Present/).test(n)) {
        return n.replace('Present', 'NotPresent');
      } else {
        return n.replace(/^(is|get|verify|assert)/, "$1Not");
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
          'getSelectedIds',
          'getSelectedIndexes',
          'getSelectedLabels',
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
    negator: function(n) {
      return (/Present/.test(n) ? n.replace("Present", "NotPresent").replace(/^(is|get)/, "waitFor") : n.replace(/^(is|get)/, 'waitForNot'));
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
builder.selenium1.__methodRegistry[2].categories = builder.selenium1.__methodRegistry[2].categories.concat(builder.selenium1.__methodRegistry[1].categories);

// Store has the same categories as assert but with different names. Whereas wait-for and assert
// have varying prefixes and hence use modifiers to change them, the prefix here is consistently
// "store".
for (var i = 0; i < builder.selenium1.__methodRegistry[1].categories.length; i++) {
  var cat = builder.selenium1.__methodRegistry[1].categories[i];
  var newCat = { name: cat.name, contents: [] };
  for (var j = 0; j < cat.contents.length; j++) {
    newCat.contents.push(cat.contents[j].replace(/^(is|get)/, "store"));
  }
  builder.selenium1.__methodRegistry[4].categories.push(newCat); // Meow
}
