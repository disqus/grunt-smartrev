/* jshint node: true */
/* global module, require */
'use strict';

var fs = require('fs');

var parser = require('css-parse');
var builder = require('css-stringify');

// RegEx for comments is taken from http://www.w3.org/TR/CSS21/grammar.html
var COMMENT_REGEX = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
var URL_REGEX = /url\((['"]?)([^?#)]+)([^)]*)\1\)/ig;

var parseDeclaration = function (declaration) {
    // NOTE: This function will probably won't match any @import statements but
    //       since they are considered harmful, I don't think it is a big deal.

    if (!declaration.value) {
        return;
    }

    var val = declaration.value.replace(COMMENT_REGEX, '');

    var occurrences = 0;
    var match, url;

    URL_REGEX.lastIndex = 0;  // reset the RegExp
    /* jshint boss:true */
    // use RegExp.prototype.exec for iterative matching in the same string since
    // CSS rules may have multiple `url(...)` statements in a single value.
    while (match = URL_REGEX.exec(val)) {
        url = this.resolve(match[2]);
        if (!fs.existsSync(url))
            continue;

        occurrences += 1;
        this.dependOn(this.tree.get(url));
    }
    /* jshint boss:false */

    if (occurrences)
        this.marks.push(declaration);
};

var parseRule = function parseRule(rule) {
    if (rule.declarations)
        rule.declarations.forEach(parseDeclaration, this);
    else if (rule.rules)
        rule.rules.forEach(parseRule, this);
};

var processDeclaration = function (declaration) {
    var val = declaration.value.replace(COMMENT_REGEX, '');

    var node = this;
    var baseUrl = this.tree.baseUrl ? this.tree.baseUrl + '/' : '';
    URL_REGEX.lastIndex = 0;  // reset the RegExp
    declaration.value = val.replace(URL_REGEX, function (match, quote, url, query) {
        url = node.resolveAsHashedUrl(url);
        return 'url(' + quote + baseUrl + url + query + quote + ')';
    });
};

var extract = function () {
    this.ast = parser(fs.readFileSync(this.name).toString());

    this.ast.stylesheet.rules.forEach(parseRule, this);

    return this;
};

var substitute = function () {
    this.marks.forEach(processDeclaration, this);

    fs.writeFileSync(this.name, builder(this.ast));

    return this;
};

module.exports = {
    '.css': {
        extract: extract,
        substitute: substitute
    }
};
