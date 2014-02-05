/*
 * grunt-smartrev
 * 
 *
 * Copyright (c) 2014 Disqus
 * Licensed under the MIT license.
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
                '<%= nodeunit.tests %>',
            ],
            options: {
                jshintrc: '.jshintrc',
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
            'console': ['test/*_test.js'],
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

    // The super-ugly hack below requires a few changes to go away:
    //  1. Make grunt-contrib-nodeunit to be compatible with junit reporter
    //  2. Make GenericXunitTestRunner in arcanist to accept a folder of XML files
    //     instead of a single, enforced XML file path.
    grunt.registerTask('nodeunit-xunit', 'Very ugly hack to get XUnit results from nodeunit', function () {
        var done = this.async();

        grunt.task.requires('run');

        grunt.util.spawn({
            cmd: 'node',
            args: [
                './node_modules/grunt-contrib-nodeunit/node_modules/nodeunit/bin/nodeunit',
                'test/smartrev_test.js',
                '--reporter', 'junit',
                '--output', path.dirname(grunt.option('xunit-file'))
            ]
        },
        function (error, result, code) {
            grunt.log.writeln(result);

            fs.renameSync(path.join(path.dirname(grunt.option('xunit-file')), 'smartrev_test.js.xml'), grunt.option('xunit-file'));
            return done(code === 0);
        });
    });

    // Whenever the "test" task is run, first clean the "tmp" dir, then run this
    // plugin's task(s), then test the result.
    grunt.registerTask('run', ['clean', 'copy', 'smartrev']);
    grunt.registerTask('test', ['run', 'nodeunit:console']);
    grunt.registerTask('test.xunit', ['run', 'nodeunit-xunit']);

    // By default, run all tests.
    grunt.registerTask('default', ['test']);

};
