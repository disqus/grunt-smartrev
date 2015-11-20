'use strict';

const fs = require('fs');
const path = require('path');

const self = path.basename(__filename);

/**
 * Basically, goes through all available modules, which are directories or
 * files with .js extension (except for this file, __filename) and imports them
 * to generate a dynamic, global handler interface.
 *
 * The interface is <ext> -> { extract: function (), substitute: function () }
 * <ext> is the file extension that this handler is valid for, including the
 * dot in the extension (eg. '.css')
 *
 * A module is allowed to handle more than one file extension/type.
 */
fs.readdirSync(__dirname).forEach(function (item) {
    if (item === self || path.extname(item) !== '.js' && !fs.statSync(item).isDirectory())
        return;

    const handler = require(path.join(__dirname, item));

    // Exports from a module is extension -> {extract(), substitute()}
    Object.keys(handler).forEach(function (ext) {
        exports[ext] = handler[ext];
    });
});
