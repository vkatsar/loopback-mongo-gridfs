'use strict';

module.exports = GridFSService;

function GridFSService(options) {
  if (!(this instanceof GridFSService)) {
    return new GridFSService();
  }
  this.options = options;
}

GridFSService.prototype = (() => {
  const methods = require('./service/methods');
  const remotes = require('./service/remotes');
  const prototype = {};
  for (const m in methods) {
    prototype[m] = methods[m];
    if (remotes[m]) {
      for (const k in remotes[m]) {
        prototype[m][k] = remotes[m][k];
      }
    }
  }
  return prototype;
})();

GridFSService.modelName = 'storage';
