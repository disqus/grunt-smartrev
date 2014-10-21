'use strict';

var _ = require('lodash'),
    smartrev = require('../lib/smartrev');

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
                var tree = new smartrev.Tree(
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
