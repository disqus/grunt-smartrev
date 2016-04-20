'use strict';

const fs = require('fs');
const path = require('path');

const compareResults = function (name, test) {
    const actualPath = path.join('tmp', name);
    const expectedPath = path.join('test', 'expected', name);

    const files = fs.readdirSync(actualPath);

    if (!files.length)
        throw new Error('No files found to compare!');

    files.forEach(item => {
        const actualFilePath = path.join(actualPath, item);
        const expectedFilePath = path.join(expectedPath, item);

        if (fs.statSync(actualFilePath).isDirectory())
            return compareResults(path.join(name, item), test);

        test.ok(fs.existsSync(expectedFilePath), 'File name is correct');

        const actual = fs.readFileSync(actualFilePath);
        const expected = fs.readFileSync(expectedFilePath);

        // console.log(actualFilePath, expectedFilePath);
        test.deepEqual(actual.toString(), expected.toString(), `${actualFilePath} matches ${expectedFilePath}`);
    });
};

exports.smartrev = (function () {
    return fs.readdirSync('tmp').reduce((tests, item) => {
        if (!fs.statSync(path.join('tmp', item)).isDirectory())
            return undefined;

        tests[item] = function (test) {
            compareResults(item, test);
            test.done();
        };

        return tests;
    }, {});
}());
