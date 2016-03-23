/*
 * grunt-smartrev
 *
 *
 * Copyright (c) 2016 Disqus
 * Licensed under the Apache 2.0 license.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const _ = require('lodash');

const normalizePath = function (name) {
    // We need the split/join below due to Windows having \ as path separator :(
    return path.normalize(name).split(path.sep).join('/');
};

let Dependency;  // will be defined below and is used by Tree.prototype.get
const Tree = function (baseUrl, noRename, hashAlgo) {
    this.baseUrl = baseUrl;
    this.noRename = noRename;
    this.hashAlgo = hashAlgo || 'md5';
    this.nodes = {};
};

Tree.handlers = require('./handlers');

Tree._dummyHandler = {
    extract: _.noop,
    substitute: _.noop
};

Tree.getHandler = function (node) {
    return this.handlers[node.ext] || Tree._dummyHandler;
};

Tree.prototype.generate = function (files) {
    let file;
    for (let i = 0, len = files.length; i < len; i++) {
        file = files[i];
        this.get(file).findDependencies();
    }

    return this;
};

Tree.prototype.get = function (name) {
    name = normalizePath(name);
    let dep = this.nodes[name];
    if (!dep)
        dep = this.nodes[name] = new Dependency(name, this);

    return dep;
};

Tree.prototype.process = function () {
    const levels = _.groupBy(this.nodes, function (node) {
        return node.height();
    });

    const hashAlgo = this.hashAlgo;
    let level, node, name;
    for (let height = 0, maxHeight = _.size(levels) - 1; height <= maxHeight; height++) {
        level = levels[height];
        for (let i = 0, len = level.length; i < len; i++) {
            node = level[i];
            name = node.name;

            // Should be done before hashing and renaming!
            node.updateDependencyReferences();

            node.marks = null;
            node.ast = null;

            if (_.contains(this.noRename, name))
                continue;

            node.hash = crypto.createHash(hashAlgo)
                              .update(fs.readFileSync(name))
                              .digest('hex');
            node.name = normalizePath(
                path.dirname(name) + '/' +
                path.basename(name, node.ext) + '.' + node.hash + node.ext
            );

            fs.renameSync(name, node.name);
        }
    }

    return this;
};

Tree.prototype.stats = function () {
    const tree = this;
    return Object.keys(tree.nodes).reduce(function (stats, name) {
        const dep = tree.nodes[name];
        stats[name] = {
            newName: dep.name,
            height: dep.height(),
            size: fs.statSync(dep.name).size,
            dependencies: Object.keys(dep.dependencies)
        };

        return stats;
    }, {});
};

Dependency = function (name, tree) {
    this.tree = tree;
    this.name = name;
    this.ext = path.extname(name);
    this.dependencies = {};

    // This array will store the "AST-nodes" that contain references to other
    // files so that we won't need to parse the source again, when replacing
    // those references with the modified files names (the ones with hashes).
    this.marks = [];
};

Dependency.prototype._height = null;
Dependency.prototype.ast = null;
Dependency.prototype.hash = null;

Dependency.prototype.resolve = function (url) {
    return path.relative(process.cwd(), path.resolve(path.dirname(this.name), url));
};

// Returns hashed url relative to file (this.name)
Dependency.prototype.resolveAsHashedUrl = function (url) {
    const hashedUrl = this.tree.get(this.resolve(url)).name;
    const baseUrl = this.tree.baseUrl;
    const basePath = baseUrl ? process.cwd() : path.dirname(this.name);
    let resolvedUrl = path.normalize(path.relative(basePath, hashedUrl));

    if (baseUrl)
        resolvedUrl = baseUrl + '/' + resolvedUrl;

    return resolvedUrl.split(path.sep).join('/');  // Because these are URLs (and Windows)
};

Dependency.prototype.dependOn = function (node) {
    this.dependencies[node.name] = node;
};

Dependency.prototype.height = function () {
    if (this._height !== null)
        return this._height;

    const dependencies = _.values(this.dependencies);
    let result;
    if (dependencies.length)
        result = 1 + Math.max.apply(Math, _.invoke(dependencies, 'height'));
    else
        result = 0;

    return this._height = result;  // eslint-disable-line no-return-assign
};

Dependency.prototype.findDependencies = function () {
    Tree.getHandler(this).extract.call(this);

    return this;
};

Dependency.prototype.updateDependencyReferences = function () {
    // Zero-height nodes don't have any dependencies so we don't need to update
    // any references. Yay, skip!
    if (!this.height())
        return this;

    Tree.getHandler(this).substitute.call(this);

    return this;
};

module.exports = {
    Tree: Tree,
    Dependency: Dependency
};
