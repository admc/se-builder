// These are example user extensions:

// The "inDocument" is a the document you are searching.
PageBot.prototype.locateElementByValueRepeated = function(text, inDocument) {
    // Create the text to search for
    var expectedValue = text + text;

    // Loop through all elements, looking for ones that have
    // a value === our expected value
    var allElements = inDocument.getElementsByTagName("*");
    for (var i = 0; i < allElements.length; i++) {
        var testElement = allElements[i];
        if (testElement.value && testElement.value === expectedValue) {
            return testElement;
        }
    }
    return null;
};

// Taken from http://wiki.openqa.org/display/SEL/Contributed+User-Extensions
// In the public domain, created by user chillatgvc
Selenium.prototype.getTableRows = function(locator) {
  /**
   * Gets the number of rows in a table.
   *
   * @param locator element locator for table
   * @return number of rows in the table, 0 if none
   */

    var table = this.browserbot.findElement(locator);
    return table.rows.length.toString();
};

