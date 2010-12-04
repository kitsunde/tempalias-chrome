/**
 * Because of issue 20773 [1] in chromium we can't access iframes from content
 * scripts which means we have to inject this script in all frames. I would
 * much rather inject this only into the top frame and search for the active
 * element in the future.
 *
 * [1] http://code.google.com/p/chromium/issues/detail?id=20773
 */
var activeElement = document.activeElement;
if( window.frames.length > 0 && window.frames[0] !== undefined )
  console.log( "Bug 20773 is fixed! Please alert http://www.github.com/Celc" );

/* Uncomment and amke sure script is only injected once when bug 20773 is fixed.
if( activeElement === document.body ){
  for( var i = 0; i < window.frames.length; ++i ){
    activeElement = frames[i].document.activeElement;
    if( activeElement.value ) break;
  }
}
*/
if( activeElement !== document.body ){
  chrome.extension.sendRequest( { action : "getEmail" }, function( response ){
    console.log( "acquired email:", response );
    activeElement.value += response;
  });
}
