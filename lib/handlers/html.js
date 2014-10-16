/* jshint node: true */
/* global module, require */
'use strict';

var fs = require('fs');

var htmlparser = require('htmlparser2');
var domutils = htmlparser.DomUtils;

var URL_REGEX = /^([^?#\s)]+)([^)\s]*$)/ig;

var defaultAttributeChecker = function (elem, attrName) {
    var match = elem.attribs[attrName].match(URL_REGEX);
    var url = match && this.resolve(match[0]);

    if (!fs.existsSync(url))
        return false;

    this.dependOn(this.tree.get(url));

    return true;
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
            var urls = elem.attribs.srcset.split(',');

            return urls.some(function (urlish) {
                var parts = urlish.trim().split(' ');
                var match = parts[0].match(URL_REGEX);
                var url = match && this.resolve(match[0]);

                if (!fs.existsSync(url))
                    return false;

                this.dependOn(this.tree.get(url));

                return true;
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
