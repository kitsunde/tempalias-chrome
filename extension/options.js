$("#keyboard").live("change", function(){
  $("label[for=keyboard]").html( "Keyboard shortcut <b>" + 
    ($("#keyboard").attr("checked") ? "active" : "inactive") +
    "</b>"
  );
});

chrome.extension.sendRequest( { action : 'getConfig' }, function( config ){
  $("#days").val( config.days );
  $("#uses").val( config.uses );
  $("#email").val( config.email );

  if( !config.shortcuts )
    $("#keyboard").attr("checked", false ).trigger( "change" );
});

$("form").live( "submit", function(){
  var config = JSON.parse( localStorage.config );
  if( config.email !== $("#email").val() ){
    localStorage.aliases = JSON.stringify( [] );
  }
  config.email = $("#email").val();
  config.uses = parseInt( $("#uses").val() );
  config.days = parseInt( $("#days").val() );
  config.shortcuts = $("#keyboard").attr("checked");
  $("<div class='flash'><div class='message notice'><p>Saved!</p></div></div>").prependTo(
    ".inner:visible"
  ).hide().fadeIn(1000, "swing").fadeOut(1000, "linear");
  chrome.extension.sendRequest( { action : 'saveConfig', config: config } );
  return false;
});

$("#main-navigation li").live("click", function(){
  var links = { "Config": "#config", "Credits" : "#credits" };
  $(".content").hide();
  $( links[ $( this ).text() ] ).show();
  return false;
});
