/**
 * To avoid the roundtrip to America whenever we need an alias as we maintain a
 * buffer config['max_aliases'] aliases. It also allows us to get around the
 * rate limit on the service when we want to several addresses in quick
 * succession.
 */
if( !localStorage.config ){
  localStorage.config = JSON.stringify({
    "days": 7,
    "uses": 10,
    "max_aliases": 5,
    "host": "tempalias.com"
  });
  chrome.tabs.create( { url: "/options.html" } );
}
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
  if( !config.email || config.max_aliases === aliases.length )
    return;
  fetchAlias( config );

  var intervalId = setInterval( function(){
    var config = JSON.parse( localStorage.config );
    if( !config.email || config.max_aliases === aliases.length )
      return clearInterval( intervalId );
    fetchAlias( config );
  }, 60*1000 );
  
  function fetchAlias( config ){
    if( !config.email ) return;
    getAlias( config, function( response ){
      if( response.aid ) aliases.push( response );
    });
  }
}

function getAlias( config, callback ){
  $.getJSON( "http://" + config.host + "/aliases?callback=?", {
    "target": config.email,
    "max-usage": config.uses,
    "days": config.days
  }, function( response ){
    callback( response );
  });
}

chrome.extension.onRequest.addListener( function( request, sender, response ){
  var config = JSON.parse( localStorage.config );
  if( request.action === "getEmail" ){
    if( aliases.length > 0 ){
      var email = aliases.pop().aid + "@" + config.host;
      fillAliases();
    }
    if( !email ){
      var notification = webkitNotifications.createNotification(
        '/icons/icon48.png',
        "Sorry, no temporary email available.",
        "We generate new emails every minute and store up to " +
        config.max_aliases + " for you to use at any one time." + 
        " Perhaps you ran out?"
      );
      notification.show()
      setTimeout( function(){ notification.cancel() }, 8000 );
    }
    response( email || "" );

  }else if( request.action === "saveConfig" ){
    for( key in request.config ){
      if( request.config[ key ] ) config[ key ] = request.config[ key ];
      else delete request.config[ key ];
    }
    localStorage.config = JSON.stringify( config );
    aliases = [];
    fillAliases();
  }
});

chrome.contextMenus.create({
    type: 'normal',
    title: 'Generate email',
    contexts: [ 'editable' ],
    onclick: function( clickData, tabId ){
      if( tabId.url.indexOf( "https://chrome.google.com/extensions" ) === 0 ){
        var notification = webkitNotifications.createNotification(
          '/icons/icon48.png',
          "Can't use extensions on this page.",
          "For security reasons chrome won't let us paste an email on " +
          "extension pages. :)"
        );
        notification.show()
        setTimeout( function(){ notification.cancel() }, 8000 );
      }
      if( !JSON.parse( localStorage.config )['email'] ){
        chrome.tabs.create( { url: "/options.html" } );
      }else{
        chrome.tabs.executeScript( null, {
          allFrames : true,
          file: "input.js"
        });
     }
    }
  }, function(){
    fillAliases();
});
