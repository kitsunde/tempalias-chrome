$(document).ready( function(){
  var config = JSON.parse( localStorage.config );
  $("#days").val( config.days );
  $("#uses").val( config.uses );
  $("#email").val( config.email );
});

$("form").live( "submit", function(){
  var config = JSON.parse( localStorage.config );
  if( config.email !== $("#email").val() ){
    localStorage.aliases = JSON.stringify( [] );
  }
  config.email = $("#email").val();
  config.uses = $("#uses").val();
  config.days = $("#days").val();
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
