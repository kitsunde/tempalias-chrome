/**
 * To avoid the roundtrip to America whenever we need an alias as well as 
 * enable bursting out email aliases (the service is limited to 30 seconds
 * between requests), we are maintain a buffer of email aliases.
 * It invalidate aliases deemed too old (12 hours) and loads up to
 * config['max_aliases'] number of aliases.
 */

if( !localStorage.aliases ){
  localStorage.aliases = JSON.stringify( [] );
}
if( !localStorage.config ){
  localStorage.config = JSON.stringify({
    "days": 7,
    "uses": 10,
    "max_aliases": 5,
    "host": "tempalias.com"
  });
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

function fetchAlias( callback ){
  var config = JSON.parse( localStorage.config );
  if( !config.email ){
    return null;
  }
  getAlias( config, function( response ){
    if( response.aid ){
      var aliases = JSON.parse( localStorage.aliases );
      if( aliases.push( response ) > config.max_aliases ){
        aliases.shift();
      }
      localStorage.aliases = JSON.stringify( aliases );
      if( callback ){
        callback( );
      }
    }else if( callback ){
      callback( { error: true } );
    }
  });
}

function popEmail(){
  var config = JSON.parse( localStorage.config ),
      aliases = JSON.parse( localStorage.aliases ),
      email = null;
  if( aliases.length === 0 ){
    return false;
  }
  email = aliases.pop().aid + "@" + config.host;
  localStorage.aliases = JSON.stringify( aliases );  
  return email;
}

chrome.extension.onRequest.addListener( function( request, sender, response ){
  if( request.action === "getEmail" ){
    var email = popEmail();
    if( email ){
      response( email );
    }else{
      fetchAlias( function( error ){ response( popEmail() || "" ); });
    }
  }else if( request.action === "fetchAlias" ){
    fetchAlias();
  }
});

chrome.contextMenus.create({
    type: 'normal',
    title: 'Generate email',
    contexts: [ 'editable' ],
    onclick: function( clickData, tabId ){
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
    var config = JSON.parse( localStorage.config );
    fetchAlias();
    setInterval( fetchAlias, 60*1000 );
});
