'use strict'

module.exports = {
    file: {
        "_id": {
            type: 'ObjectID',
            description: "The file's id",
            example: 'string'
        },
        "length": {
            type: 'number',
            description: "Length of the file"
        },
        "chunkSize": {
            type: 'number',
            description: "Size of chunk"
        },
        "uploadDate": {
            type: 'date',
            description: "Upload date"
        },
        "filename": {
            type: 'string',
            description: "The file's name"
        },
        "md5": {
            type: 'string',
            description: "MD5 hash"
        },
        "metadata": {
            type: {
                container: {
                    type: 'string',
                    description: "Container of the file"
                },
                mimetype: {
                    type: 'string',
                    description: "MIME type"
                },
                extension: {
                    type: 'string',
                    description: "File extension"
                }
            }
        }
    }
}