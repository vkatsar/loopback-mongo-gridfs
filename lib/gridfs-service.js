const _ = require('lodash');
const Busboy = require('busboy');
const GridFS = require('gridfs-stream');
const ZipStream = require('zip-stream');

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

module.exports = GridFSService;

function GridFSService(options) {
  if (!(this instanceof GridFSService)) {
    return new GridFSService(options);
  }

  this.options = options;
}

/**
 * Connect to mongodb if necessary.
 */
GridFSService.prototype.connect = function (cb) {
  var self = this;

  if (!this.db) {
    var url;
    if (!self.options.url) {
      url = (self.options.username && self.options.password) ?
        'mongodb://{$username}:{$password}@{$host}:{$port}/{$database}' :
        'mongodb://{$host}:{$port}/{$database}';

      // replace variables

      url = url.replace(/\{\$([a-zA-Z0-9]+)\}/g, (pattern, option) => {
        return self.options[option] || pattern;
      });
    } else {
      url = self.options.url;
    }

    // connect

    MongoClient.connect(url, self.options, (error, client) => {
      if (!error) {
        self.db = client.db(self.options.database);
      }

      return cb(error, self.db);
    });
  }
};

/**
 * List all storage containers
 */

GridFSService.prototype.getContainers = function (cb) {
  var collection = this.db.collection('fs.files');

  collection.find({ 'metadata.container': { $exists: true } }).toArray(function (error, files) {
    var containerList = [];

    if (!error) {
      containerList = _(files)
        .map('metadata.container').uniq().value();
    }

    return cb(error, containerList);
  });
};

/**
 * Elimina todos los ficheros que cumplen con la condición
 */

GridFSService.prototype.delete = function (where, cb) {
  const fs_files = this.db.collection('fs.files');
  const fs_chunks = this.db.collection('fs.chunks');

  fs_files.find(where, { _id: 1 }).toArray((error, containerFiles) => {
    if (!containerFiles || containerFiles.length <= 0) {
      return cb(error);
    }

    const files = containerFiles.map(file => file._id);

    fs_chunks.deleteMany({ 'files_id': { $in: files } }, (error) => {
      if (error) {
        return cb(error);
      }

      fs_files.deleteMany({ '_id': { $in: files } }, (error) => {
        return cb(error);
      });
    });
  });
};

/**
 * Delete an existing storage container.
 */
GridFSService.prototype.deleteContainer = function (containerName, cb) {
  var fs_files = this.db.collection('fs.files');
  var fs_chunks = this.db.collection('fs.chunks');

  fs_files.find({ 'metadata.container': containerName }, { _id: 1 }).toArray(function (error, containerFiles) {
    if (!containerFiles || containerFiles.length <= 0) {
      return cb(error);
    }

    var files = [];

    for (var index in containerFiles) {
      files.push(containerFiles[index]._id);
    }

    fs_chunks.deleteMany({
      'files_id': { $in: files }
    }, function (error) {
      if (error) {
        return cb(error);
      }

      fs_files.deleteMany({
        'metadata.container': containerName
      }, function (error) {
        return cb(error);
      });
    });
  });
};

/**
 * Delete files an existing storage container
 * @param {{string}} container Container
 * @param {{string}} type Type of file: attachment or image
 */

GridFSService.prototype.deleteFilesContainerByType = function (container, type, cb) {
  var fs_files = this.db.collection('fs.files');
  var fs_chunks = this.db.collection('fs.chunks');

  fs_files.find({ 'metadata.container': container, 'metadata.type': type }, { _id: 1 }).toArray(function (error, containerFiles) {
    if (!containerFiles || containerFiles.length <= 0) {
      return cb(error);
    }

    var files = [];

    for (var index in containerFiles) {
      files.push(containerFiles[index]._id);
    }

    fs_chunks.deleteMany({
      'files_id': { $in: files }
    }, function (error) {
      if (error) {
        return cb(error);
      }

      fs_files.deleteMany({
        'metadata.container': container
      }, function (error) {
        return cb(error);
      });
    });
  });
};

/**
 * List all files within the given container.
 */
GridFSService.prototype.getFiles = function (containerName, cb) {
  var collection = this.db.collection('fs.files');

  collection.find({
    'metadata.container': containerName
  }).toArray(function (error, container) {
    return cb(error, container);
  });
};

/**
 * List all files within the given container.
 */
GridFSService.prototype.getFilesByType = function (container, type, cb) {
  const collection = this.db.collection('fs.files');

  collection.find({
    'metadata.container': container,
    'metadata.type': type
  }, { sort: 'filename' }).toArray(function (error, file) {
    return cb(error, file);
  });
};

/**
 * List all the files that meet the conditions
 */

GridFSService.prototype.findFiles = function (where, cb) {
  const collection = this.db.collection('fs.files');

  collection.find(where, { sort: 'filename' }).toArray(function (error, files) {
    return cb(error, files);
  });
};

/**
 * Return a file with the given id within the given container.
 */
GridFSService.prototype.getFile = function (containerName, fileId, cb) {
  var collection = this.db.collection('fs.files');

  collection.find({
    '_id': new mongodb.ObjectID(fileId),
    'metadata.container': containerName
  }).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error('File not found.');
      error.status = 404;
    }
    return cb(error, file || {});
  });
};

/**
 * Return a file with the given filename within the given container.
 */
GridFSService.prototype.getFileByName = function (containerName, filename, cb) {
  var collection = this.db.collection('fs.files');

  collection.find({
    'metadata.filename': filename,
    'metadata.container': containerName
  }).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error('File not found');
      error.status = 404;
    }
    return cb(error, file || {});
  });
};

/**
 * Return file versions with the given filename within the given container.
 */
GridFSService.prototype.getFileVersions = function (containerName, filename, excludeCurrent, cb) {
  var collection = this.db.collection('fs.files');

  collection.find({
    'metadata.container': containerName,
    'metadata.filename': filename
  }, {
    sort: { 'uploadDate': -1 }
  }).skip(excludeCurrent ? 1 : 0).toArray(function (error, file) {
    return cb(error, file);
  });
};

/**
 * Delete an existing file with the given id within the given container.
 */
GridFSService.prototype.deleteFile = function (containerName, fileId, cb) {
  var fs_files = this.db.collection('fs.files');
  var fs_chunks = this.db.collection('fs.chunks');

  fs_files.deleteOne({
    '_id': new mongodb.ObjectID(fileId),
    'metadata.container': containerName
  }, function (error) {
    if (error) {
      return cb(error);
    }

    fs_chunks.deleteMany({
      'files_id': new mongodb.ObjectID(fileId)
    }, function (error) {
      cb(error);
    });
  });
};

/**
 * Delete an existing file with the given id file.
 */

GridFSService.prototype.deleteFileByFileId = function (fileId, cb) {
  var fs_files = this.db.collection('fs.files');
  var fs_chunks = this.db.collection('fs.chunks');

  fs_files.deleteOne({
    '_id': new mongodb.ObjectID(fileId)
  }, function (error) {
    if (error) {
      return cb(error);
    }

    fs_chunks.deleteMany({
      'files_id': new mongodb.ObjectID(fileId)
    }, function (error) {
      console.log(error)
      cb(error);
    });
  });
};

/**
 * Delete an existing file with the given name within the given container.
 */
GridFSService.prototype.deleteFileByName = function (containerName, filename, cb) {
  var fs_files = this.db.collection('fs.files');
  var fs_chunks = this.db.collection('fs.chunks');

  fs_files.find({ 'metadata.container': containerName, 'metadata.filename': filename }, { _id: 1 }).toArray(function (error, containerFiles) {
    if (!containerFiles || containerFiles.length <= 0) {
      return cb(error);
    }

    var files = [];

    for (var index in containerFiles) {
      files.push(containerFiles[index]._id);
    }

    fs_chunks.deleteMany({
      'files_id': { $in: files }
    }, function (error) {
      if (error) {
        return cb(error);
      }

      fs_files.deleteMany({
        'metadata.filename': filename,
        'metadata.container': containerName
      }, function (error) {
        return cb(error);
      });
    });
  });
};

/**
 * Upload middleware for the HTTP request.
 */
GridFSService.prototype.upload = function (containerName, req, cb) {
  var self = this;

  var busboy = new Busboy({
    headers: req.headers
  });

  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    var options = {
      _id: new mongodb.ObjectID(),
      filename: filename,
      metadata: {
        container: containerName,
        filename: filename,
        mimetype: mimetype
      },
      mode: 'w'
    };

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createWriteStream(options);

    stream.on('close', function (file) {
      return cb(null, file);
    });

    stream.on('error', cb);

    file.pipe(stream);
  });

  req.pipe(busboy);
};

/**
 * Upload middleware for the HTTP request.
 */
GridFSService.prototype.uploadWithMetadata = function (containerName, metadata, req, cb) {
  var self = this;

  var busboy = new Busboy({
    headers: req.headers
  });

  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    // Añadir a los metadatos incluidos por el usuario el nombre del contenedor,
    // nombre del fichero y el mime type del fichero

    metadata = metadata || {};

    metadata.container = containerName;
    metadata.filename = filename;
    metadata.mimetype = mimetype;

    var options = {
      _id: new mongodb.ObjectID(),
      filename: filename,
      metadata: metadata,
      mode: 'w'
    };

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createWriteStream(options);

    stream.on('close', function (file) {
      return cb(null, file);
    });

    stream.on('error', cb);

    file.pipe(stream);
  });

  req.pipe(busboy);
};

/**
 * Download middleware for the HTTP request.
 */

GridFSService.prototype.download = function (fileId, res, cb) {
  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({
    '_id': new mongodb.ObjectID(fileId)
  }).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error('File not found.');
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createReadStream({
      _id: file._id
    });

    // set headers
    res.set('Content-Type', file.metadata.mimetype);
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `attachment;filename=${file.filename}`);

    return stream.pipe(res);
  });
};

GridFSService.prototype.downloadContainer = function (containerName, req, res, cb) {
  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({
    'metadata.container': containerName
  }).toArray(function (error, files) {
    if (files.length === 0) {
      error = new Error('Folder without files.');
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);
    var archive = new ZipStream();

    function next() {
      if (files.length > 0) {
        var file = files.pop();
        var fileStream = gridfs.createReadStream({ _id: file._id });

        archive.entry(fileStream, { name: file.filename }, next);
      } else {
        archive.finish();
      }
    }

    next();

    var filename = req.query.filename || 'file';

    res.set('Content-Disposition', `attachment;filename=${filename}.zip`);
    res.set('Content-Type', 'application/zip');

    return archive.pipe(res);
  });
};

/**
 * Método que descarga un listado de ficheros comprimidos en formato zip
 * @param {{string}} filesId Cadena con los identificadores de los ficheros
 * a descargar comprimidos separados por comas
 */

GridFSService.prototype.downloadZipFiles = function (filesId, res, cb) {
  if (!filesId) {
    return cb(new Error('Unspecified files.'));
  }

  const ObjectId = require('mongodb').ObjectID;
  const Ids = filesId.split(',').map(id => ObjectId(id));

  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({ '_id': { $in: Ids } }).toArray(function (error, files) {
    if (files.length === 0) {
      error = new Error('Files not found.');
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);
    var archive = new ZipStream();

    function next() {
      if (files.length > 0) {
        var file = files.pop();
        var fileStream = gridfs.createReadStream({ _id: file._id });

        archive.entry(fileStream, { name: file.filename }, next);
      } else {
        archive.finish();
      }
    }

    next();

    const fecha = new Date();
    const filename = `documentos-${fecha.getFullYear()}${fecha.getMonth() + 1}${fecha.getDate()}`;

    res.set('Content-Disposition', `attachment;filename=${filename}.zip`);
    res.set('Content-Type', 'application/zip');

    return archive.pipe(res);
  });
};

/**
 * Download middleware for the HTTP request.
 */
GridFSService.prototype.downloadInline = function (fileId, res, cb) {
  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({
    '_id': new mongodb.ObjectID(fileId)
  }).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error('File not found.');
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createReadStream({
      _id: file._id
    });

    // set headers
    res.set('Content-Type', file.metadata.mimetype);
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `inline;filename=${file.filename}`);

    return stream.pipe(res);
  });
};

/**
 * Get stream fileId.
 */

GridFSService.prototype.getStreamFileId = function (fileId, cb) {
  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({
    '_id': new mongodb.ObjectID(fileId)
  }).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error('File not found.');
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);

    return cb(null, gridfs.createReadStream({ _id: file._id }));
  });
};

/**
 * Download middleware for the HTTP request.
 */
GridFSService.prototype.downloadInlineByName = function (containerName, filename, res, cb) {
  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({
    'metadata.filename': filename,
    'metadata.container': containerName
  }).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error(`File "${filename}" not found.`);
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createReadStream({
      _id: file._id
    });

    // set headers
    res.set('Content-Type', file.metadata.mimetype);
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `inline;filename=${file.filename}`);

    return stream.pipe(res);
  });
};

/**
 * Upload middleware for the HTTP request.
 */
GridFSService.prototype.uploadFile = function (containerName, fileId, req, cb) {
  var self = this;
  var busboy = new Busboy({
    headers: req.headers
  });

  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    var options = {
      _id: new mongodb.ObjectID(),
      filename: filename,
      metadata: {
        id: fileId,
        container: containerName,
        filename: filename,
        mimetype: mimetype
      },
      mode: 'w'
    };

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createWriteStream(options);

    stream.on('close', function (file) {
      return cb(null, file);
    });

    stream.on('error', cb);

    file.pipe(stream);
  });

  req.pipe(busboy);
};

GridFSService.modelName = 'storage';

/*
 * Routing options
 */

/*
 * POST /FileContainers/:containerName/uploadFile
 */
GridFSService.prototype.uploadFile.shared = true;
GridFSService.prototype.uploadFile.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name (id and field)' },
  { arg: 'fileId', type: 'string', description: 'Source fileId ' },
  { arg: 'req', type: 'object', http: { source: 'req' } }
];
GridFSService.prototype.uploadFile.returns = {
  arg: 'file',
  type: 'object',
  root: true
};
GridFSService.prototype.uploadFile.http = {
  verb: 'post',
  path: '/:containerName/uploadFile/:fileId'
};
GridFSService.prototype.uploadFile.description = 'Upload a file in container with a custom id in files metadata'

/*
 * GET /FileContainers
 */
GridFSService.prototype.getContainers.shared = true;
GridFSService.prototype.getContainers.accepts = [];
GridFSService.prototype.getContainers.returns = {
  arg: 'containers',
  type: 'array',
  root: true
};
GridFSService.prototype.getContainers.http = {
  verb: 'get',
  path: '/'
};
GridFSService.prototype.getContainers.description = 'Returns all containers from gridFS'

/*
 * DELETE /FileContainers/deleteFileByWhere/:where
 */
GridFSService.prototype.delete.shared = true;
GridFSService.prototype.delete.accepts = [
  { arg: 'where', type: 'string', description: 'Where sentence' }
];
GridFSService.prototype.delete.description = 'Delete a file using a where filter'

GridFSService.prototype.deleteContainer.returns = {};
GridFSService.prototype.deleteContainer.http = {
  verb: 'delete',
  path: '/deleteFileByWhere/:where'
};

/*
 * DELETE /FileContainers/:containerName
 */
GridFSService.prototype.deleteContainer.shared = true;
GridFSService.prototype.deleteContainer.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' }
];
GridFSService.prototype.deleteContainer.returns = {};
GridFSService.prototype.deleteContainer.http = {
  verb: 'delete',
  path: '/:containerName'
};
GridFSService.prototype.deleteContainer.description = 'Delete a container with files and chunks'

/*
 * GET /FileContainers/:containerName/files
 */
GridFSService.prototype.getFiles.shared = true;
GridFSService.prototype.getFiles.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' }
];
GridFSService.prototype.getFiles.returns = {
  type: 'array',
  root: true
};
GridFSService.prototype.getFiles.http = {
  verb: 'get',
  path: '/:containerName/files'
};
GridFSService.prototype.getFiles.description = 'Returns all files from container'

/*
 * GET /FileContainers/:containerName/files/:fileId
 */
GridFSService.prototype.getFile.shared = true;
GridFSService.prototype.getFile.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'fileId', type: 'string', description: 'File id' }
];
GridFSService.prototype.getFile.returns = {
  type: 'object',
  root: true
};
GridFSService.prototype.getFile.http = {
  verb: 'get',
  path: '/:containerName/files/:fileId'
};
GridFSService.prototype.getFile.notes = 'Get files by fileId and container name' 
GridFSService.prototype.getFile.description = 'Returns files by fileId and container name' 

/*
 * GET /FileContainers/:containerName/getFileByName/:filename
 */
GridFSService.prototype.getFileByName.shared = true;
GridFSService.prototype.getFileByName.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'filename', type: 'string', description: 'File name' }
];
GridFSService.prototype.getFileByName.returns = {
  type: 'object',
  root: true
};
GridFSService.prototype.getFileByName.http = {
  verb: 'get',
  path: '/:containerName/getFileByName/:filename'
};
GridFSService.prototype.getFileByName.notes = 'Get files by filename and container name' 
GridFSService.prototype.getFileByName.description = 'Returns files by filename and container name'

/*
 * GET /FileContainers/:containerName/getFileVersions/:filename
 */
GridFSService.prototype.getFileVersions.shared = true;
GridFSService.prototype.getFileVersions.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'filename', type: 'string', description: 'File name' },
  { arg: 'excludeCurrent', type: 'boolean', required:false, default:false, description: 'Exclude current version' }
];
GridFSService.prototype.getFileVersions.returns = {
  type: 'array',
  root: true
};
GridFSService.prototype.getFileVersions.http = {
  verb: 'get',
  path: '/:containerName/getFileVersions/:filename'
};
GridFSService.prototype.getFileVersions.notes = 'Get file versions by filename and container name'
GridFSService.prototype.getFileVersions.description = 'Returns file versions by filename and container name'

/*
 * GET /FileContainers/:containerName/download/:filename
 */
GridFSService.prototype.downloadFileByName = function (containerName, filename, res, cb) {
  var self = this;

  var collection = this.db.collection('fs.files');

  collection.find({
    'metadata.filename': filename,
    'metadata.container': containerName
  }).sort({uploadDate: -1}).limit(1).next(function (error, file) {
    if (!file) {
      error = new Error('File not found.');
      error.status = 404;
    }

    if (error) {
      return cb(error);
    }

    var gridfs = new GridFS(self.db, mongodb);
    var stream = gridfs.createReadStream({
      _id: file._id
    });

    // set headers
    res.set('Content-Type', file.metadata.mimetype);
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `attachment;filename=${file.filename}`);

    return stream.pipe(res);
  });
};

/*
 * DELETE /FileContainers/:containerName/files/:fileId
 */
GridFSService.prototype.deleteFile.shared = true;
GridFSService.prototype.deleteFile.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'fileId', type: 'string', description: 'File id' }
];
GridFSService.prototype.deleteFile.returns = {};
GridFSService.prototype.deleteFile.http = {
  verb: 'delete',
  path: '/:containerName/files/:fileId'
};
GridFSService.prototype.deleteFile.description = 'Delete a file by fileId and container name' 

/*
 * DELETE /FileContainers/files/:fileId
 */
GridFSService.prototype.deleteFileByFileId.shared = true;
GridFSService.prototype.deleteFileByFileId.accepts = [
  { arg: 'fileId', type: 'string', description: 'File id' }
];
GridFSService.prototype.deleteFileByFileId.returns = {};
GridFSService.prototype.deleteFileByFileId.http = {
  verb: 'delete',
  path: '/files/:fileId'
};
GridFSService.prototype.deleteFileByFileId.description = 'Delete a file by fileId'

/*
 * DELETE /FileContainers/:containerName/deleteFileByName/:filename
 */
GridFSService.prototype.deleteFileByName.shared = true;
GridFSService.prototype.deleteFileByName.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'filename', type: 'string', description: 'File name' }
];
GridFSService.prototype.deleteFileByName.returns = {};
GridFSService.prototype.deleteFileByName.http = {
  verb: 'delete',
  path: '/:containerName/deleteFileByName/:filename'
};
GridFSService.prototype.deleteFileByName.description = 'Delete a file by filename'

/*
 * POST /FileContainers/:containerName/upload
 */
GridFSService.prototype.upload.shared = true;
GridFSService.prototype.upload.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'req', type: 'object', http: { source: 'req' }}
];
GridFSService.prototype.upload.returns = {
  arg: 'file',
  type: 'object',
  root: true
};
GridFSService.prototype.upload.http = {
  verb: 'post',
  path: '/:containerName/upload'
};
GridFSService.prototype.upload.notes = 'Accepts container name and file' 
GridFSService.prototype.upload.description = 'Upload a file in a container'

/*
 * GET /FileContainers/download
 */
GridFSService.prototype.download.shared = true;
GridFSService.prototype.download.accepts = [
  { arg: 'fileId', type: 'string', description: 'File id' },
  { arg: 'res', type: 'object', 'http': { source: 'res' } }
];
GridFSService.prototype.download.http = {
  verb: 'get',
  path: '/download'
};
GridFSService.prototype.download.description = 'Download a file by fileId'

/*
 * GET /FileContainers/:containerName/download/:filename
 */
GridFSService.prototype.downloadFileByName.shared = true;
GridFSService.prototype.downloadFileByName.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'filename', type: 'string', description: 'File name' },
  { arg: 'res', type: 'object', 'http': { source: 'res' } }
];
GridFSService.prototype.downloadFileByName.http = {
  verb: 'get',
  path: '/:containerName/download/:filename'
};
GridFSService.prototype.downloadFileByName.description = 'Download a file by file name'

/*
 * GET /FileContainers/:containerName/download/zip
 */
GridFSService.prototype.downloadContainer.shared = true;
GridFSService.prototype.downloadContainer.accepts = [
  { arg: 'containerName', type: 'string', description: 'Container name' },
  { arg: 'req', type: 'object', 'http': { source: 'req' } },
  { arg: 'res', type: 'object', 'http': { source: 'res' } }
];
GridFSService.prototype.downloadContainer.http = {
  verb: 'get',
  path: '/:containerName/zip'
};
GridFSService.prototype.downloadContainer.description = 'Download a zip file with containers files'

/*
 * GET /FileContainers/downloadZipFiles
 */
GridFSService.prototype.downloadZipFiles.shared = true;
GridFSService.prototype.downloadZipFiles.accepts = [
  { arg: 'filesId', type: 'string', description: 'Id Files string separated by commas' },
  { arg: 'res', type: 'object', 'http': { source: 'res' } }
];
GridFSService.prototype.downloadZipFiles.http = {
  verb: 'get',
  path: '/downloadZipFiles'
};
GridFSService.prototype.downloadZipFiles.description = 'Download a zip file with files (by filesId comma separated)'

/*
 * GET /FileContainers/downloadInline/:fileId
 */
GridFSService.prototype.downloadInline.shared = true;
GridFSService.prototype.downloadInline.accepts = [
  { arg: 'fileId', type: 'string', description: 'File id' },
  { arg: 'res', type: 'object', 'http': { source: 'res' } }
];
GridFSService.prototype.downloadInline.http = {
  verb: 'get',
  path: '/downloadInline/:fileId'
};
GridFSService.prototype.downloadInline.description = 'Download a file by fileId (inline)'

/*
 * GET /FileContainers/getStreamFileId/:fileId
 */
GridFSService.prototype.getStreamFileId.shared = true;
GridFSService.prototype.getStreamFileId.accepts = [
  { arg: 'fileId', type: 'string', description: 'File id' }
];
GridFSService.prototype.getStreamFileId.http = {
  verb: 'get',
  path: '/getStreamFileId/:fileId'
};
GridFSService.prototype.getStreamFileId.description = 'Download a stream from a file by fileId'