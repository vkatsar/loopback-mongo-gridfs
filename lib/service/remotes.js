'use strict'

const models = require('./models');
/*
 * Routing options
 */
module.exports = {
    // GET      /containers
    getContainers: {
        shared: true,
        accepts: [],
        returns: {
            arg: 'containers',
            type: [
                {
                    type: "string",
                    pattern: "^[\\S\\d]+$",
                    description: "Container name"
                }
            ],
            description: "List of containers",
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers'
        },
        accessScopes: ["read"],
        description: 'List all storage containers'
    },
    // PATCH    /containers/:container
    renameContainer: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'newName', type: 'string', description: 'New container name' }
        ],
        returns: {
            arg: 'result',
            type: {
                count: {
                    type: 'number',
                    description: "Number of files affected"
                }
            },
            description: "Result",
            root: true
        },
        http: {
            verb: 'patch',
            path: '/containers/:container'
        },
        accessScopes: ["write"],
        description: 'Rename or merge a storage container'
    },
    // DELETE   /containers/:container
    deleteContainer: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' }
        ],
        returns: {
            arg: 'result',
            type: {
                filesDeleted: {
                    type: 'number',
                    description: "Number of files deleted"
                },
                versionsDeleted: {
                    type: 'number',
                    description: "Number of versions deleted"
                }
            },
            description: "Result",
            root: true
        },
        http: {
            verb: 'delete',
            path: '/containers/:container'
        },
        accessScopes: ["write"],
        description: 'Delete a storage container and all files attached to it'
    },
    // GET      /containers/:container/files
    getContainerFiles: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' }
        ],
        returns: {
            arg: 'result',
            type: [
                {
                    type: models.file,
                    description: "File metadata"
                }
            ],
            description: "List of files metadata",
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers/:container/files'
        },
        accessScopes: ["read"],
        description: 'List all files matched by where in storage container'
    },
    // POST     /containers/:container/files
    uploadContainerFiles: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'req', type: 'object', http: { source: 'req' }}
        ],
        returns: {
            arg: 'result',
            type: [
                {
                    type: models.file,
                    description: "File metadata"
                }
            ],
            description: "List of files metadata",
            root: true
        },
        http: {
            verb: 'post',
            path: '/containers/:container/files'
        },
        accessScopes: ["write"],
        description: 'Upload files within a storage container'
    },
    // PUT      /containers/{container}/files
    replaceContainerFiles: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'req', type: 'object', http: { source: 'req' }}
        ],
        returns: {
            arg: 'file',
            type: models.file,
            description: "File's metadata",
            root: true
        },
        http: {
            verb: 'put',
            path: '/containers/:container/files'
        },
        accessScopes: ["write"],
        description: 'Replace a file within a storage container, deleting all of its versions'
    },
    // GET      /containers/:container/files/count
    countContainerFiles: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' }
        ],
        returns: {
            arg: 'result',
            type: {
                count: {
                    type: 'number',
                    description: "Number of files"
                }
            },
            description: "Result",
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers/:container/files/count'
        },
        accessScopes: ["read"],
        description: 'Count files matched by where in storage container'
    },
    // GET		/containers/{container}/files/download
    downloadContainerFiles: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' },
            { arg: 'res', type: 'object', 'http': { source: 'res' } }
        ],
        returns: [
            {arg: 'body', type: 'file', root: true},
            {arg: 'Content-Disposition', type: 'string', http: { target: 'header' }},
            {arg: 'Content-Type', type: 'string', http: { target: 'header' }}
        ],
        http: {
            verb: 'get',
            path: '/containers/:container/files/download'
        },
        accessScopes: ["read"],
        description: 'Download zipped files matched by where in storage container'
    },
    // GET		/containers/{container}/files/downloadOne
    downloadContainerFileWhere: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' },
            { arg: 'alias', type: 'string', description: 'File alias. Default: `{$filename}`' },
            { arg: 'inline', type: 'boolean', default:false, description: 'Download inline' },
            { arg: 'res', type: 'object', 'http': { source: 'res' } }
        ],
        returns: [
            {arg: 'body', type: 'file', root: true},
            {arg: 'Content-Disposition', type: 'string', http: { target: 'header' }},
            {arg: 'Content-Type', type: 'string', http: { target: 'header' }}
        ],
        http: {
            verb: 'get',
            path: '/containers/:container/files/downloadOne'
        },
        accessScopes: ["read"],
        description: 'Download a single file matched by where in storage container'
    },
    // GET		/containers/{container}/files/{file}
    getContainerFile: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' }
        ],
        returns: {
            type: models.file,
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file'
        },
        accessScopes: ["read"],
        description: 'Get file in storage container'
    },
    // GET		/containers/{container}/files/{file}/download
    downloadContainerFile: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'res', type: 'object', 'http': { source: 'res' } },
            { arg: 'alias', type: 'string', description: 'File alias. Default: `{$filename}`' },
            { arg: 'inline', type: 'boolean', default:false, description: 'Download inline' }
        ],
        returns: [
            {arg: 'body', type: 'file', root: true, description: 'File'},
            {arg: 'Content-Type', type: 'string', http: { target: 'header' }, description: 'Content-Type'},
            {arg: 'Content-Length', type: 'number', http: { target: 'header' }, description: 'Content-Length'},
            {arg: 'Content-Disposition', type: 'string', http: { target: 'header' }, description: 'Content-Disposition'}
        ],
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file/download'
        },
        accessScopes: ["read"],
        description: 'Download file in storage container'
    },
    // DELETE   /containers/:container/files/:file
    deleteContainerFile: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' }
        ],
        returns: {
            arg: 'result',
            type: {
                filesDeleted: {
                    type: 'number',
                    description: "Number of files deleted"
                },
                versionsDeleted: {
                    type: 'number',
                    description: "Number of versions deleted"
                }
            },
            description: "Result",
            root: true
        },
        http: {
            verb: 'delete',
            path: '/containers/:container/files/:file'
        },
        accessScopes: ["write"],
        description: 'Delete a file within a storage container'
    },
    // GET        /containers/{container}/files/{file}/versions
    getFileVersions: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' }
        ],
        returns: {
            arg: 'result',
            type: [
                {
                    type: models.file,
                    description: "File metadata"
                }
            ],
            description: "List of files metadata",
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file/versions'
        },
        accessScopes: ["read"],
        description: 'List all file versions matched by where'
    },
    // GET        /containers/{container}/files/{file}/versions/count
    countFileVersions: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' }
        ],
        returns: {
            arg: 'result',
            type: [
                {
                    type: models.file,
                    description: "File metadata"
                }
            ],
            description: "List of files metadata",
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file/versions/count'
        },
        accessScopes: ["read"],
        description: 'Count file versions'
    },
    // GET        /containers/{container}/files/{file}/versions/download
    downloadFileVersions: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'alias', type: 'string', description: 'File alias (always starts with `{$_id}_`). Default: `{$filename}` for `{$_id}_{$filename}`' },
            { arg: 'where', type: 'object', description: 'Criteria to match files' },
            { arg: 'res', type: 'object', 'http': { source: 'res' } }
        ],
        returns: [
            {arg: 'body', type: 'file', root: true},
            {arg: 'Content-Disposition', type: 'string', http: { target: 'header' }},
            {arg: 'Content-Type', type: 'string', http: { target: 'header' }}
        ],
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file/versions/download'
        },
        accessScopes: ["read"],
        description: 'Download zipped files matched by where in storage container'
    },
    // GET        /containers/{container}/files/{file}/versions/{version}
    getFileVersion: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'version', type: 'string', description: 'Version id' }
        ],
        returns: {
            type: models.file,
            root: true
        },
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file/versions/:version'
        },
        accessScopes: ["read"],
        description: 'Get file version'
    },
    // GET        /containers/{container}/files/{file}/versions/{version}/download
    downloadFileVersion: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'version', type: 'string', description: 'Version id' },
            { arg: 'res', type: 'object', 'http': { source: 'res' } },
            { arg: 'alias', type: 'string', description: 'File alias. Default: `{$_id}_{$filename}`' },
            { arg: 'inline', type: 'boolean', default:false, description: 'Download inline' }
        ],
        returns: [
            {arg: 'body', type: 'file', root: true, description: 'File'},
            {arg: 'Content-Type', type: 'string', http: { target: 'header' }, description: 'Content-Type'},
            {arg: 'Content-Length', type: 'number', http: { target: 'header' }, description: 'Content-Length'},
            {arg: 'Content-Disposition', type: 'string', http: { target: 'header' }, description: 'Content-Disposition'}
        ],
        http: {
            verb: 'get',
            path: '/containers/:container/files/:file/versions/:version/download'
        },
        accessScopes: ["read"],
        description: 'Download file version'
    },
    // DELETE   /containers/:container/files/:file/versions/:version
    deleteFileVersion: {
        shared: true,
        accepts: [
            { arg: 'container', type: 'string', description: 'Container name' },
            { arg: 'file', type: 'string', description: 'File name' },
            { arg: 'version', type: 'string', description: 'Version id' }
        ],
        returns: {
            arg: 'result',
            type: {
                versionsDeleted: {
                    type: 'number',
                    description: "Number of versions deleted"
                }
            },
            description: "Result",
            root: true
        },
        http: {
            verb: 'delete',
            path: '/containers/:container/files/:file/versions/:version'
        },
        accessScopes: ["write"],
        description: 'Delete file version'
    },
}
