'use strict';

var fs = require('fs');
var path = require('path');

var compareResults = function (name, test) {
    var actualPath = path.join('tmp', name);
    var expectedPath = path.join('test', 'expected', name);

    fs.readdir(actualPath, function (err, files) {
        if (err || !files.length)
            throw new Error('No files found to compare!');

        test.expect(files.length * 2);
        files.forEach(function (item) {
            var expectedFilePath = path.join(expectedPath, item);
            test.ok(fs.existsSync(expectedFilePath), 'File name is correct');

            var actual = fs.readFileSync(path.join(actualPath, item));
            var expected = fs.readFileSync(expectedFilePath);
            test.deepEqual(actual, expected, 'Files match');
        });
        test.done();
    });
};

exports.smartrev = (function () {
    return fs.readdirSync('tmp').reduce(function (tests, item) {
        if (!fs.statSync(path.join('tmp', item)).isDirectory())
            return;

        tests[item] = compareResults.bind(global, item);

        return tests;
    }, {});
}());
