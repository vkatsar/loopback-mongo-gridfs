# loopback-mongo-gridfs

Uses MongoDB's [GridFS](https://docs.mongodb.org/manual/core/gridfs/) to manage binary contents of your loopback application.

## Key features

* Files are organized in [containers, files and versions](#containers-files-and-versions)

* Use loopback's [where filters](https://loopback.io/doc/en/lb3/Where-filter.html) to filter multiple GET results

* Option to download file in inline mode.

* Uses the newest [GridFSBucket](https://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html) interface, instead of the deprecated [GridStore](https://mongodb.github.io/node-mongodb-native/2.1/api/GridStore.html) interface

* All errors are written in English

* When a deleting a file, all respective file chunks are deleted (no trash records left in Database)

### Containers, files and versions

The storage component organizes content in **containers**, **files** and **versions**. A container holds a collection of files, and a file can have multiple versions.

* A `container` groups files, similar to a directory or folder. However, a container cannot have child containers. A container is defined in the `metadata.container` property of the file schema.
* A `file` inside a container, is identified by its filename. A file's name is defined in the `filename` property of the file schema.
* A `version` of a file is identified by the file's id. A file with the same filename can have multiple versions. By default, files with the same name will not overwrite each other, but instead will be stored in different versions. When **replacing** a file however, all previous versions of the file are destroyed and only the new version remains. A file's version is defined in the `_id` property of the file schema.


## Installation

Add the loopback-mongo-gridfs dependency to your project using yarn or npm.

```bash
npm install --save loopback-mongo-gridfs
or
yarn add loopback-mongo-gridfs
```

### Add Datasource

Add datasource to your datasources.json (or a js file as documented [here](https://loopback.io/doc/en/lb3/Environment-specific-configuration.html#data-source-configuration))

```json
{
    "gridfs": {
        "name": "gridfs",
        "connector": "loopback-mongo-gridfs",
        "host": "hostname",
        "port": 27017,
        "database": "database",
        "username": "username",
        "password": "password"
    }
}
```

**username** and **password** are optional.

Alternatively, you can directly specify the [MongoDB connection string](https://docs.mongodb.com/manual/reference/connection-string/) by adding `url` property. 

> :grey_exclamation: **NOTE**: Specifying the `url` property will **override** the connection options above.

```json
{
    "gridfs": {
        "name": "gridfs",
        "connector": "loopback-mongo-gridfs",
        "url": "mongodb://{username}:{password}@{host}:{port}/{database}?{param1}={value1}"
    }
}
```

> :exclamation: You can also add any [extra options](https://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/) you may need to pass to the MongoDB client

### Add Model
Add a model definition file as described on [loopback's documentation](https://loopback.io/doc/en/lb3/Model-definition-JSON-file.html).

:grey_exclamation: There is no need to specify any properties as they will be ignored.

Example:

```json
{
  "name": "FileSystem",
  "description": "File storage",
  "plural": "FileSystem",
  "base": "Model",
  "idInjection": true,
  "options": {
    "validateUpsert": true
  },
  "properties": {},
  "validations": [],
  "relations": {},
  "acls": [],
  "methods": {}
}
```

### Attach the Model to the Datasource

Attach the model to the datasource as specified in [loopback's documentation](https://loopback.io/doc/en/lb3/Attaching-models-to-data-sources.html). In `server/model-config.json` add:

```json
{
  "FileSystem": {
    "dataSource": "gridfs",
    "public": true
  }
}
```

## API

After installation, you will have access to a number of API endpoints and Javascript functions. 

### List all storage containers

###### API endpoint:
```
GET /Model/containers
```

###### Node.js:
```javascript
Model.getContainers();
```

###### Arguments:
**None**

<hr>

### Rename or merge a storage container

###### API endpoint:
```
PATCH /FileSystem/containers/{container}
```

###### Node.js:
```javascript
Model.renameContainer(container, newName);
```

###### Arguments:
* `container`:  (**Required**) Container name
* `newName`: (*Required*) New container name

> :exclamation: Renaming the container to an **existing** container name will result to merging its contents to the latter. If a filename already exist, it will be added as a version in the file's version list.

<hr>

### Delete a storage container and all files attached to it

###### API endpoint:
```
DELETE /FileSystem/containers/{container}
```

###### Node.js:
```javascript
Model.deleteContainer(container);
```

###### Arguments:
* `container`: (**Required**) Container name

<hr>

### List all files matched by where in storage container

###### API endpoint:
```
GET /FileSystem/containers/{container}/files
```

###### Node.js:
```javascript
Model.getContainerFiles(container, where);
```

###### Arguments:
* `container`: (**Required**) Container name
* `where`: (*Optional*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Replace a file within a storage container, deleting all of its versions

###### API endpoint:
```
PUT /FileSystem/containers/{container}/files
```

###### Node.js:
```javascript
Model.replaceContainerFiles(container, req);
```

###### Arguments:
* `container`: (**Required**) Container name
* `req`: (**Required**) The request object

<hr>

### Upload files within a storage container

###### API endpoint:
```
POST /FileSystem/containers/{container}/files
```

###### Node.js:
```javascript
Model.uploadContainerFiles(container, req);
```

###### Arguments:
* `container`: (**Required**) Container name
* `req`: (**Required**) The request object

<hr>

### Count files matched by where in storage container

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/count
```

###### Node.js:
```javascript
Model.countContainerFiles(container, where);
```

###### Arguments:
* `container`: (**Required**) Container name
* `where`: (*Optional*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Download zipped files matched by where in storage container

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/download
```

###### Node.js:
```javascript
Model.downloadContainerFiles(container, where, res, cb);
```

###### Arguments:
* `container`: (**Required**) Container name
* `where`: (*Optional*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)
* `res`: (**Required**) The response object
* `cb`: (**Required - Node only**) Callback function

<hr>

### Get file in storage container

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}
```

###### Node.js:
```javascript
Model.getContainerFile(container, file);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name

<hr>

### Delete a file within a storage container

###### API endpoint:
```
DELETE /FileSystem/containers/{container}/files/{file}
```

###### Node.js:
```javascript
Model.deleteContainerFile(container, file);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name

<hr>

### Download file in storage container

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}/download
```

###### Node.js:
```javascript
Model.downloadContainerFile(container, file, res, inline, cb);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `res`: (**Required**) The response object
* `inline`: (*Optional*) Boolean indicating whether to download inline (`true`) or as an attachment (`false`). Default is `false`
* `cb`: (**Required - Node only**) Callback function

<hr>

### List all file versions matched by where

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}/versions
```

###### Node.js:
```javascript
Model.getFileVersions(container, file, where);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `where`: (*Optional*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Count file versions

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}/versions/count
```

###### Node.js:
```javascript
Model.countFileVersions(container, file, where);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `where`: (*Optional*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Download zipped files matched by where in storage container

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}/versions/download
```

###### Node.js:
```javascript
Model.downloadFileVersions(container, file, where, res, cb);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `where`: (*Optional*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)
* `res`: (**Required**) The response object
* `cb`: (**Required - Node only**) Callback function

<hr>

### Get file version

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}/versions/{version}
```

###### Node.js:
```javascript
Model.getFileVersion(container, file, version);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `version`: (**Required**) Version ID

<hr>

### Delete file version

###### API endpoint:
```
DELETE /FileSystem/containers/{container}/files/{file}/versions/{version}
```

###### Node.js:
```javascript
Model.deleteFileVersion(container, file, version);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `version`: (**Required**) Version ID

<hr>

### Download file version

###### API endpoint:
```
GET /FileSystem/containers/{container}/files/{file}/versions/{version}/download
```

###### Node.js:
```javascript
Model.downloadFileVersion(container, file, version, res, inline, cb);
```

###### Arguments:
* `container`: (**Required**) Container name
* `file`: (**Required**) File name
* `version`: (**Required**) Version ID
* `res`: (**Required**) The response object
* `inline`: (*Optional*) Boolean indicating whether to download inline (`true`) or as an attachment (`false`). Default is `false`
* `cb`: (**Required - Node only**) Callback function

<hr>

### Find files that match the condition

###### API endpoint:
**None**

###### Node.js:
```javascript
Model.find(where);
```

###### Arguments:
* `where`: (*Required*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Find a single file that matches the condition

###### API endpoint:
**None**

###### Node.js:
```javascript
Model.findOne(where);
```

###### Arguments:
* `where`: (*Required*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Delete all files that match the condition

###### API endpoint:
**None**

###### Node.js:
```javascript
Model.delete(where, countFiles);
```

###### Arguments:
* `where`: (*Required*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)
* `countFiles`: (*Optional*) Boolean indicating whether to return a counter for deleted files (`true`). Default is `false`.

<hr>

### Delete multiple file versions by id

###### API endpoint:
**None**

###### Node.js:
```javascript
Model.deleteById(versionIds);
```

###### Arguments:
* `versionIds`: (*Required*) ***Array*** of ids to delete.

<hr>

### Count all files that match the condition

###### API endpoint:
**None**

###### Node.js:
```javascript
Model.countFiles(where);
```

###### Arguments:
* `where`: (*Required*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

<hr>

### Count all versions that match the condition

###### API endpoint:
**None**

###### Node.js:
```javascript
Model.countVersions(where);
```

###### Arguments:
* `where`: (*Required*) Where filter (see [Loopback's documentation](https://loopback.io/doc/en/lb3/Where-filter.html) for more info)

## Major (breaking) changes
(1.x.x) to (2.x.x): Completely rewritten the module with new endpoints & functionality

## Licence

[MIT License](./LICENSE)

Copyright (c) Marios Vertopoulos & Vassilis Katsaris