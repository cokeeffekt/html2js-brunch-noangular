'use strict';

var minify = require('html-minifier').minify;
var pathUtils = require('path');
var fs = require('fs');

module.exports = function () {
  Html2Js.prototype.brunchPlugin = true;
  Html2Js.prototype.type = 'template';
  Html2Js.prototype.extension = 'tpl.html';

  Html2Js.prototype.compile = function (content, path, callback) {
    var options = this.options;
    var moduleName = normalizePath(pathUtils.relative(options.base, path));

    if (moduleName.indexOf('..') == -1) {
      this.moduleNames.push("'" + moduleName + "'");

      if (options.target === 'js') {
        return callback(null, compileTemplate(moduleName, content, options.quoteChar, options.indentString, options.useStrict, options.htmlmin));
      } else {
        return callback('Unknown target "' + options.target + '" specified');
      }
    }

    return callback(null, null);
  };

  Html2Js.prototype.onCompile = function (generatedFiles) {
    return false;
    var bundle = '';
    var options = this.options;
    var joinToKeys = Object.keys(this.joinTo);

    for (var i = 0; i < joinToKeys.length; i++) {
      var path = this.publicPath + pathUtils.sep + joinToKeys[i];
      var targetModule = pathUtils.basename(path, '.js');
      bundle = "templates = {}";
      if (options.target === 'js') {
        bundle += ';';
      }

      bundle += '\n\n';

      var fileContent = fs.readFileSync(path, {
        encoding: 'utf-8'
      });

      fs.writeFile(path, bundle.concat(fileContent), function (err) {
        if (err) throw err;
      });
    }
  };

  function Html2Js(cfg) {
    cfg = cfg || {};
    this.options = {
      base: 'src',
      quoteChar: '"',
      indentString: '  ',
      target: 'js',
      htmlmin: {}
    };
    this.joinTo = cfg.files ? cfg.files.templates.joinTo : null;
    this.publicPath = cfg.paths ? cfg.paths.public : null;
    this.moduleNames = [];

    var config = cfg.plugins && cfg.plugins.html2js;
    if (config) {
      var options = config.options || {};

      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this.options[key] = options[key];
        }
      }
    }
  };

  function escapeContent(content, quoteChar, indentString) {
    var bsRegexp = new RegExp('\\\\', 'g');
    var quoteRegexp = new RegExp('\\' + quoteChar, 'g');
    var nlReplace = '\\n' + quoteChar + ' +\n' + indentString + indentString + quoteChar;
    return content.replace(bsRegexp, '\\\\').replace(quoteRegexp, '\\' + quoteChar).replace(/\r?\n/g, nlReplace);
  }

  function normalizePath(p) {
    if (pathUtils.sep !== '/') {
      p = p.replace(/\\/g, '/');
    }
    return p;
  }

  function getContent(content, quoteChar, indentString, htmlmin) {
    if (Object.keys(htmlmin).length) {
      var optionArray = [];
      for (var i in htmlmin) {
        optionArray.push([i, htmlmin[i]]);
      }

      content = minify(content, optionArray);
    }

    return escapeContent(content, quoteChar, indentString);
  }

  function compileTemplate(moduleName, content, quoteChar, indentString, useStrict, htmlmin, process) {
    var contentModified = getContent(content, quoteChar, indentString, htmlmin, process);
    var doubleIndent = indentString + indentString;
    var strict = (useStrict) ? indentString + quoteChar + 'use strict' + quoteChar + ';\n' : '';

    var module = "module.exports = " + quoteChar + contentModified + quoteChar + ';\n\n';

    return module;
  }

  return Html2Js;
}();
