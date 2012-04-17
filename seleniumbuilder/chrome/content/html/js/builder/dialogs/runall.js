/**
 * Dialog that runs all scripts in the suite and keeps track of scripts being run.
 */
builder.dialogs.runall = {};
builder.dialogs.runall.node = null;
builder.dialogs.runall.dialog = null;
builder.dialogs.runall.hostPort = null;
builder.dialogs.runall.browserString = null;

builder.dialogs.runall.currentScriptIndex = -1;
builder.dialogs.runall.scriptNames = [];

builder.dialogs.runall.info_p = null;
builder.dialogs.runall.scriptlist = null;
builder.dialogs.runall.close_b = null;

builder.dialogs.runall.rc = false;
builder.dialogs.runall.requestStop = false;
builder.dialogs.runall.currentPlayback = null;

builder.dialogs.runall.runRC = function(node, hostPort, browserString) {
  builder.dialogs.runall.node = node;
  builder.dialogs.runall.hostPort = hostPort;
  builder.dialogs.runall.browserString = browserString;
  builder.dialogs.runall.rc = true;
  builder.dialogs.runall.run();
};

builder.dialogs.runall.runLocally = function(node) {
  builder.dialogs.runall.node = node;
  builder.dialogs.runall.rc = false;
  builder.dialogs.runall.run();
};

builder.dialogs.runall.run = function() {
  jQuery('#edit-suite-editing').hide();
  jQuery('#edit-suite-stopping').hide();
  jQuery('#edit-suite-playing').show();
  builder.dialogs.runall.requestStop = false;
  
  builder.dialogs.runall.scriptNames = builder.suite.getScriptNames();
  
  builder.dialogs.runall.info_p = newNode('p', {id:'infop'}, "Running scripts...");
  
  // Display the scripts in a similar fashion to the steps are shown in the record interface.
  builder.dialogs.runall.scriptlist = newFragment();
  
  for (var i = 0; i < builder.dialogs.runall.scriptNames.length; i++) {
    var name = builder.dialogs.runall.scriptNames[i];
    var sid = 'script-num-' + i;

    builder.dialogs.runall.scriptlist.appendChild(
      newNode('div', {id: sid, class: 'b-suite-playback-script'},
        newNode('div',
          newNode('span', {}, name),
          newNode('a', {class:"step-view", id:sid + "-view", style:"display: none", click: function(e) {
            window.bridge.getRecordingWindow().location = this.href;
            // We don't actually want the SB window to navigate to the script's page!
            e.preventDefault();
          }}, 'View Result')
        ),
        newNode('div', {class:"step-error", id:sid + "-error", style:"display: none"})
      )
    );
  }
  
  builder.dialogs.runall.close_b = newNode('a', 'Close', {
    class: 'button',
    style: 'display: none',
    click: function () {
      jQuery(builder.dialogs.runall.dialog).remove();
    },
    href: '#close'
  });
  
  builder.dialogs.runall.dialog = newNode('div', {class: 'dialog'});
  jQuery(builder.dialogs.runall.dialog)
    .append(builder.dialogs.runall.info_p)
    .append(builder.dialogs.runall.scriptlist)
    .append(newNode('p', builder.dialogs.runall.close_b));
    
  jQuery(builder.dialogs.runall.node).append(builder.dialogs.runall.dialog);
  
  builder.dialogs.runall.currentScriptIndex = -1; // Will get incremented to 0 in runNextRC/Local.
  if (builder.dialogs.runall.rc) {
    builder.dialogs.runall.runNextRC();
  } else {
    builder.dialogs.runall.runNextLocal();
  }
};

builder.dialogs.runall.stoprun = function() {
  builder.dialogs.runall.requestStop = true;
  jQuery('#edit-suite-playing').hide();
  jQuery('#edit-suite-stopping').show();
  try {
    builder.dialogs.runall.currentPlayback.stopTest();
  } catch (e) {
    // In case we haven't actually started or have already finished, we don't really care if this
    // goes wrong.
  }
};

builder.dialogs.runall.processResult = function(result) {
  if (result.url) {
    jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex + "-view").attr('href', result.url).show();
  }
  if (result.success) {
    jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex).css('background-color', '#bfee85');
  } else {
    if (result.errormessage) {
      jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex).css('background-color', '#ff3333');
      jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex + "-error").html(" " + result.errormessage).show();
    } else {
      jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex).css('background-color', '#ffcccc');
    }
  }
};

builder.dialogs.runall.hide = function () {
  jQuery(builder.dialogs.runall.dialog).remove();
};

// RC
builder.dialogs.runall.runNextRC = function() {
  builder.dialogs.runall.currentScriptIndex++;
  if (builder.dialogs.runall.currentScriptIndex < builder.dialogs.runall.scriptNames.length &&
      !builder.dialogs.runall.requestStop)
  {
    jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex).css('background-color', '#ffffaa');
    builder.suite.switchToScript(builder.dialogs.runall.currentScriptIndex);
    builder.dialogs.runall.currentPlayback = builder.getScript().seleniumVersion.rcPlayback;
    builder.dialogs.runall.currentPlayback.run(
      builder.dialogs.runall.hostPort,
      builder.dialogs.runall.browserString,
      builder.dialogs.runall.processRCResult);
  } else {
    jQuery(builder.dialogs.runall.close_b).show();
    jQuery(builder.dialogs.runall.info_p).html("Done!");
    jQuery('#edit-suite-editing').show();
    jQuery('#edit-suite-stopping').hide();
    jQuery('#edit-suite-playing').hide();
  }
};

builder.dialogs.runall.processRCResult = function(result) {
  builder.dialogs.runall.processResult(result);
  builder.dialogs.runall.runNextRC();
};

// Local
builder.dialogs.runall.runNextLocal = function() {
  builder.dialogs.runall.currentScriptIndex++;
  if (builder.dialogs.runall.currentScriptIndex < builder.dialogs.runall.scriptNames.length &&
      !builder.dialogs.runall.requestStop)
  {
    jQuery("#script-num-" + builder.dialogs.runall.currentScriptIndex).css('background-color', '#ffffaa');
    builder.suite.switchToScript(builder.dialogs.runall.currentScriptIndex);
    builder.dialogs.runall.currentPlayback = builder.getScript().seleniumVersion.playback;
    builder.dialogs.runall.currentPlayback.runTest(builder.dialogs.runall.processLocalResult);
  } else {
    jQuery(builder.dialogs.runall.close_b).show();
    jQuery(builder.dialogs.runall.info_p).html("Done!");
    jQuery('#edit-suite-editing').show();
    jQuery('#edit-suite-stopping').hide();
    jQuery('#edit-suite-playing').hide();
  }
};

builder.dialogs.runall.processLocalResult = function(result) {
  builder.dialogs.runall.processResult(result);
  builder.dialogs.runall.runNextLocal();
};