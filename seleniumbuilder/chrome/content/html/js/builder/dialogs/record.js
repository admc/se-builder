/**
 * Dialog that can be inserted to allow the user to choose an URL to record an additional script
 * from.
 */
builder.dialogs.record = new(function () {
  /** The DOM node into which to insert the dialog, replacing its contents. */
  var node;
  
  return {
    /**
     * Insert a record dialog.
     * @param anode The DOM node into which to insert the dialog, replacing its contents.
     */
    show: function (anode) {
      node = anode;
      node.html('');
      node.append(newNode('h3', 'Start recording a new script at'));
      node.append(newNode('form', {method:'get', action:'#record'},
          newNode('p',
              newNode('input', {id:'startup-url-2', type:'text', class:'texta', size:'24'}),
              newNode('input', {type:'submit', value:'Go!', class:'ui-state-default ui-corner-all suiteButton',
                click:function(e) {
                  builder.suite.addEmptyScript();
                  builder.clearAndStartRecordingAt(e, jQuery("#startup-url-2").val());
                  node.html('');
                }}),
              newNode('a', 'Cancel', {
                  class: 'ui-state-default ui-corner-all record-button',
                  click: function () {
                    node.html('');
                  },
                  href: '#cancel'
              }),
              newNode('p', {class:'cookie-warning'},
                "This will delete all cookies for the domain you're recording for."
              )
          )
      ));
      var v = builder.storage.get('currenturl');
      if (!/^http/.test(v) ||
          (window.bridge.hasServer() && v.indexOf(window.bridge.serverDomainName()) > 0))
      {
        v = 'http://';
      }
      jQuery('#startup-url-2').val(v);  
    },
    hide: function () {
      node.html('');
    }
  }
})();
