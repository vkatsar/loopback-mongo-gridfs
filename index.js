const GridFSService = require('./lib/gridfs-service');

/**
 * Initialize storage component.
 */
exports.initialize = function(dataSource, callback) {
  const settings = dataSource.settings || {};

  const connector = new GridFSService(settings);
  dataSource.connector = connector;
  dataSource.connector.dataSource = dataSource;

  connector.DataAccessObject = function () {};

  for (const m in GridFSService.prototype) {
    const method = GridFSService.prototype[m];
    if (typeof method === 'function') {
      connector.DataAccessObject[m] = method.bind(connector);
      for (const k in method) {
        connector.DataAccessObject[m][k] = method[k];
      }
    }
  }

  connector.define = function(model, properties, settings) {};

  if (callback) {
    dataSource.connector.connect(callback);
  }
};
