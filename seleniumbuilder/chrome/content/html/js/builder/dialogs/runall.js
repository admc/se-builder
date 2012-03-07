/**
 * Dialog that runs all scripts in the suite and keeps track of scripts being run.
 */
builder.dialogs.runall = new(function () {
  /** The DOM node into which to insert the dialog, replacing its contents. */
  var node;
  var hostPort;
  var browserString;
  
  var currentScriptIndex = -1;
  var scriptNames;
  
  var info_p;
  var scriptlist;
  var close_b;
  
  var rc;
  
  var requestStop = false;
  
  /**
   * Run all scripts in the suite on RC.
   */
  this.runRC = function(anode, theHostPort, theBrowserString) {
    node = anode;
    hostPort = theHostPort;
    browserString = theBrowserString;
    os = theos;
    rc = true;
    builder.dialogs.runall.run();
  };
  
  this.runLocally = function(anode) {
    node = anode;
    rc = false;
    builder.dialogs.runall.run();
  }
    
  this.run = function() {
    jQuery('#edit-suite-editing').hide();
    jQuery('#edit-suite-stopping').hide();
    jQuery('#edit-suite-playing').show();
    requestStop = false;
    node.html('');
    //builder.interface.suite.hideButtons();
    
    scriptNames = builder.suite.getScriptNames();
    
    info_p = newNode('p', {id:'infop'}, "Running scripts...");
    
    // Display the scripts in a similar fashion to the steps are shown in the record interface.
    scriptlist = newFragment();
    
    for (var i = 0; i < scriptNames.length; i++) {
      var name = scriptNames[i];
      var sid = 'script-num-' + i;

      scriptlist.appendChild(
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
    
    close_b = newNode('a', 'Close', {
      class: 'button',
      style: 'display: none',
      click: function () {
        builder.dialogs.runall.hide();
      },
      href: '#close'
    });
    
    node
      .append(info_p)
      .append(scriptlist)
      .append(newNode('p', close_b));
    
    if (rc) {
      currentScriptIndex = -1;
      this.runNextRC();
    } else {
      currentScriptIndex = -1; // Will get incremented to 0 in runNextLocal.
      this.runNextLocal();
    }
  };
  
  this.stoprun = function() {
    requestStop = true;
    jQuery('#edit-suite-playing').hide();
    jQuery('#edit-suite-stopping').show();
    try {
      if (rc) {
        builder.rc.stoptest();
      } else {
        builder.local.stoptest();
      }
    } catch (e) {
      // In case we haven't actually started or have already finished, we don't really care if this
      // goes wrong.
    }
  };
  
  this.processRCResult = function(result) {
    builder.dialogs.runall.processResult(result);
    builder.dialogs.runall.runNextRC();
  };
  
  this.runNextRC = function() {
    currentScriptIndex++;
    if (currentScriptIndex < scriptNames.length && !requestStop) {
      jQuery("#script-num-" + currentScriptIndex).css('background-color', '#ffffaa');
      builder.suite.switchToScript(currentScriptIndex);
      builder.rc.runtest(hostPort, browserString, builder.dialogs.runall.processRCResult);
    } else {
      jQuery(close_b).show();
      jQuery(info_p).html("Done!");
      //builder.interface.suite.showButtons();
      jQuery('#edit-suite-editing').show();
      jQuery('#edit-suite-stopping').hide();
      jQuery('#edit-suite-playing').hide();
    }
  };
  
  this.processLocalResult = function(result) {
    builder.dialogs.runall.processResult(result);
    builder.dialogs.runall.runNextLocal();
  };
  
  this.runNextLocal = function() {
    currentScriptIndex++;
    if (currentScriptIndex < scriptNames.length && !requestStop) {
      jQuery("#script-num-" + currentScriptIndex).css('background-color', '#ffffaa');
      builder.suite.switchToScript(currentScriptIndex);
      if (builder.getScript().seleniumVersion == builder.selenium2) {
        builder.sel2.playback.runTest(builder.dialogs.runall.processLocalResult);
      } else {
        builder.local.runtest(builder.dialogs.runall.processLocalResult);
      }
    } else {
      jQuery(close_b).show();
      jQuery(info_p).html("Done!");
      //builder.interface.suite.showButtons();
      jQuery('#edit-suite-editing').show();
      jQuery('#edit-suite-stopping').hide();
      jQuery('#edit-suite-playing').hide();
    }
  };
  
  this.processResult = function(result) {
    if (result.url) {
      jQuery("#script-num-" + currentScriptIndex + "-view").attr('href', result.url).show();
    }
    if (result.success) {
      jQuery("#script-num-" + currentScriptIndex).css('background-color', '#ccffcc');
    } else {
      if (result.errormessage) {
        jQuery("#script-num-" + currentScriptIndex).css('background-color', '#ff3333');
        jQuery("#script-num-" + currentScriptIndex + "-error").html(" " + result.errormessage).show();
      } else {
        jQuery("#script-num-" + currentScriptIndex).css('background-color', '#ffcccc');
      }
    }
  };
  
  this.hide = function () {
    node.html('');
  };
})();
