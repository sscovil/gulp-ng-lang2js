var _ = require("lodash");
var gutil = require("gulp-util");
var map = require("map-stream");

var TRANSLATIONS = {
    MODULE_PER_FILE: "angular.module('<%= moduleName %>', []).run(['$translationCache', function($translationCache) {\n" +
    "  $translationCache.put('<%= translation.url %>',\n    '<%= translation.prettyEscapedContent %>');\n" +
    "}]);\n",

    SINGLE_MODULE: "(function(module) {\n" +
    "try {\n" +
    "  module = angular.module('<%= moduleName %>');\n" +
    "} catch (e) {\n" +
    "  module = angular.module('<%= moduleName %>', []);\n" +
    "}\n" +
    "module.run(['$translationCache', function($translationCache) {\n" +
    "  $translationCache.put('<%= translation.url %>',\n    '<%= translation.prettyEscapedContent %>');\n" +
    "}]);\n" +
    "})();\n",

    SINGLE_DECLARED_MODULE: "angular.module('<%= moduleName %>').run(['$translationCache', function($translationCache) {\n" +
    "  $translationCache.put('<%= translation.url %>',\n    '<%= translation.prettyEscapedContent %>');\n" +
    "}]);\n"
};

/**
 * Converts JSON language files into Javascript files which contain an AngularJS module which automatically pre-loads the JSON file
 * into the [$translationCache](http://angular-translate.github.io/docs/#/api/pascalprecht.translate.$translationCache). This way
 * AngularJS doens't need to request the actual JSON file anymore.
 * @param [options] - The plugin options
 * @param [options.moduleName] - The name of the module which will be generated. When omitted the fileUrl will be used.
 * @param [options.declareModule] - Whether to try to create the module. Default true, if false it will not create options.moduleName.
 * @param [options.stripPrefix] - The prefix which should be stripped from the file path
 * @param [options.prefix] - The prefix which should be added to the start of the url
 * @returns {stream}
 */
module.exports = function (options) {
    "use strict";

    function ngLang2Js(file, callback) {
        if (file.isStream()) {
            return callback(new Error("gulp-ng-lang2js: Streaming not supported"));
        }

        if (file.isBuffer()) {
            file.contents = new Buffer(generateModuleDeclaration(file, options));
            file.path = gutil.replaceExtension(file.path, ".js");
        }

        return callback(null, file);
    }

    function generateModuleDeclaration(translationFile, options) {
        var translation = getTranslation();
        var translationParams = getTranslationParams();

        return _.template(translation)(translationParams);


        function getTranslation() {
            if (options && options.translation) {
                return options.translation;
            }
            else if (options && options.moduleName) {
                if (options.declareModule === false) {
                    return TRANSLATIONS.SINGLE_DECLARED_MODULE;
                }
                else {
                    return TRANSLATIONS.SINGLE_MODULE;
                }
            }
            else {
                return TRANSLATIONS.MODULE_PER_FILE;
            }
        }

        function getTranslationParams() {
            var params = {
                translation: {
                    url: getTranslationUrl()
                }
            };
            params.moduleName = getModuleName(params.translation.url);
            params.translation.content = String(translationFile.contents);
            params.translation.escapedContent = getEscapedTranslationContent(params.translation.content);
            params.translation.prettyEscapedContent = getPrettyEscapedContent(params.translation.content);

            return params;
        }

        function getModuleName(translationUrl) {
            if (options && _.isFunction(options.moduleName)) {
                return options.moduleName(translationFile);
            }
            else if (options && options.moduleName) {
                return options.moduleName;
            }
            else {
                return translationUrl;
            }
        }

        function getTranslationUrl() {
            // Start with the relative file path
            var url = translationFile.relative;

            // Replace '\' with '/' (Windows)
            url = url.replace(/\\/g, "/");

            if (options) {
                // Remove the stripPrefix
                if (_.startsWith(url, options.stripPrefix)) {
                    url = url.replace(options.stripPrefix, "");
                }
                // Add the prefix
                if (options.prefix) {
                    url = options.prefix + url;
                }

                // Rename the url
                if (_.isFunction(options.rename)) {
                    url = options.rename(url, translationFile);
                }
            }

            return url;
        }
    }

    function getEscapedTranslationContent(translationContent) {
        return translationContent
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, "\\n");
    }

    function getPrettyEscapedContent(translationContent) {
        return translationContent
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, "\\n' +\n    '");
    }

    return map(ngLang2Js);
};
