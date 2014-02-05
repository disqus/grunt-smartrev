/*
 * grunt-smartrev
 *
 *
 * Copyright (c) 2014 Disqus
 * Licensed under the MIT license.
 */

'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var _ = require('lodash');

var normalizePath = function (name) {
    // We need the split/join below due to Windows having \ as path separator :(
    return path.normalize(name).split(path.sep).join('/');
};

var Dependency;  // will be defined below and is used by Tree.prototype.get
var Tree = function (baseUrl, noRename, hashAlgo) {
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
    var file;
    for (var i = 0, len = files.length; i < len; i++) {
        file = files[i];
        this.get(file).findDependencies();
    }

    return this;
};

Tree.prototype.get = function (name) {
    name = normalizePath(name);
    var dep = this.nodes[name];
    if (!dep)
        dep = this.nodes[name] = new Dependency(name, this);

    return dep;
};

Tree.prototype.process = function () {
    var levels = _.groupBy(this.nodes, function (node) {
        return node.height();
    });

    var hashAlgo = this.hashAlgo;
    var level, node, name;
    for (var height = 0, maxHeight = _.size(levels) - 1; height <= maxHeight; height++) {
        level = levels[height];
        for (var i = 0, len = level.length; i < len; i++) {
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
                path.basename(name, node.ext) + '.' +  node.hash + node.ext
            );

            fs.renameSync(name, node.name);
        }
    }

    return this;
};

Tree.prototype.stats = function () {
    var tree = this;
    return Object.keys(tree.nodes).reduce(function (stats, name) {
        var dep = tree.nodes[name];
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

Dependency.prototype.dependOn = function (node) {
    this.dependencies[node.name] = node;
};

Dependency.prototype.height = function () {
    if (this._height !== null)
        return this._height;

    var dependencies = _.values(this.dependencies);
    var result;
    if (!dependencies.length)
        result = 0;
    else
        result = 1 + Math.max.apply(Math, _.invoke(dependencies, 'height'));

    /* jshint boss: true */
    return this._height = result;
    /* jshint boss: false */
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

module.exports = function (grunt) {
    var filterFiles = function (filepath) {
        if (!grunt.file.exists(filepath)) {
            grunt.log.warn('Source file "' + filepath + '" not found.');
            return false;
        } else {
            return true;
        }
    };

    grunt.registerMultiTask(
        'smartrev', 'Walks all files, creates a dependency tree and renames all of them using hashes of their contents',
        function () {
            var owd = process.cwd();
            var options = this.options({
                cwd: '.',
                baseUrl: '',
                noRename: [],
                algorithm: 'md5'
            });

            process.chdir(options.cwd);

            // Iterate over all specified file groups.
            this.files.forEach(function (f) {
                var tree = new Tree(
                    _.result(options, 'baseUrl'),
                    grunt.file.expand({}, options.noRename),
                    options.algorithm
                ).generate(f.src.filter(filterFiles)).process();

                if (f.dest)
                    grunt.file.write(f.dest, JSON.stringify(tree.stats()));
            });

            process.chdir(owd);
        }
    );
};
