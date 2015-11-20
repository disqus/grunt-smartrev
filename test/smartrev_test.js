'use strict';

var fs = require('fs');
var path = require('path');

var compareResults = function (name, test) {
    var actualPath = path.join('tmp', name);
    var expectedPath = path.join('test', 'expected', name);

    var files = fs.readdirSync(actualPath);

    if (!files.length)
        throw new Error('No files found to compare!');

    files.forEach(function (item) {
        var actualFilePath = path.join(actualPath, item);
        var expectedFilePath = path.join(expectedPath, item);

        if (fs.statSync(actualFilePath).isDirectory())
            return compareResults(path.join(name, item), test);

        test.ok(fs.existsSync(expectedFilePath), 'File name is correct');

        var actual = fs.readFileSync(actualFilePath);
        var expected = fs.readFileSync(expectedFilePath);

        // console.log(actualFilePath, expectedFilePath);
        test.deepEqual(actual.toString(), expected.toString(), actualFilePath + ' matches ' + expectedFilePath);
    });
};

exports.smartrev = (function () {
    return fs.readdirSync('tmp').reduce(function (tests, item) {
        if (!fs.statSync(path.join('tmp', item)).isDirectory())
            return;

        tests[item] = function (test) {
            compareResults(item, test);
            test.done();
        };

        return tests;
    }, {});
}());
