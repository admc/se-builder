/**
 * GUI component used to select a script saved on the frontend to be loaded into the recorder.
 * Unlike the save dialog, this is not a JQuery dialog, it just gets inserted as HTML.
 */
builder.dialogs.open = new(function () {
  /** Function to call after successful open. */
  var callback;
  /** The DOM node into which to insert the dialog, replacing its contents. */
  var node;
  
  /**
   * @param customer_name The name of the customer whose script it is
   * @param customer_subdomain That customer's subdomain
   * @param project_name The name of the project in which the script is stored
   * @param test_script The name of the script
   * @return A list element containing a link which when clicked, opens that script.
   */
  function create_li(customer_name, customer_subdomain, project_name, test_script) {
    return newNode('li', newNode('a', {
      href: 'http://' + customer_subdomain + "." + window.bridge.serverDomainName() + "/projects/" + encodeURIComponent(project_name) + "/scripts/" + encodeURIComponent(test_script) + "?format=json",
      // Load the script when the user clicks on the link.
      click: function (event) {
        var info = {
          where: "remote",
          customer_name: customer_name,
          customer_subdomain: customer_subdomain,
          project_name: project_name,
          test_script: test_script,
          href: this.href
        }
        builder.frontend.openScript(
          info,
          /* on success */
          callback,
          /* on failure */
          function (res) {
            if (res) {
              // Some server-side error occurred. Tell the user.
              jQuery(this).find(".error").remove();
              for (var error in res.errors) {
                jQuery(event.target.parentNode).append("<br/><span class=\"error\">" + error + " " + res.errors[error] + "</span>");
              }
            } else {
              // Unable to talk to server.
              builder.dialogs.xhrfailed.show();
            }
          }
        );

        // We don't actually want the browser to navigate to the script's page!
        event.preventDefault();
        return false;
      }
    }, test_script));
  }

  return {
    /**
     * Insert an open script dialog.
     * @param anode The DOM node into which to insert the dialog, replacing its contents.
     * @param acallback Function to call after successful open
     */
    show: function (anode, acallback) {
      // This is done by asking the frontend for a list of projects and files. The GUI is
      // then built in the callback.
      node = anode;
      callback = acallback;

      var filebrowser = newNode('ul');
      jQuery(node).html('').append(filebrowser);
      
      builder.frontend.getFileList(
        function onsuccess(res) {
          // Create a hierarchy of ul lists containing all the available files - but only
          // show lists for customers/projects that are non-empty.
          for (var customer_subdomain in res.customers) {
            var customer = res.customers[customer_subdomain];
            var projects = newNode('ul');
            var include_customer = false;
            for (var project_name in customer.projects) {
              var scripts = customer.projects[project_name];
              var project = newNode('ul');
              var include_project = false;

              // Create a list of links the user can click on to load the scripts.
              for (var i = 0; i < scripts.length; i++) {
                project.appendChild(create_li(customer.name, customer_subdomain, project_name, scripts[i]));
                include_project = true;
              }
              if (include_project) {
                projects.appendChild(newNode('li', newNode('b', project_name), project));
                include_customer = true;
              }
            }
            if (include_customer) {
              filebrowser.appendChild(newNode('li', newNode('h2', customer.name), projects));
            }
          }
        },
        function onfailure(res) {
          builder.dialogs.xhrfailed.show();
        }
      );
    },
    hide: function () {
      node.html('');
    }
  }
})();