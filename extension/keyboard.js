/**
 * We are only using this until chrome puts in an extension API for keyboard
 * shortcuts.
 * http://code.google.com/p/chromium/issues/detail?id=27702
 */
chrome.extension.sendRequest({ action: "getConfig" }, function( config ){
  if( !config || !config.shortcut || !config.shortcut.keyIdentifier ) return;

  window.addEventListener("keydown", function( e ){
    for( var key in config.shortcut ){
      if( e[key] !== config.shortcut[key] ){
        return;
      }
    }
    chrome.extension.sendRequest({ action: "inputEmail" });
  });
});
