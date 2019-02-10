# encode-html

- encode html entities
- tiny function that replaces "<", ">", "''", "&" with html entities

# install
```shell
npm install encode-html
```

# use
```javascript
var encode = require('encode-html');

console.log(encode('<div class="hidden">NON&SENSE\'s</div>'));
// -> '&lt;div class="hidden"&gt;NON&amp;SENSE&apos;s&lt;/div&gt;'

```

> (opposite) decode function [decode-html](https://www.npmjs.com/decode-html)

# test
```shell
npm test
```

# license
MIT

# author
Andi Neck | [@andineck](https://twitter.com/andineck) | intesso