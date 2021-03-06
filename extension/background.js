/**
 * To avoid the roundtrip to Switzerland whenever we need an alias as we 
 * maintain a buffer config['max_aliases'] aliases. It also allows us to get
 * around the rate limit on the service when we want several addresses in
 * quick succession.
 */
(function(){
  var defaults = {
    days: 7,
    uses: 10,
    max_aliases: 5,
    retry_attempts: 5,
    host: "tempalias.com",
    version: 7,
    shortcuts: true,
    shortcut: {
      shiftKey: true,
      ctrlKey: true,
      keyIdentifier: "U+0045" //e
    }
  };
  var versions = [
    {
      version: 7,
      msg: "Now has a keyboard shortcut CTRL+SHIFT+E." +
        "You can go to the options page to disable it."
    }
  ];
  if( !localStorage.config ){
    localStorage.config = JSON.stringify( defaults );
    chrome.tabs.create( { url: "/options.html" } );

  }else{
    var currentVersion = defaults.version;
    var config = JSON.parse( localStorage.config );
    var newConfig = $.extend( true, defaults, config );
    if( !config.version ) config.version = 6;
    var updatedConfig = defaults;
    $.extend( true, updatedConfig, config );

    versions.forEach( function( item ){
      if( item.version <= config.version ) return;
      showNotification( "New in version " + item.version, item.msg );
    });
    
    updatedConfig.version = currentVersion;
    
    localStorage.config = JSON.stringify( updatedConfig );
    
  }
})();

var aliases = [];


/**
 * Every 6 hours remove aliases older than 6 hours.
 */
setInterval( function(){
  aliases = aliases.filter( function( alias ){
    return 6*60*60*1000 > new Date() - new Date( alias.currentDate );
  });
  fillAliases();
}, 6*60*60*1000 );

/**
 * Fills up the aliases array by requesting an alias every minute (due to the
 * 30 second rate limit on the service).
 */
function fillAliases(){
  var config = JSON.parse( localStorage.config );
  var retryAttempts = config.retry_attempts;
  if( !config.email || config.max_aliases === aliases.length )
    return;
  fetchAlias( config );

  var intervalId = setInterval( function(){
    var config = JSON.parse( localStorage.config );
    if( !config.email ||
        config.max_aliases === aliases.length ||
        retryAttempts < 1 ){
      return clearInterval( intervalId );
    }
    fetchAlias( config );
  }, 60*1000 );
  
  function fetchAlias( config ){
    if( !config.email ) return;
    getAlias( config, function( response ){
      if( response.aid ){
        aliases.push( response );
        retryAttempts = config.retry_attempts;
      }
    }, function( response ){
      --retryAttempts;
    });
  }
}

function getAlias( config, success, error ){
  $.ajax({
    url: "http://" + config.host + "/aliases",
    type: "POST",
    processData: false,
    dataType: 'json',
    contentType: "application/json",
    data: JSON.stringify({
      "target": config.email,
      "max-usage": config.uses,
      "days": config.days }),
    success: success,
    error: error
  });
}

function showNotification( title, msg, icon, delay ){
  icon = icon || 'icons/icon48.png';
  delay = delay || 8000;
  var notification = webkitNotifications.createNotification(
    icon,
    title,
    msg);
  notification.show()
  setTimeout( function(){ notification.cancel() }, delay );
}

var requestActions = {
  getEmail: function( request, sender, response ){
    var config = JSON.parse( localStorage.config );
    if( aliases.length > 0 ){
      var email = aliases.pop().aid + "@" + config.host;
      fillAliases();
    }
    if( !email ){
      showNotification(  
        "Sorry, no temporary email available.",
        "We generate new emails every minute and store up to " +
        config.max_aliases + " for you to use at any one time." + 
        " Perhaps you ran out?");
    }
    response( email || "" );    
  },
  saveConfig: function( request, sender, response ){
    var config = JSON.parse( localStorage.config );
    $.extend( true, config, request.config );
    localStorage.config = JSON.stringify( config );
    aliases = [];
    fillAliases();
    if( response ) response( { success: true } );
  },
  getConfig: function( request, sender, response ){
    var config = JSON.parse( localStorage.config );
    response( config );
  },
  inputEmail: function( request, sender, response ){
    var config = JSON.parse( localStorage.config );
    chrome.tabs.executeScript( null, {
      allFrames : true,
      file: "input.js"
    });  
    if( response ) response( { success: true } );
  }
}

chrome.extension.onRequest.addListener( function( request, sender, response ){
  var config = JSON.parse( localStorage.config );
  if( request.trigger === 'keyboard' && !config.shortcuts ){
    if( response ) response({ error: 'shortcuts disabled' });
    return;
  }
  if( !requestActions[request.action] ) response( { error: "No such action" } );
  else requestActions[request.action].apply( this, arguments );
});

chrome.contextMenus.create({
    type: 'normal',
    title: 'Generate email',
    contexts: [ 'editable' ],
    onclick: function( clickData, tabId ){
      if( tabId.url.indexOf( "https://chrome.google.com/extensions" ) === 0 ){
        showNofication(
          "Can't use extensions on this page.",
          "For security reasons chrome won't let us paste an email on " +
          "extension pages. :)");
      }
      if( !JSON.parse( localStorage.config )['email'] ){
        chrome.tabs.create( { url: "/options.html" } );
      }else{
        requestActions.inputEmail();
      }
    }
  }, function(){
    fillAliases();
});
