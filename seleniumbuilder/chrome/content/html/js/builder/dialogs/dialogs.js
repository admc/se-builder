// Set up dialogs namespace.
builder.dialogs = {};

builder.dialogs.show = function(dialogNode) {
  jQuery("#dialog-attachment-point").append(dialogNode);
};