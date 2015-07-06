# gulp-ng-lang2js [![NPM version][npm-image]][npm-url] [![Dependency Status][depstat-image]][depstat-url]

> A [Gulp](https://github.com/wearefractal/gulp) plugin for use in the build process of AngularJS applications that
utilize [Angular Translate](https://angular-translate.github.io/)'s asynchronous partial loader feature. Use this plugin
to generate one or more language packs to ship with your application, by adding all of the partials for that language to
the [$translationCache](http://angular-translate.github.io/docs/#/api/pascalprecht.translate.$translationCache).

## Credit

This is a re-purposed version of [gulp-ng-html2js](https://www.npmjs.com/package/gulp-ng-html2js) by Mark Lagendijk,
which I also highly recommend for optimizing your Angular HTML templates. The code is almost identical, so much praise
should be sent Mark's way.

## Do I Need This?

Do you have an Angular app that uses [Angular Translate](https://angular-translate.github.io/) for i18n?

Yes? Great. You should keep reading.

Let's say you have a modular Angular app with a `src` directory structure like this:

```
/src
├── index.html
├── app.js
├── /view1
│   ├── /lang
│   │   ├── de.json
│   │   ├── en.json
│   │   ├── es.json
│   │   └── fr.json
│   ├── view1.css
│   ├── view1.html
│   └── view1.js
└── /view2
    ├── /lang
    │   ├── de.json
    │   ├── en.json
    │   ├── es.json
    │   └── fr.json
    ├── view2.css
    ├── view2.html
    └── view2.js
```

Now let's say you have a build task that copies your language files into a `/dist` directory like this:

```
/dist
├── index.html
├── app.js
└── /i18n
    ├── /view1
    │   └── lang
    │       ├── de.json
    │       ├── en.json
    │       ├── es.json
    │       └── fr.json
    └── /view2
        └── lang
            ├── de.json
            ├── en.json
            ├── es.json
            └── fr.json
```

You are using the [asynchronous partial loader](http://angular-translate.github.io/docs/#/guide/12_asynchronous-loading#asynchronous-loading_using-partialloader),
so your app has a configuration that looks something like this:

```
angular.module('app', ['pascalprecht.translate'])
	.config(translateConfig);
	
function translateConfig($translateProvider) {
	$translateProvider
		.fallbackLanguage('en')
		.preferredLanguage('en')
		.useLoader('$translatePartialLoader', {
			urlTemplate: 'i18n/{part}/lang/{lang}.json'
		})
		.useLoaderCache('$translationCache')
	;
}
```

To avoid the infamous [FOUC](http://angular-translate.github.io/docs/#/guide/12_asynchronous-loading#asynchronous-loading_fouc---flash-of-untranslated-content),
you want your application to ship with its default language loaded.

If that all sounds familiar, congratulations! This plugin is for you.

## Usage

First, install `gulp-ng-lang2js` as a development dependency:

```shell
npm install --save-dev gulp-ng-lang2js
```

For best results, you'll also want to install `gulp-concat` and `gulp-jsonminify`:

```shell
npm install --save-dev gulp-concat gulp-jsonminify
```

Then, sticking with the example above, add a task like this to your `gulpfile.js`:

```javascript
gulp.task('build-translation-cache', buildTranslationCache);

function buildTranslationCache() {
    var concat = require('gulp-concat');
    var jsonMinify = require('gulp-jsonminify');
    var ngLang2Js = require('gulp-ng-lang2js');

    return gulp.src('./src/app/**/en.json')
        .pipe(jsonMinify())
        .pipe(ngLang2Js({
            moduleName   : 'app.i18n',
            prefix       : 'i18n/'
        }))
        .pipe(concat('lang.js'))
        .pipe(gulp.dest('./dist/i18n'))
    ;
}
```

This would result in a single file being generated in your `dist/i18n` directory called `lang.js` that you could load in
your application's `index.html` file:

```html
<script type="text/javascript" src="app.js"></script>
<script type="text/javascript" src="i18n/lang.js"></script>
```

You can then include the `app.i18n` module as a dependency in your app:

```javascript
angular.module('app', ['pascalprecht.translate', 'app.i18n'])
	.config(translateConfig);
	
function translateConfig($translateProvider) {
	$translateProvider
		.fallbackLanguage('en')
		.preferredLanguage('en')
		.useLoader('$translatePartialLoader', {
			urlTemplate: 'i18n/{part}/lang/{lang}.json'
		})
		.useLoaderCache('$translationCache')
	;
}
```

...and you're good to go!

All of the partial files for the language you specified in `gulp.src()` have been added to `$translationCache`, so your
app will not suffer from the FOUC issue and your modular directory structure can remain in tact.

## Bonus Gulp Recipe: Configurable Languages

Want to make your gulp task include one or more languages that can be specified at build time? Try this:

```javascript
gulp.task('build-translation-cache', buildTranslationCache);

function buildTranslationCache() {
    var concat = require('gulp-concat');
    var defaultLanguage = 'en';
    var languages = globMultipleLanguages(process.env.LANGUAGES || defaultLanguage);
    var jsonMinify = require('gulp-jsonminify');
    var ngLang2Js = require('gulp-ng-lang2js');

    return gulp.src('./src/app/**/{' + languages + '}.json')
        .pipe(jsonMinify())
        .pipe(ngLang2Js({
            moduleName   : 'app.i18n',
            prefix       : 'i18n/'
        }))
        .pipe(concat('lang.js'))
        .pipe(gulp.dest('./dist/i18n'))
    ;
    
    function globMultipleLanguages(languages) {
    	return languages.split(',').length > 1 ? '{' + languages + '}' : languages;
    }
}
```

Then run the task with the node environment variable `LANGUAGES` set to a comma-separated list of language codes, like this:

```shell
LANGUAGES='en,sp' gulp build-translation-cache
```

That would include both English and Spanish languages in the build.

This is great if you want to have your app deployed on different servers for different regions, and want each app server
to include a version of the app pre-loaded with the language(s) most commonly used in those regions.

## API

### ngLang2Js(options)

#### options.moduleName

Type: `String` or `Function`

The name of the generated AngularJS module. Uses the file url if omitted.

When this is a function, the returned value will be the module name.  The function will be passed the vinyl file object so the module name can be determined from the path, content, last access time or any other property.  Returning `undefined` will fall back to the file url.

#### options.declareModule

Type: `Boolean`

Whether to attempt to declare a new module (used with options.moduleName).  True if omitted.

Set this to false if options.moduleName is already declared.

#### options.prefix

Type: `String`

The prefix which should be prepended to the file path to generate the file url.

#### options.stripPrefix

Type: `String`

The prefix which should be subtracted from the file path to generate the file url.

#### options.rename

Type: `Function`

A function that allows the generate file url to be manipulated. For example:

``` javascript
function (translationUrl, translationFile) {
  return translationUrl.replace('/lang', '/i18n');
}
```

#### options.template

Type: `String`

A custom Lodash template for generating the Javacript code. The template is called with the following params:

- moduleName: the resulting module name.
- template
    * url: the resulting template url.
    * content: the JSON content of the input file.
    * escapedContent: the escaped JSON content of the input file. Note: the JSON content is escaped for usage in a single quoted string.
    * prettyEscapedContent: the readable, escaped JSON content of the input file.
    
Example

``` javascript
{
  translation: "$translationCache.put('<%= translation.url %>', '<%= translation.escapedContent %>');"
}
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

[npm-url]: https://npmjs.org/package/gulp-ng-lang2js
[npm-image]: https://badge.fury.io/js/gulp-ng-lang2js.png

[depstat-url]: https://david-dm.org/marklagendijk/gulp-ng-lang2js
[depstat-image]: https://david-dm.org/marklagendijk/gulp-ng-lang2js.png
