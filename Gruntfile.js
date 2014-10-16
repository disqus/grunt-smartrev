/*
 * grunt-smartrev
 * 
 *
 * Copyright (c) 2014 Disqus
 * Licensed under the Apache 2.0 license.
 */

'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
    // Project configuration.
    var config = {
        jshint: {
            all: [
                'Gruntfile.js',
                'tasks/*.js',
                '<%= nodeunit.all.src %>',
            ],
            options: {
                jshintrc: true,
            },
        },

        // Before generating any new files, remove any previously-created files.
        clean: {
            tests: ['tmp'],
        },

        copy: {
            tests: {
                files: [
                    {
                        expand: true,
                        src: ['**', '!**/options.json'],
                        cwd: 'test/fixtures/',
                        dest: 'tmp/',
                    },
                ],
            },
        },

        // Unit tests.
        nodeunit: {
            all: {
                src: 'test/*_test.js',
                options: {
                    reporter: 'grunt',
                },
            },
        },
    };

    config.smartrev = fs.readdirSync('test/fixtures').reduce(function (targets, item) {
        if (!fs.statSync(path.join('test/fixtures', item)).isDirectory())
            return;

        var optionsPath = path.join('test', 'fixtures', item, 'options.json');
        var options = grunt.file.exists(optionsPath) ?
                      grunt.file.readJSON(optionsPath) : {};

        if (!options.cwd)
            options.cwd = 'tmp/' + item;

        targets[item] = {
            options: options,
            src: ['**/*.*', '!**/options.json'],
            dest: 'stats.json',
        };

        return targets;
    }, {});

    grunt.initConfig(config);

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('run', ['clean', 'copy', 'smartrev']);
    grunt.registerTask('test', ['jshint', 'run', 'nodeunit']);

    // By default, run all tests.
    grunt.registerTask('default', ['test']);

};
