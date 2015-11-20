'use strict';

const _ = require('lodash');
const smartrev = require('../lib/smartrev');

module.exports = function (grunt) {
    const filterFiles = function (filepath) {
        if (grunt.file.exists(filepath))
            return true;

        grunt.log.warn('Source file "' + filepath + '" not found.');
        return false;
    };

    grunt.registerMultiTask(
        'smartrev', 'Walks all files, creates a dependency tree and renames all of them using hashes of their contents',
        function () {
            const owd = process.cwd();
            const options = this.options({
                cwd: '.',
                baseUrl: '',
                noRename: [],
                algorithm: 'md5'
            });

            process.chdir(options.cwd);

            // Iterate over all specified file groups.
            this.files.forEach(function (fileSet) {
                const tree = new smartrev.Tree(
                    _.result(options, 'baseUrl'),
                    grunt.file.expand({}, options.noRename),
                    options.algorithm
                ).generate(fileSet.src.filter(filterFiles)).process();

                if (fileSet.dest)
                    grunt.file.write(fileSet.dest, JSON.stringify(tree.stats()));
            });

            process.chdir(owd);
        }
    );
};
