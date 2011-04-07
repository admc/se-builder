builder.rc = new (function () {
  var requestStop = false;
  var result;
  var username;
  var key;
  var payObj;
  var url;
  var req;
  var script;
  var currentStep;
  var callback;
  var session;
  var hostport;
  
  /**
   * Runs the current test.
   * @return Result object: {success:, errormessage:, url:}
   */
  this.runtest = function(a_hostport, browserstring, postRunCallback) {
    jQuery('#steps-top')[0].scrollIntoView(false);
    jQuery('#edit-editing').hide();
    jQuery('#edit-rc-playing').show();
    jQuery('#edit-rc-stopping').hide();
    requestStop = false;
    result = { success: false };
    callback = postRunCallback;
    currentStep = -1;
    hostport = a_hostport;
    
    script = builder.getScript();
    builder.clearResults();
    jQuery('#edit-clearresults').show();
    var msg = 'cmd=getNewBrowserSession&1=' + browserstring + '&2=' + this.enc(script.baseUrl) + '&3=null';
    this.post(msg, builder.rc.startJob, builder.rc.xhrfailed);
  };
  
  this.xhrfailed = function(xhr, textStatus, errorThrown) {
    var err = "Server connection error: " + textStatus;
    if (currentStep == -1) {
      // If we can't connect to the server right at the start, just attach the error message to the
      // first step.
      currentStep = 0;
    }
    jQuery("#" + script.steps[currentStep].uuid + '-content').css('background-color', '#ff3333');
    jQuery("#" + script.steps[currentStep].uuid + "error").html(err).show();
    result.success = false;
    result.errormessage = err;
    jQuery('#edit-editing').show();
    jQuery('#edit-rc-playing').hide();
    jQuery('#edit-rc-stopping').hide();
    
    if (callback) {
      callback(result);
    }
  },
  
  this.startJob = function(rcResponse) {
    session = rcResponse.substring(3);
    result.success = true;

    builder.rc.playNextStep(null);
  };
  
  this.playNextStep = function(returnVal) {
    var error = false;
    if (returnVal) {
      if (returnVal.substring(0, 2) == "OK") {
        if (returnVal.length > 3 && returnVal.substring(3) == "false") {
          jQuery("#" + script.steps[currentStep].uuid + '-content').css('background-color', '#ffcccc');
          result.success = false;
        } else {
          jQuery("#" + script.steps[currentStep].uuid + '-content').css('background-color', '#ccffcc');
        }
      } else {
        error = true;
        // Some error has occurred
        jQuery("#" + script.steps[currentStep].uuid + '-content').css('background-color', '#ff3333');
        jQuery("#" + script.steps[currentStep].uuid + "error").html(" " + returnVal).show();
        result.success = false;
        result.errormessage = returnVal;
      }
    }
    
    if (!error) {
      // Run next step?
      if (requestStop) {
        result.success = false;
        result.errormessage = "Test stopped";
      } else {
        currentStep++;
        // Echo is not supported server-side, so ignore it.
        while (currentStep < script.steps.length && script.steps[currentStep].method == "echo") {
          jQuery("#" + script.steps[currentStep].uuid + '-content').css('background-color', '#ccffcc');
          currentStep++;
        }
        if (currentStep < script.steps.length) {
          builder.rc.post(builder.rc.toCmdString(script.steps[currentStep]) + "&sessionId=" + session, builder.rc.playNextStep);
          return;
        }
      }
    }
    
    msg = "cmd=testComplete&sessionId=" + session;
    builder.rc.post(msg, function() {});
    jQuery('#edit-editing').show();
    jQuery('#edit-rc-playing').hide();
    jQuery('#edit-rc-stopping').hide();
    
    if (callback) {
      callback(result);
    }
  };
  
  this.stoptest = function() {
    requestStop = true;
    jQuery('#edit-rc-playing').hide();
    jQuery('#edit-rc-stopping').show();
  };

  this.post = function(msg, callback) {
    jQuery.ajax({
      type: "POST",
      url: "http://" + hostport + "/selenium-server/driver/",
      data: msg,
      success: callback,
      error: this.xhrfailed
    });
  };

  this.enc = function(str) {
    return encodeURIComponent(str)
          .replace(/%20/g, '+')
          .replace(/!/g, '%21')
          .replace(/'/g, '%27')
          .replace(/\(/g, '%28')
          .replace(/\)/g, '%29')
          .replace(/\*/g, '%2A');
  };

  /* Takes a step from a script and turns it into a string to be sent to RC. */
  this.toCmdString = function(step) {
    var str = "cmd=" + step.method;//this.enc(step.method.replace(/^verify/, 'is'));
    if (step.locator) {
      str = str + "&1=" + this.enc(step.locator);
    }
    if (step.option) {
      str = str + "&2=" + this.enc(step.option);
    }
    return str;
  };
})();
