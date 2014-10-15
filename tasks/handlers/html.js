/* jshint node: true */
/* global module, require */
'use strict';

var fs = require('fs');

var htmlparser = require('htmlparser2');
var domutils = htmlparser.DomUtils;

var ATTRIBS_TO_CHECK = ['src', 'href'];
var URL_REGEX = /^([^?#)]+)([^)]*$)/ig;

var shouldModify = function (elem) {
    var attribChecker = domutils.hasAttrib.bind(domutils, elem);
    return elem.attribs && ATTRIBS_TO_CHECK.some(attribChecker);
};

var parseElem = function (elem) {
    var attribChecker = domutils.hasAttrib.bind(domutils, elem);
    var attrName = ATTRIBS_TO_CHECK.filter(attribChecker).shift();
    var match = elem.attribs[attrName].match(URL_REGEX);
    var url = match && this.resolve(match[0]);

    if (!fs.existsSync(url))
        return;

    elem.__attrName = attrName;
    this.dependOn(this.tree.get(url));
    this.marks.push(elem);
};

var processElem = function (elem) {
    var node = this;
    var baseUrl = this.tree.baseUrl ? this.tree.baseUrl + '/' : '';

    var attrName = elem.__attrName;
    elem.attribs[attrName] = elem.attribs[attrName].replace(URL_REGEX, function (match, url, query) {
        return baseUrl + node.resolveAsHashedUrl(url) + query;
    });
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
