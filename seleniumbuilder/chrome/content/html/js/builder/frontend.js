
/**
 * To deal with the server - currently no implementation available, so subject to change.
 *
 * TODO, needs a bit of a spring-clean
 */
builder.frontend = new (function () {

  /** LOGGING IN **/
    var saved_url = null;
    var login_url = builder.urlFor("/login?return_to=%2Frecorder%2Flogged_in")
    var authenticity_token = null;

    // Force people to be logged in, and (horribly hidden) remove the loading screen when done
    function check_login () {
        // Firefox loves to cache in chrome mode, I don't think its possible to override that except globally,
        // so fall back on the old random number hack instead.
        // If we want to communicate with a frontend server, we need to check we're logged in.
        if (window.bridge.hasServer()) {
      jQuery.ajax({
        url: builder.urlFor("/sessions/show?format=json&nocache=" + Math.random()),
        success: function (res) {
           if (res.email) {
             builder.storage.set('username', res.name)
             builder.interface.switchTo('startup')
           } else {
             builder.interface.switchTo('login')
             authenticity_token = res.authenticity_token;
           }
         },
        error: function (){
          builder.storage.set('loaderror', true);
        },
        dataType: "json"
      });
        }
    
        // Either way, we're booted up, so let's switch to the startup view.
    builder.interface.switchTo('startup');
    }

    // The check login function is responsible for generating the first interface the user sees after the loading one.
    builder.interface.addOnloadHook(check_login);

    return {

        /**
         * Try to log in with values.email and values.password.
         * onsuccess is called when the server responds (With true or false)
         * onfailure is called when no response is forth-coming
         */
        attemptLogin: function (values, onsuccess, onfailure) {

            var url = builder.urlFor("/session?format=json");
            var params = "email=" + encodeURIComponent(values.email) + 
                         "&password=" + encodeURIComponent(values.password) + 
                         '&authenticity_token=' + encodeURIComponent(authenticity_token) +
                         (values.remember_me ? "&remember_me=1" : "");

            jQuery.ajax({
                url: url,
                data: params,
                success: function (res) {
                    if (res.email) {
                       builder.storage.set('username', res.name);
                       onsuccess(true);
                    } else {
                        authenticity_token = res.authenticity_token;
                        onsuccess(false);
                    }
                },
                error: function () {
                    if (typeof console != 'undefined') {
                        console.log("Logging in failed:");
                        console.log(arguments);
                    }
                    onfailure();
                },
                type: "POST",
                dataType: "json"
            });

        },

        /*
         * Create a new script at the path {customer_subdomain, project_name, test_script}
         * with the given (string) contents. onsuccess and onfailure are callbacks
         */
        createScript: function(path, contents, onsuccess, onfailure) {
            var url = "http://" + path.customer_subdomain + "." + window.bridge.serverDomainName() + "/projects/" + encodeURIComponent(path.project_name) + "/scripts?format=json";
            var params = "test_script[name]=" + encodeURIComponent(path.test_script) + 
                         "&authenticity_token=" + encodeURIComponent(authenticity_token) + 
                         "&test_script[contents]=" + encodeURIComponent(contents) +
                         '&test_script_format=gti';

            jQuery.ajax({
                url: url,
                data: params,
                success: function (res) {
                    if (res.status == "OK")
                        onsuccess(res);
                    else
                        onfailure(res);
                },
                error: function () {
                    if (typeof console != 'undefined') {
                        console.log("Creating script failed:");
                        console.log(arguments);
                    }
                    onfailure();
                },
                type: "POST",
                dataType: "json"
            });
        },

        /*
         * Update the script at the path {customer_subdomain, project_name, test_script}
         * with the given (String) contents, onsuccess and onfailure are callbacks
         */
        updateScript: function(info, contents, onsuccess, onfailure) {
            var url = "http://" + info.customer_subdomain + "." + window.bridge.serverDomainName() + 
                            "/projects/" + encodeURIComponent(info.project_name) + 
                            "/scripts/" + encodeURIComponent(info.test_script) + "?format=json";
            var params = "authenticity_token=" + encodeURIComponent(authenticity_token) + 
                         "&test_script[contents]=" + encodeURIComponent(contents) +
                         "&test_script_format=sauce";


            jQuery.ajax({
                url: url,
                data: params,
                type: "PUT",
                success: function (res) {
                    if (res.status == "OK") {
                        onsuccess(res);
                    } else {
                        onfailures(res);
                    }
                },
                error: function () {
                    if (typeof console != 'undefined') {
                        console.log("Updating script failed:");
                        console.log(arguments);
                    }
                    onfailure(null);
                },
                dataType: "json"
            });
        },

        /**
         * Retreive a list of all files that are editable by the recorder
         */
        getFileList: function (callback, failure) {
            jQuery.ajax({
                url: builder.urlFor("/recorder/file_list?format=json"),
                success: function (res) {
                    authenticity_token = res.authenticity_token;
                    callback(res);
                },
                error: function () {
                    if (typeof console != 'undefined') {
                        console.log("Could not load file list:")
                        console.log(arguments);
                    }
                    failure();
                },
                dataType: "json"
            })
        },

        /**
         * Returns the HTTP status code of the given URL, or 0 if connection failed.
         */
        pageHttpStatus: function (url, callback) {
      callback(200); // qqDPS Hacked to allow operation without frontend.
      /* qqDPS
      var params = "url=" + encodeURIComponent(url);
            jQuery.ajax({
                url: builder.urlFor("/recorder/page_http_status?format=json"),
        data: params,
                success: function (res) {
                    authenticity_token = res.authenticity_token;
                    callback(res.status);
                },
                error: function () {
                    callback(0);
                },
                dataType: "json",
        timeout: 10000
            })
      */
        },

        /**
         * Given an object with a .href parameter corresponding to the
         * absolute URL of the test script, open that test script.
         */
        openScript: function (info, success, failure) {
            jQuery.ajax({
                url: info.href,
                success: function (res) {
                    if (res.status == "OK") {
                        authenticity_token = res.authenticity_token
                        success(
                            {
                where: "remote",
                                test_script: res.test_script, 
                                customer_name: res.customer_name, 
                                customer_subdomain: res.customer_subdomain, 
                                project_name: res.project_name
                            }, 
                            res.script
                        );
                    } else {
                        failure(res);
                    }
                },
                error: function () {
                    if (typeof console != 'undefined') {
                        console.log("Opening script failed:");
                        console.log(arguments);
                    }
                    failure();
                },
                dataType: "json"
            });
        }
    }
})()
