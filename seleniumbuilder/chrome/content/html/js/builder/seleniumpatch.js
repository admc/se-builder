/** Adding extra functionality to selenium. */

Selenium.prototype.doEcho = function(message) {
  builder.local.echo(message);
}

Selenium.prototype.doSetSpeed = function(speed) {
  builder.local.setSpeed(speed);
}