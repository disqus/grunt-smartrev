'use strict';

const fs = require('fs');

const parser = require('acorn').parse;
const walker = require('acorn/dist/walk').simple;
const builder = require('escodegen').generate;

const isStringLiteral = function (node) {
    return node.type === 'Literal' && typeof node.value === 'string';
};

const isStrConcatExpr = function (node) {
    const left = node.left;
    const right = node.right;

    return node.type === 'BinaryExpression' && node.operator === '+' && (
        (isStringLiteral(left) || isStrConcatExpr(left)) &&
            (isStringLiteral(right) || isStrConcatExpr(right))
        );
};

// Assumes node is either a string Literal or a strConcatExpression
const extractStr = function (node) {
    if (isStringLiteral(node))
        return node.value;

    return extractStr(node.left) + extractStr(node.right);
};

const isUrl = function (node) {
    // Turn off "arguments is a reserved word warnings:
    if (!node.arguments)
        return false;

    const callee = node.callee;
    let funcName = callee.name;
    let arg = node.arguments[0];
    let prop;

    if (!funcName) {
        if (callee.type !== 'MemberExpression')
            return false;

        // Special case for functionName.call calls
        if (callee.property.name === 'call') {
            prop = callee.object.property;
            funcName = callee.object.name || prop && (prop.name || prop.value);
            arg = node.arguments[1];  // skip context object
        } else {
            funcName = callee.property.name;
        }
    }

    if (funcName === 'geturl' && arg && (isStrConcatExpr(arg) || isStringLiteral(arg)))
        return arg;
};

const processNode = function (node) {
    // Replace "call expression" with a string literal (offline evaluation/macro)
    node.type = 'Literal';
    node.value = this.resolveAsHashedUrl(node.__url);
};

const extract = function () {
    const file = this;
    this.ast = parser(fs.readFileSync(this.name).toString(), { ecmaVersion: 6 });

    walker(this.ast, { 'CallExpression': function (node) {
        let url = isUrl(node);

        if (!url)
            return;

        // Store original, unresolved url ...
        url = extractStr(url);
        node.__url = url;

        url = file.resolve(url);

        if (!fs.existsSync(url))
            return;

        file.dependOn(file.tree.get(url));
        file.marks.push(node);
    } });

    return this;
};

const substitute = function () {
    this.marks.forEach(processNode, this);

    fs.writeFileSync(this.name, builder(this.ast));

    return this;
};

module.exports = {
    '.js': {
        extract: extract,
        substitute: substitute
    }
};
