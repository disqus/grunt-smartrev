'use strict';

const fs = require('fs');

const css = require('css');

const URL_REGEX = /url\((['"]?)([^?#)]+)([^)]*)\1\)/ig;
const URL_REGEX_GROUP = 2;

const parseDeclaration = function (declaration) {
    // NOTE: This function will probably won't match any @import statements but
    //       since they are considered harmful, I don't think it is a big deal.

    const value = declaration.value;
    if (!value)
        return;

    let occurrences = 0;
    let match, url;

    URL_REGEX.lastIndex = 0;  // reset the RegExp
    // use RegExp.prototype.exec for iterative matching in the same string since
    // CSS rules may have multiple `url(...)` statements in a single value.
    while (match = URL_REGEX.exec(value)) {  // eslint-disable-line no-cond-assign
        url = this.resolve(match[URL_REGEX_GROUP]);
        if (!fs.existsSync(url))
            continue;

        occurrences += 1;
        this.dependOn(this.tree.get(url));
    }

    if (occurrences)
        this.marks.push(declaration);
};

const parseRule = function parseRule(rule) {
    if (rule.declarations)
        rule.declarations.forEach(parseDeclaration, this);
    else if (rule.rules)
        rule.rules.forEach(parseRule, this);
};

const processDeclaration = function (declaration) {
    URL_REGEX.lastIndex = 0;  // reset the RegExp
    declaration.value = declaration.value.replace(
        URL_REGEX,
        (_match, quote, url, query) => `url(${quote}${this.resolveAsHashedUrl(url)}${query}${quote})`
    );
};

const extract = function () {
    this.ast = css.parse(fs.readFileSync(this.name).toString());

    this.ast.stylesheet.rules.forEach(parseRule, this);

    return this;
};

const substitute = function () {
    this.marks.forEach(processDeclaration, this);

    fs.writeFileSync(this.name, css.stringify(this.ast));

    return this;
};

module.exports = {
    '.css': {
        extract,
        substitute,
    },
};
