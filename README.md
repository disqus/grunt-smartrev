# grunt-smartrev [![Build Status](https://travis-ci.org/disqus/grunt-smartrev.png?branch=master)](https://travis-ci.org/disqus/grunt-smartrev) [![NPM version](https://badge.fury.io/js/grunt-smartrev.png)](http://badge.fury.io/js/grunt-smartrev)

> A "smart" file versioner for production environments which takes inter-file dependencies into account automatically.

Takes a directory tree like this:

```
build
 |- index.html
 |- app.js
 |- deferred.js
 |- styles.css
 |- logo.png
 ```

Converts it into the following:

```
build
 |- index.html
 |- app.0f278ffd46a4687731ccad34403db8f9.js
 |- deferred.2cf007ff23e7b3dc8df55e05949abb83.js
 |- styles.84b6cd3d11e54bb8da24e6730ab64c98.css
 |- logo.cc01729f517ff39cfb928546ee06f184.png
```

Then modifies your application's source code to point to the new, versioned files.

## File references in source code

smartrev substitutes file references in HTML, JavaScript, and CSS.

### HTML

In HTML files, smartrev substitutes `href` and `src` attributes.


```html
<!-- Before -->
<link href="build/styles.css" rel="stylesheet" type="text/css"/>
<script src="build/app.js"></script>

<!-- After -->
<link href="build/styles.84b6cd3d11e54bb8da24e6730ab64c98.css" type="text/css" rel="stylesheet"/>
<script src="build/app.0f278ffd46a4687731ccad34403db8f9.js"></script>
```

### JavaScript

In JavaScript files, smartrev substitutes any path strings called by a pseudo-global `geturl` function.

This function doesn't actually exist; it is just used to tag strings for substitution, and is removed by the plugin afterwards.

```js
// Before
var script = document.createElement('script');
script.src = geturl('build/deferred.js');
document.head.appendChild(script);

// After
var script = document.createElement('script');
script.src = 'build/deferred.2cf007ff23e7b3dc8df55e05949abb83.js';
document.head.appendChild(script);
```

### CSS

In CSS files, smartrev substitutes any path strings found inside the `url()` declaration.

```css
/* Before */
.logo {
    background: url(build/logo.png) no-repeat;
}

/* After */
.logo {
    background: url(build/logo.cc01729f517ff39cfb928546ee06f184.png) no-repeat;
}
```

## Inter-file dependencies

smartrev considers inter-file dependencies when generating revisions for each file.

Consider this example of a CSS file and two PNG files that were previously modified/renamed by smartrev:

```css
/* styles.334e21d7c11d250e9ccc0c17eb8ba499.css */
.a {
    background: url(a.f51946af45e0b561c60f768335c9eb79.png);
}
.b {
    background: url(b.b47581f5ba4a76da649c1fe5a6b68775.png);
}
```

Let's say you modify `a.png`. As a result, it has a new revision, and running the smartrev task again yields the following:

```css
/* styles.fef7511f24fecec4c030b035c7019143.css (NEW) */
.a {
    background: url(a.5a88b4a157baf9f23f9f4e3e68b4e394.png); /* NEW */
}
.b {
    background: url(b.b47581f5ba4a76da649c1fe5a6b68775.png); /* unchanged */
}
```

Notice that not only did `a.png` get a new revision, so did the file that referenced it: `styles.css`. This has to happen, because if `styles.css` doesn't get a new revision, users will download the old `styles.css` that still points to the old version of `a.png`.

To do this, smartrev generates a full dependency tree of your source files based on the URL substitution patterns documented above. If a fourth file referenced `styles.css`, it too would get a new revision, and so on.

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
    }
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
25-02-2014 | Simplified README
01-02-2014 | Initial Release
