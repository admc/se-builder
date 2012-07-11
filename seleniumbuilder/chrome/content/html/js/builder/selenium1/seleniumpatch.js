/** Adding extra functionality to selenium. */
Selenium.prototype.doEcho = function(message) {
  builder.local.echo(message);
};

Selenium.prototype.doSetSpeed = function(speed) {
  builder.local.setSpeed(speed);
};

// Remember what the original members of the Selenium prototype are, so we can tell what the new
// ones are after loading user-extensions.js. This allows us to add them to builder.methods in
// extensions.js.
builder.selenium1.originalSelMembers = {};
for (var m in Selenium.prototype) {
  builder.selenium1.originalSelMembers[m] = true;
}
