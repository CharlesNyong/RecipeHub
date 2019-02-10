module.exports = function encodeHTMLEntities(text) {
  var replacements = [
    ['amp', '&'],
    ['apos', '\''],
    ['lt', '<'],
    ['gt', '>']
  ];

  replacements.forEach(function(replace){
    text = text.replace(new RegExp(replace[1], 'g'), '&'+replace[0]+';');
  });

  return text;
};