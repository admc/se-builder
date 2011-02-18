/**
 * Save dialog; used to save scripts to the server (frontend). Each customer on the system may have
 * multiple projects with a list of scripts each, ie MyCustomer/MyProject/MyScript. Script names
 * are unique within a project.
 *
 * The dialog is a JQuery dialog which consists of a list of projects, each with a list of existing
 * scripts and an input field to enter the name of the file you want to save. When the user presses
 * the save button, the script is saved to the project whose input field was most recently edited.
 *
 * Unlike eg the locator dialog, this is not cached but rather created and inserted afresh each
 * time.
 */
builder.dialogs.save = new(function () {
  /** The script name input field that was most recently edited. */
  var most_recently_edited_box = null;
  /** Function to call after successful save. */
  var post_save_callback = null;

  // A new scope to store which node to toggle.
  function create_toggle(node) {
    return function () {
      jQuery(node).toggle();
    };
  }

  /** Performs the save. */
  function save(event) {
    var form = this;

    // Assemble the data to send to the server.
    var info = {
      where: "remote",
      test_script: form.script_name.value.replace(/\.sb$/, "") + ".sb",
      customer_subdomain: form.customer_subdomain.value,
      project_name: form.project_name.value,
      customer_name: form.customer_name.value
    };
    var contents = JSON.stringify(builder.getScript());

    builder.frontend.createScript(
      info,
      contents,
      /** We've saved successfully - hide the save dialog. */
      function onsuccess(res) {
        builder.storage.set('testscriptpath', info);
        builder.dialogs.save.hide();
      },
      /** 
       * Something went wrong - either there's a technical error or a script of this name
       * already exists in this project.
       */
      function onfailure(res) {
        // AJAX failure.
        if (!res) { return builder.dialogs.xhrfailed.show(); }

        jQuery(form).find(".error").remove();

        // Add any errors to the display
        for (var error in res.errors) {
          jQuery(form).append("<span class=\"error\"><br/>" + error + " " +
              res.errors[error] + "</span>");
        }

        // The error was (presumably) an "already exists" if we can find an item with the
        // same name already, so we create buttons to allow overwriting of existing files.
        // NOTE: There is a slight race condition if another user creates this file just
        // before this user,  but the chances are that overwriting is the wrong course of
        // action in that case anyway.
        // So we go over all the scripts listed, and if we find an item with the same name,
        // we ask the user if they want to overwrite it.
        jQuery(form).siblings().map(function () {
          if (this.textContent == info.test_script) {
            jQuery("<div id=\"overwriteConfirmation\"><p>A file with this name already exists, do you want to replace it by the current test? </div>").appendTo("body").dialog({
              modal: true,
              buttons: {
                "No, keep the original": function () {
                  jQuery(this).dialog('close');
                },
                "Yes, overwrite it": function (event) {
                  jQuery(this).dialog('close');
                  builder.frontend.updateScript(info, contents,
                    function onsuccess(res) {
                      builder.storage.set('testscriptpath', info);
                      builder.dialogs.save.hide();
                    },
                    function onfailure(res) {
                      jQuery(event.target.parentNode).find(".error").remove();
                      for (var error in res.errors) {
                        jQuery(event.target.parentNode).append("<br/><span class=\"error\">" + error + " " + res.errors[error] + "</span>");
                      }
                    }
                  );
                }
              }
            }); // End of dialog
          }
        }); // End of call to "map"
      }
    );

    event.preventDefault();
    return false;
  }

  return {
    /**
     * Create the dialog and insert it into the GUI.
     *
     * @param post_save Function to execute after a successful save.
     */
    show: function (post_save) {
      // This is done by asking the frontend for a list of projects and files. The GUI is
      // then built in the callback.
      post_save_callback = post_save;
      builder.frontend.getFileList(
        /** on success*/ 
        function (res) {
          var filebrowser = jQuery('#fileBrowser').html('');

          // Create the list of projects and files.
          for (var customer_subdomain in res.customers) {
            var customer = res.customers[customer_subdomain];
            var projects = newNode('ul');
            for (var project_name in customer.projects) {
              // Create list of saved scripts in this project.
              var scripts = customer.projects[project_name];
              var project = newNode('ul');
              for (var i = 0; i < scripts.length; i++) {
                project.appendChild(newNode('li', scripts[i]));
              }
              // Create field(s) for entering the name of the script to save.
              // NOTE: This form is deliberately not in an <li>.
              project.appendChild(
                newNode(
                  'form',
                  { submit: save },
                  newNode('input', {
                    type: 'hidden',
                    name: 'project_name',
                    value: project_name
                  }),
                  newNode('input', {
                    type: 'hidden',
                    name: 'customer_subdomain',
                    value: customer_subdomain
                  }),
                  newNode('input', {
                    type: 'hidden',
                    name: 'customer_name',
                    value: customer.name
                  }),
                  newNode('input', {
                    type: 'text',
                    name: 'script_name',
                    change: function () { most_recently_edited_box = this; }
                  }),
                  ".sb"
                )
              );
              projects.appendChild(
                newNode(
                  'li',
                  newNode(
                    'b',
                    project_name,
                    { click: create_toggle(project) }),
                  project
                )
              );
            }
            // Customer name
            filebrowser.append(
              newNode(
                'li',
                newNode(
                  'h2',
                  customer.name,
                  { click: create_toggle(projects) }
                ),
                projects
              )
            );
          }
          // Now open this as a dialog.
          jQuery("#dialog").dialog('open').dialog("option", "buttons", {
            Cancel: function (event) {
              jQuery(this).dialog("close");
            },
            Save: function (event) {
              if (!most_recently_edited_box) {
                return alert("Please specify a file name");
              }
              save.call(jQuery(most_recently_edited_box).parent("form").get(0), event);
            }
          });
        },
        /* on failure */
        function () {
          builder.dialogs.xhrfailed.show();
        }
      );
    },
    hide: function () {
      jQuery("#dialog").dialog("close");
      if (typeof post_save_callback == 'function') {
        post_save_callback();
        post_save_callback = null;
      }
    }
  };
})();