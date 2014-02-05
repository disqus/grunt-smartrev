# grunt-smartrev [![Build Status](https://travis-ci.org/disqus/grunt-smartrev.png?branch=master)](https://travis-ci.org/disqus/grunt-smartrev)

> A "smart" file versioner for production environments which takes inter-file dependencies into account automatically.

Takes a directory tree like this:

```
build
 |- external.html
 |- logo.png
 |- test.css
 |- test.html
 |- test.js
```

And converts that into the following, automatically:

```
build
 |- external.7cd6384e1bb3885ede04bc7ef7d87c1b.html
 |- logo.0f278ffd46a4687731ccad34403db8f9.png
 |- test.2cf007ff23e7b3dc8df55e05949abb83.html
 |- test.84b6cd3d11e54bb8da24e6730ab64c98.css
 |- test.cc01729f517ff39cfb928546ee06f184.js
```

References to URLs in code are automatically substituted for you.

In HTML files, it automatically locates and substitutes `href` and `src` attributes. In CSS files, the universal `url()` declaration is used and substituted. And in JavaScript files, a pseudo function named `geturl` is used:

```js
var cssURL = geturl('test.css');
var logoURL = geturl('logo.png');
```

becomes:

```js
var cssURL = 'test.84b6cd3d11e54bb8da24e6730ab64c98.css';
var logoURL = 'logo.0f278ffd46a4687731ccad34403db8f9.png';
```

*Note: grunt-smartrev cannot handle cross-dependencies where two file both reference each other in a circular fashion, yet.*

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-smartrev --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-smartrev');
```

## The "smartrev" task

### Overview
In your project's Gruntfile, add a section named `smartrev` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
    smartrev: {
        options: {
            cwd: 'build',
            baseUrl: '//s3.amazon.com/mysite/mybucket',
            noRename: ['index.html', 'bootstrap.js'],
        },
        dist: {
            src: [
                '*.css',
                '*.html',
                '*.js',
            ],
            // Save the generated dependency tree and file hash information (optional)
            dest: 'stats.json',
        },
});
```

### Options

#### options.cwd
Type: `String`
Default value: `'.'`

The directory where smartrev should work inside. Should be your build directory.

#### options.baseUrl
Type: `String`
Default value: `''`

The base url to prepend to the generated urls/paths. Most probably should be your CDN's base url.

#### options.noRename
Type: `String[]`
Default value: `[]`

List of file patterns that should **not be renamed**, such as your `index.html` file.

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using JSHint and [Grunt](http://gruntjs.com/).

## Release History

Date       | Changes
-----------|--------
01-02-2014 | Initial Release
