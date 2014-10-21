/* jshint node: true */
/* global module, require */
'use strict';

var fs = require('fs');

var htmlparser = require('htmlparser2');
var domutils = htmlparser.DomUtils;

var URL_REGEX = /^([^?#\s)]+)([^)\s]*$)/ig;

/**
 * Expects to be called with a `Dependency` object and a value that is possibly
 * a URL to a local resource. If the value *is* a URL, it calls `node.dependOn`
 * with the extracted URL value (hash and query part stripped) and returns
 * true. Otherwise, it returns false.
 *
 * @param node {Dependency}
 * @param value {string}
 * @returns {boolean}
 */
var dependOnUrl = function (node, value) {
    var match = value.match(URL_REGEX);
    var url = match && node.resolve(match[0]);

    if (!fs.existsSync(url))
        return false;

    node.dependOn(node.tree.get(url));

    return true;
};

var defaultAttributeChecker = function (elem, attrName) {
    return dependOnUrl(this, elem.attribs[attrName]);
};

var urlProcessor = function (match, url, query) {
    return this.resolveAsHashedUrl(url) + query;
};

var defaultAttributeProcessor = function (elem, attrName) {
    elem.attribs[attrName] = elem.attribs[attrName].replace(URL_REGEX, urlProcessor.bind(this));
};

var ATTRIBUTES = {
    'src': {
        shouldProcess: defaultAttributeChecker,
        process: defaultAttributeProcessor
    },
    'href': {
        shouldProcess: defaultAttributeChecker,
        process: defaultAttributeProcessor
    },
    'srcset': {
        shouldProcess: function (elem) {
            var values = elem.attribs.srcset.split(',');

            return values.some(function (value) {
                return dependOnUrl(this, value.trim().split(' ')[0]);
            }, this);
        },
        process: function (elem) {
            var urls = elem.attribs.srcset.split(',');

            elem.attribs.srcset = urls.map(function (urlish) {
                var parts = urlish.trim().split(' ');
                parts[0] = parts[0].replace(URL_REGEX, urlProcessor.bind(this));

                return parts.join(' ');
            }, this).filter(Boolean).join(',');
        }
    }
};
var ATTRIBS_TO_CHECK = Object.keys(ATTRIBUTES);

var shouldModify = function (elem) {
    var attribChecker = domutils.hasAttrib.bind(domutils, elem);
    return elem.attribs && ATTRIBS_TO_CHECK.some(attribChecker);
};

var parseElem = function (elem) {
    var attribChecker = domutils.hasAttrib.bind(domutils, elem);
    elem.__attrNames = ATTRIBS_TO_CHECK.filter(attribChecker).filter(function (attrName) {
        return ATTRIBUTES[attrName].shouldProcess.call(this, elem, attrName);
    }, this);

    if (elem.__attrNames.length)
        this.marks.push(elem);
};

var processElem = function (elem) {
    elem.__attrNames.forEach(function (attrName) {
        ATTRIBUTES[attrName].process.call(this, elem, attrName);
    }, this);
};

var extract = function () {
    this.ast = htmlparser.parseDOM(fs.readFileSync(this.name).toString());

    domutils.findAll(shouldModify, this.ast).forEach(parseElem, this);

    return this;
};

var substitute = function () {
    this.marks.forEach(processElem, this);

    fs.writeFileSync(this.name, this.ast.map(domutils.getOuterHTML).join(''));

    return this;
};

module.exports = {
    '.html': {
        extract: extract,
        substitute: substitute
    }
};
