'use strict';

const fs = require('fs');

const css = require('css');

const URL_REGEX = /url\((['"]?)([^?#)]+)([^)]*)\1\)/ig;

var parseDeclaration = function (declaration) {
    // NOTE: This function will probably won't match any @import statements but
    //       since they are considered harmful, I don't think it is a big deal.

    var value = declaration.value;
    if (!value)
        return;

    var occurrences = 0;
    var match, url;

    URL_REGEX.lastIndex = 0;  // reset the RegExp
    // use RegExp.prototype.exec for iterative matching in the same string since
    // CSS rules may have multiple `url(...)` statements in a single value.
    while (match = URL_REGEX.exec(value)) {  // eslint-disable-line no-cond-assign
        url = this.resolve(match[2]);
        if (!fs.existsSync(url))
            continue;

        occurrences += 1;
        this.dependOn(this.tree.get(url));
    }

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
    var node = this;
    URL_REGEX.lastIndex = 0;  // reset the RegExp
    declaration.value = declaration.value.replace(URL_REGEX, function (_match, quote, url, query) {
        url = node.resolveAsHashedUrl(url);
        return 'url(' + quote + url + query + quote + ')';
    });
};

var extract = function () {
    this.ast = css.parse(fs.readFileSync(this.name).toString());

    this.ast.stylesheet.rules.forEach(parseRule, this);

    return this;
};

var substitute = function () {
    this.marks.forEach(processDeclaration, this);

    fs.writeFileSync(this.name, css.stringify(this.ast));

    return this;
};

module.exports = {
    '.css': {
        extract: extract,
        substitute: substitute
    }
};
