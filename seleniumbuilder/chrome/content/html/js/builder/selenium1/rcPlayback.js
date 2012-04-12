builder.selenium1.rcPlayback = {};

builder.selenium1.rcPlayback.requestStop = false;
builder.selenium1.rcPlayback.result = false;
builder.selenium1.rcPlayback.username = false;
builder.selenium1.rcPlayback.key = false;
builder.selenium1.rcPlayback.payObj = false;
builder.selenium1.rcPlayback.url = false;
builder.selenium1.rcPlayback.req = false;
builder.selenium1.rcPlayback.script = false;
builder.selenium1.rcPlayback.currentStep = false;
builder.selenium1.rcPlayback.callback = false;
builder.selenium1.rcPlayback.session = false;
builder.selenium1.rcPlayback.hostport = false;

builder.selenium1.rcPlayback.run = function(hostport, browserstring, postRunCallback) {
  jQuery('#steps-top')[0].scrollIntoView(false);
  jQuery('#edit-editing').hide();
  jQuery('#edit-rc-playing').show();
  jQuery('#edit-rc-stopping').hide();
  builder.selenium1.rcPlayback.requestStop = false;
  builder.selenium1.rcPlayback.result = { success: false };
  builder.selenium1.rcPlayback.callback = postRunCallback;
  builder.selenium1.rcPlayback.currentStep = -1;
  builder.selenium1.rcPlayback.hostport = hostport;
  dump(hostport);
  dump(browserstring);
  builder.selenium1.rcPlayback.script = builder.getScript();
  builder.views.script.clearResults();
  var baseURL = builder.selenium1.rcPlayback.script.steps[0].url; // qqDPS BRITTLE!
  jQuery('#edit-clearresults').show();
  var msg = 'cmd=getNewBrowserSession&1=' + browserstring + '&2=' + builder.selenium1.rcPlayback.enc(baseURL) + '&3=null';
  builder.selenium1.rcPlayback.post(msg, builder.selenium1.rcPlayback.startJob, builder.selenium1.rcPlayback.xhrfailed);
  dump(msg);
};

builder.selenium1.rcPlayback.xhrfailed = function(xhr, textStatus, errorThrown) {
  var err = "Server connection error: " + textStatus;
  if (builder.selenium1.rcPlayback.currentStep == -1) {
    // If we can't connect to the server right at the start, just attach the error message to the
    // first step.
    builder.selenium1.rcPlayback.currentStep = 0;
  }
  jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + '-content').css('background-color', '#ff3333');
  jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + "-error").html(err).show();
  builder.selenium1.rcPlayback.result.success = false;
  builder.selenium1.rcPlayback.result.errormessage = err;
  jQuery('#edit-editing').show();
  jQuery('#edit-rc-playing').hide();
  jQuery('#edit-rc-stopping').hide();
  
  if (builder.selenium1.rcPlayback.callback) {
    builder.selenium1.rcPlayback.callback(builder.selenium1.rcPlayback.result);
  }
};

builder.selenium1.rcPlayback.startJob = function(rcResponse) {
  builder.selenium1.rcPlayback.session = rcResponse.substring(3);
  builder.selenium1.rcPlayback.result.success = true;

  builder.selenium1.rcPlayback.playNextStep(null);
};

builder.selenium1.rcPlayback.playNextStep = function(returnVal) {
  var error = false;
  if (returnVal) {
    if (returnVal.substring(0, 2) == "OK") {
      if (returnVal.length > 3 && returnVal.substring(3) == "false") {
        jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + '-content').css('background-color', '#ffcccc');
        builder.selenium1.rcPlayback.result.success = false;
      } else {
        jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + '-content').css('background-color', '#ccffcc');
      }
    } else {
      builder.selenium1.rcPlayback.error = true;
      // Some error has occurred
      jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + '-content').css('background-color', '#ff3333');
      jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + "error").html(" " + returnVal).show();
      builder.selenium1.rcPlayback.result.success = false;
      builder.selenium1.rcPlayback.result.errormessage = returnVal;
    }
  }
  
  if (!error) {
    // Run next step?
    if (builder.selenium1.rcPlayback.requestStop) {
      builder.selenium1.rcPlayback.result.success = false;
      builder.selenium1.rcPlayback.result.errormessage = "Test stopped";
    } else {
      builder.selenium1.rcPlayback.currentStep++;
      // Echo is not supported server-side, so ignore it.
      while (builder.selenium1.rcPlayback.currentStep < builder.selenium1.rcPlayback.script.steps.length && builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].type == builder.selenium1.stepTypes.echo) {
        jQuery("#" + builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep].id + '-content').css('background-color', '#ccffcc');
        builder.selenium1.rcPlayback.currentStep++;
      }
      if (builder.selenium1.rcPlayback.currentStep < builder.selenium1.rcPlayback.script.steps.length) {
        builder.selenium1.rcPlayback.post(builder.selenium1.rcPlayback.toCmdString(builder.selenium1.rcPlayback.script.steps[builder.selenium1.rcPlayback.currentStep]) + "&sessionId=" + builder.selenium1.rcPlayback.session, builder.selenium1.rcPlayback.playNextStep);
        return;
      }
    }
  }
  
  var msg = "cmd=testComplete&sessionId=" + builder.selenium1.rcPlayback.session;
  builder.selenium1.rcPlayback.post(msg, function() {});
  jQuery('#edit-editing').show();
  jQuery('#edit-rc-playing').hide();
  jQuery('#edit-rc-stopping').hide();
  
  if (builder.selenium1.rcPlayback.callback) {
    builder.selenium1.rcPlayback.callback(builder.selenium1.rcPlayback.result);
  }
};

builder.selenium1.rcPlayback.stopTest = function() {
  builder.selenium1.rcPlayback.requestStop = true;
  jQuery('#edit-rc-playing').hide();
  jQuery('#edit-rc-stopping').show();
};

builder.selenium1.rcPlayback.post = function(msg, callback) {
  jQuery.ajax({
    type: "POST",
    url: "http://" + builder.selenium1.rcPlayback.hostport + "/selenium-server/driver/",
    data: msg,
    success: callback,
    error: builder.selenium1.rcPlayback.xhrfailed
  });
};

builder.selenium1.rcPlayback.enc = function(str) {
  return encodeURIComponent(str)
        .replace(/%20/g, '+')
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
};

/* Takes a step from a script and turns it into a string to be sent to RC. */
builder.selenium1.rcPlayback.toCmdString = function(step) {
  var str = "cmd=" + step.type.getName();
  var params = step.type.getParamNames();
  for (var i = 0; i < params.length; i++) {
    str += "&" + (i + 1) + "=";
    if (step.type.getParamType(params[i]) == "locator") {
      str += builder.selenium1.rcPlayback.enc(step[params[i]].getName(builder.selenium1) + "=" + step[params[i]].getValue());
    } else {
      str += builder.selenium1.rcPlayback.enc(step[params[i]]);
    }
  }
  /*var str = "cmd=" + step.method;//this.enc(step.method.replace(/^verify/, 'is'));
  if (step.locator) {
    str = str + "&1=" + this.enc(step.locator);
  }
  if (step.option) {
    str = str + "&2=" + this.enc(step.option);
  }*/
  return str;
};