/**
 * Dialog that can be inserted to allow the user to choose an URL to record an additional script
 * from.
 */
builder.dialogs.record = {};

/** The DOM node into which to insert the dialog. */
builder.dialogs.record.node = null;
builder.dialogs.record.dialog = null;
  
/**
 * Insert a record dialog.
 * @param node The DOM node into which to insert the dialog.
 */
builder.dialogs.record.show = function (node) {
  builder.dialogs.record.node = node;
  builder.dialogs.record.dialog = newNode('div', {'class': 'dialog'});
  jQuery(builder.dialogs.record.dialog).append(newNode('form', {method:'get', action:'#record'},
      newNode('p',
          newNode('h3', 'Start recording a new script at'),
          newNode('input', {id:'startup-url-2', type:'text', 'class':'texta', size:'24'}),
          newNode('p', {},
            newNode('input', {type:'submit', value:'Selenium 1', 'class':'button',
              click: function(e) {
                builder.record.startRecording(jQuery("#startup-url-2").val(), builder.selenium1);
                node.html('');
                builder.gui.menu.updateRunSuiteOnRC();
              }}),
            newNode('input', {type:'submit', value:'Selenium 2', 'class':'button',
              click: function(e) {
                builder.record.startRecording(jQuery("#startup-url-2").val(), builder.selenium2);
                node.html('');
                builder.gui.menu.updateRunSuiteOnRC();
              }}),
            newNode('a', 'Cancel', {
                'class': 'button',
                'click': function () {
                  node.html('');
                },
                'href': '#cancel'
            })
          ),
          newNode('p', {'class':'cookie-warning'},
            "This will delete all cookies for the domain you're recording for."
          )
      )
  ));
  builder.dialogs.record.node.append(builder.dialogs.record.dialog);
  jQuery('#startup-url-2').val(builder.pageState.currentUrl);
};

builder.dialogs.record.hide = function () {
  jQuery(builder.dialogs.record.dialog).remove();
};