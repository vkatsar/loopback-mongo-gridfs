'use strict';

const mongodb = require('mongodb');
const _ = require('lodash');
const GridFSBucket = require('mongodb').GridFSBucket
const Busboy = require('busboy');
const archiver = require('archiver');

module.exports = {
    statusError(message, status) {
        const error = new Error(message);
        error.status = status;
        return error;
    },
    replaceInPattern(pattern, obj) {
        return pattern.replace(/{\$([^}]+)}/g, (str, propPath) => {
            let res = str;
            const pathValue = _.get(obj, propPath);
            if (pathValue !== undefined) {
                res = pathValue;
            } else {
                console.warn(`Path: ${propPath} is undefined`);
            }
            return res;
        })
    },
    fileDownload(ctx, file, res, inline = false, namePattern = '{$filename}') {
        // set headers
        res.set('Content-Type', file.metadata.mimetype);
        res.set('Content-Length', file.length);
        res.set('Content-Disposition', `${(inline) ? 'inline' : 'attachment'};filename=${this.replaceInPattern(namePattern, file)}`);
        const gfs = new GridFSBucket(ctx.db);
        return gfs.openDownloadStream(file._id);
    },
    fileUpload(ctx, container, req) {
        return new Promise((resolve, reject) => {
            const filePromises = [];
            const gfs = new GridFSBucket(ctx.db);
            const busboy = new Busboy({
                headers: req.headers
            });
            busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
                if (filename) {
                    const filePromise = new Promise((fileResolve, fileReject) => {
                        const fileNameArr = filename.split('.');
                        const stream = gfs.openUploadStream(filename, {
                            metadata: {
                                container,
                                mimetype,
                                extension: (fileNameArr.length > 1) ? _.last(fileNameArr) : ''
                            }
                        });
                        stream.once('finish', (file) => {
                            fileResolve(file);
                        });
                        stream.on('error', (error) => {
                            return fileReject(error);
                        });
                        file.pipe(stream);
                    })
                    filePromises.push(filePromise);
                } else {
                    file.resume();
                }
            });
            busboy.on('finish', async () => {
                const files = await Promise.all(filePromises)
                resolve(files);
            })
            req.pipe(busboy);
        });
    },
    zipDownload(ctx, files, res, zipName = 'files', namePattern = '{$filename}') {
        const gfs = new GridFSBucket(ctx.db);
        const archive = archiver('zip', {
            zlib: {level: 9} // Sets the compression level.
        });
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                console.warn(err);
            } else {
                throw err;
            }
        });
        archive.on('error', function (err) {
            throw err;
        });
        while (files.length) {
            const file = files.pop();
            const fileStream = gfs.openDownloadStream(file._id);
            archive.append(fileStream, {name: this.replaceInPattern(namePattern, file)});
        }
        archive.finalize();

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment;filename=${zipName}.zip`);
        return archive;
    },
    convertWhere(where) {
        const query = {};
        if (!_.isPlainObject(where)) {
            return query;
        }
        Object.keys(where).forEach((k) => {
            let cond = where[k];
            if (_.includes(['and', 'or', 'nor'], k)) {
                if (Array.isArray(cond)) {
                    cond = cond.map(function (w) {
                        return this.convertWhere(w);
                    });
                }
                query['$' + k] = cond;
                delete query[k];
                return;
            }
            if (k === 'id') {
                k = '_id';
            }
            let spec = '';
            let regexOptions = null;
            if (_.isPlainObject(cond)) {
                regexOptions = cond.options;
                spec = Object.keys(cond)[0];
                cond = cond[spec];
            }
            if (spec) {
                if (spec === 'between') {
                    query[k] = {$gte: this.typecastValue(k, cond[0]), $lte: this.typecastValue(k, cond[1])};
                } else if (spec === 'inq') {
                    cond = [].concat(cond || []);
                    query[k] = {
                        $in: cond.map((x) => {
                            return this.typecastValue(k, x);
                        }),
                    };
                } else if (spec === 'nin') {
                    cond = [].concat(cond || []);
                    query[k] = {
                        $nin: cond.map((x) => {
                            return this.typecastValue(k, x);
                        }),
                    };
                } else if (spec === 'like') {
                    if (cond instanceof RegExp) {
                        query[k] = {$regex: cond};
                    } else {
                        query[k] = {$regex: new RegExp(cond, regexOptions)};
                    }
                } else if (spec === 'nlike') {
                    if (cond instanceof RegExp) {
                        query[k] = {$not: cond};
                    } else {
                        query[k] = {$not: new RegExp(cond, regexOptions)};
                    }
                } else if (spec === 'neq') {
                    query[k] = {$ne: this.typecastValue(k, cond)};
                } else if (spec === 'regexp') {
                    if (cond.global)
                        console.warn('{{MongoDB}} regex syntax does not respect the {{`g`}} flag');
                    query[k] = {$regex: cond};
                } else {
                    query[k] = {};
                    query[k]['$' + spec] = this.typecastValue(k, cond);
                }
            } else {
                if (cond === null) {
                    // http://docs.mongodb.org/manual/reference/operator/query/type/
                    // Null: 10
                    query[k] = {$type: 10};
                } else {
                    query[k] = this.typecastValue(k, cond);
                }
            }
        });
        return query;
    },
    convertObjectId(id) {
        return new mongodb.ObjectID(id)
    },
    typecastValue(key, val) {
        if (!this.props) {
            const raw = require('./models').file;
            this.props = {
                raw,
                objectIdFields: Object.keys(raw).filter(p => raw[p].type === 'ObjectID'),
                dateFields: Object.keys(raw).filter(p => raw[p].type === 'date')
            }
        }
        if (_.includes(this.props.objectIdFields, key))
            return this.convertObjectId(val);
        else if (_.includes(this.props.dateFields, key)) {
            return new Date(val);
        }
        return val;
    }
}