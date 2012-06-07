/** After loading the code, runs all the post-load hooks, then switches to the startup view. */

builder.loaded = true;
for (var i = 0; i < builder.postLoadHooks.length; i++) {
  builder.postLoadHooks[i]();
}

builder.gui.switchView(builder.views.startup);