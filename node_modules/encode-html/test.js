var encode = require('./index');
var test = require('tape');

test('should have no apostrophe', function(t){
  var text = "SENSE ' s";
  var encoded = encode(text);

  t.equal(encoded, 'SENSE &apos; s');
  t.end();
});

test('should have no "< > \' &(single)" ', function(t){
  var text = '<div class="hidden">NON&SENSE\'s</div>';
  var encoded = encode(text);

  t.equal(encoded, '&lt;div class="hidden"&gt;NON&amp;SENSE&apos;s&lt;/div&gt;');
  t.end();
});