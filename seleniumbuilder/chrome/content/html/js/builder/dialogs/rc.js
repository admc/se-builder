/**
 * Dialog that can be inserted to allow the user to run a test on Selenium RC.
 */
builder.dialogs.rc = new(function () {
  /** The DOM node into which to insert the dialog, replacing its contents. */
  var node;
  /** Whether the dialog is for playing all scripts in the suite */
  var playall;
  
  return {
    /**
     * Insert a run on RC dialog.
     * @param anode The DOM node into which to insert the dialog, replacing its contents.
     * @param doplayall Whether the dialog is for playing all scripts in the suite
     * @param altCallback If specified, called instead of running RC.
     * @param altOKText If specified, overrides the text in the "Run" button.
     */
    show: function (anode, doplayall, altCallback, altOKText) {
      node = anode;
      playall = doplayall;
      
      var run_b = newNode('a', altOKText || 'Run', {
      class: 'button',
        click: function () {
          var hostPort = jQuery('#rc-hostport').val();
          var browserString = jQuery('#rc-browserstring').val();
          window.bridge.setRcHostPort(hostPort);
          window.bridge.setRcBrowserString(browserString);
          builder.dialogs.rc.hide();
          if (altCallback) {
            altCallback(hostPort, browserString);
          } else {
            if (playall) {
              builder.dialogs.runall.runRC(node, hostPort, browserString);
            } else {
              builder.getScript().seleniumVersion.rcPlayback.run(hostPort, browserString);
              //builder.rc.runtest(hostPort, browserString);
            }
          }
        },
        href: '#run'
      });
      var cancel_b = newNode('a', 'Cancel', {
        class: 'button',
        click: function () {
          builder.dialogs.rc.hide();
        },
        href: '#cancel'
      });
      var bDiv = newNode('div', {style:'margin-top: 20px;'});
      jQuery(bDiv).append(run_b).append(cancel_b);
      var chooseHeader = newNode('h4', 'Selenium RC Settings');
      
      var optDiv = newNode('div', {id: 'options-div'},
        newNode('table', {style: 'border: none;'},
          newNode('tr',
            newNode('td', "Host:Port of RC Server "),
            newNode('td', newNode('input', {id: 'rc-hostport', type: 'text', value: window.bridge.rcHostPort()}))
          ),
          newNode('tr',
            newNode('td', "Browser String "),
            newNode('td', newNode('input', {id: 'rc-browserstring', type: 'text', value: window.bridge.rcBrowserString()}))
          )
        )
      );
      
      jQuery(node).html('').
          append(chooseHeader).
          append(optDiv).
          append(bDiv);
    },
    hide: function () {
      node.html('');
    }
  };
})();
