# Fixtures for sails

JSON fixtures. Data are automatically loaded and checked every time you lift your sails (if you use bootstrap from examples). Suggestions and pull requests are welcome.

## Howto

1. Setup your models
2. Edit your bootstrap.js
3. Fill data
4. ```sails lift```

### Bootstrap config

Simply call ```#init(config, callback)```, it will handle the rest.

```javascript
var fixtures = require('sails-fixtures');

module.exports.bootstrap = function(next)
{
  fixtures.init({
    'dir':'/path/to/your/fixtures/directory',
    'pattern':'*.json' // Default is '*.json'
  }, next);
};
```

### Data format

Fixtures are loaded in parallel. Their contents are loaded in series in specified order.

```json
[
  {
    "model":"modelname",
    "items":[
      {
        "id":1,
        "attribute":"foo"
      },
      {
        "id":50,
        "attribute":"bar"
      }
    ]
  },
  {
    "model":"anothermodel",
    "items":[
      {
        "id":7,
        "name":"test"
      }
    ]
  }
]
```
