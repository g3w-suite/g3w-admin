/**
 * Based on: https://github.com/FranckFreiburger/http-vue-loader/tree/v1.4.2/src/httpVueLoader.js
 */
(function umd(root, factory) {
  if (typeof module === 'object' && typeof exports === 'object')
    module.exports = factory()
  else if (typeof define === 'function' && define.amd)
    define([], factory)
  else
    root.httpVueLoader = factory()
})(this, function factory() {
  'use strict';

  let scopeIndex = 0;

  class Component {
    constructor(name) {
      this.name = name;
      this.template = null;
      this.script = null;
      this.styles = [];
      this._scopeId = '';
    }
    getHead() {
      return document.head || document.getElementsByTagName('head')[0];
    }
    getScopeId() {
      if ('' === this._scopeId) {
        this._scopeId = 'data-s-' + (scopeIndex++).toString(36);
        this.template.getRootElt().setAttribute(this._scopeId, '');
      }
      return this._scopeId;
    }
    async load(url) {
      const text = await httpVueLoader.httpRequest(url);
      this.baseURI = url.substr(0, url.lastIndexOf('/') + 1);
      const doc = document.implementation.createHTMLDocument('');
      // IE requires the <base> to come with <style>
      doc.body.innerHTML = (this.baseURI ? '<base href="' + this.baseURI + '">' : '') + text;
      for (let it = doc.body.firstChild; it; it = it.nextSibling) {
        switch (it.nodeName) {
          case 'TEMPLATE': this.template = new TemplateContext(this, it); break;
          case 'SCRIPT': this.script = new ScriptContext(this, it); break;
          case 'STYLE': this.styles.push(new StyleContext(this, it)); break;
        }
      }
      return this;
    }
    _normalizeSection(ctx) {
      let p;
      if (ctx === null || !ctx.elt.hasAttribute('src')) {
        p = Promise.resolve(null);
      } else {
        p = httpVueLoader.httpRequest(ctx.elt.getAttribute('src')).then(function (content) { ctx.elt.removeAttribute('src'); return content; });
      }
      return p
        .then(content => {
          if (ctx !== null && ctx.elt.hasAttribute('lang')) {
            const lang = ctx.elt.getAttribute('lang').toLowerCase();
            ctx.elt.removeAttribute('lang');
            return (httpVueLoader.langProcessor[lang] || (v => v)).call(this, content === null ? ctx.getContent() : content);
          }
          return content;
        })
        .then(function (content) {
          if (content !== null) ctx.setContent(content);
        });
    }

    async normalize() {
      await Promise.all(Array.prototype.concat(
        this._normalizeSection(this.template),
        this._normalizeSection(this.script),
        this.styles.map(this._normalizeSection)
      ));
      return this;
    }
    async compile() {
      await Promise.all(Array.prototype.concat(
        this.template && this.template.compile(),
        this.script && this.script.compile(),
        this.styles.map(function (style) { return style.compile(); })
      ));
      return this;
    }
  }

  class StyleContext {
    constructor(c, el) {
      this.component = c;
      this.elt = el;
    }
    withBase(cb) {
      let base;
      // firefox and chrome need the <base> to be set while inserting or modifying <style> in a document.
      if (this.component.baseURI) {
        base = document.createElement('base');
        base.href = this.component.baseURI;
        const head = this.component.getHead();
        head.insertBefore(base, head.firstChild);
      }
      cb.call(this);
      if (base) this.component.getHead().removeChild(base);
    }
    scopeStyles(el, name) {
      // firefox may fail sheet.cssRules with InvalidAccessError
      try {
        process(el, name);
      } catch (ex) {
        if (ex instanceof DOMException && ex.code === DOMException.INVALID_ACCESS_ERR) {
          el.sheet.disabled = true;
          el.addEventListener('load', function onStyleLoaded() {
            el.removeEventListener('load', onStyleLoaded);
            // firefox need this timeout otherwise we have to use document.importNode(style, true)
            setTimeout(function () { process(el, name); el.sheet.disabled = false; });
          });
          return;
        }
        throw ex;
      }
    }
    compile() {
      const scoped = this.elt.hasAttribute('scoped');
      // no template, no scopable style needed
      if (scoped && null === this.template) return;
      // firefox does not tolerate this attribute
      if (scoped) this.elt.removeAttribute('scoped');
      this.withBase(function () { this.component.getHead().appendChild(this.elt); });
      if (scoped) this.scopeStyles(this.elt, '[' + this.component.getScopeId() + ']');
      return Promise.resolve();
    }
    getContent() {
      return this.elt.textContent;
    }
    setContent(content) {
      this.withBase(function () { this.elt.textContent = content; });
    }
  }

  class ScriptContext {
    constructor(c, el) {
      this.component = c;
      this.elt = el;
      this.module = { exports: {} };
    }
    getContent() {
      return this.elt.textContent;
    }
    setContent(content) {
      this.elt.textContent = content;
    }
    compile(module) {
      try {
        Function('exports', 'require', 'httpVueLoader', 'module', this.getContent()).call(
          this.module.exports,
          this.module.exports,
          (childURL) => httpVueLoader.require(resolveURL(this.component.baseURI, childURL)),               // child module require
          (childURL, childName) => httpVueLoader(resolveURL(this.component.baseURI, childURL), childName), // child loader
          this.module,
        );
      } catch (ex) {
        if (!('lineNumber' in ex)) {
          return Promise.reject(ex);
        }
        const vueFile = responseText.replace(/\r?\n/g, '\n');
        throw new (ex.constructor)(ex.message, url, /* lineNubmer */ vueFile.substr(0, vueFile.indexOf(script)).split('\n').length + ex.lineNumber - 1);
      }
      return Promise.resolve(this.module.exports)
        .then((httpVueLoader.scriptExportsHandler || (v => v)).bind(this))
        .then(exports => { this.module.exports = exports; });
    }
  }

  class TemplateContext {
    constructor(component, elt) {
      this.component = component;
      this.elt = elt;
    }
    getContent() {
      return this.elt.innerHTML;
    }
    setContent(content) {
      this.elt.innerHTML = content;
    }
    getRootElt() {
      let el = this.elt.content || this.elt;
      if ('firstElementChild' in el) return el.firstElementChild;
      for (el = tplElt.firstChild; el !== null; el = el.nextSibling)
        if (el.nodeType === Node.ELEMENT_NODE) return el;
      return null;
    }
    compile() {
      return Promise.resolve();
    }
  }

  function parseComponentURL(url) {
    const comp = url.match(/(.*?)([^/]+?)\/?(\.vue)?(\?.*|#.*|$)/);
    return {
      name: comp[2],
      url: comp[1] + comp[2] + (comp[3] === undefined ? '/index.vue' : comp[3]) + comp[4]
    };
  }

  function resolveURL(baseURL, url) {
    if (url.substr(0, 2) === './' || url.substr(0, 3) === '../') {
      return baseURL + url;
    }
    return url;
  }

  function process(styleElt, scopeName) {
    const sheet = styleElt.sheet;
    const rules = sheet.cssRules;
    for (let i = 0; i < rules.length; ++i) {
      const rule = rules[i];
      if (rule.type !== 1) continue;
      const scoped = []; // scoped selectors
      rule.selectorText.split(/\s*,\s*/).forEach(function (sel) {
        scoped.push(scopeName + ' ' + sel);
        const segments = sel.match(/([^ :]+)(.+)?/);
        scoped.push(segments[1] + scopeName + (segments[2] || ''));
      });
      const scopedRule = scoped.join(',') + rule.cssText.substr(rule.selectorText.length);
      sheet.deleteRule(i);
      sheet.insertRule(scopedRule, i);
    }
  }

  httpVueLoader.load = function (url, name) {
    return async function () {
      const c = (await (await (await new Component(name).load(url)).normalize()).compile());
      const exports = null !== c.script ? c.script.module.exports : {};
      if (c.template !== null) exports.template = c.template.getContent();
      if (exports.name === undefined && c.name !== undefined) exports.name = c.name;
      exports._baseURI = c.baseURI;
      return exports;
    };
  };

  httpVueLoader.register = function (Vue, url) {
    const c = parseComponentURL(url);
    Vue.component(c.name, httpVueLoader.load(c.url));
  };

  httpVueLoader.install = function (Vue) {
    Vue.mixin({
      beforeCreate: function () {
        const components = this.$options.components;
        for (let name in components) {
          if (typeof (components[name]) === 'string' && components[name].substr(0, 4) === 'url:') {
            const c = parseComponentURL(components[name].substr(4));
            const componentURL = ('_baseURI' in this.$options) ? resolveURL(this.$options._baseURI, c.url) : c.url;
            components[name] = isNaN(name) ? httpVueLoader.load(componentURL, name) : Vue.component(c.name, httpVueLoader.load(componentURL, c.name));
          }
        }
      }
    });
  };

  httpVueLoader.require = function (moduleName) {
    return window[moduleName];
  };

  httpVueLoader.httpRequest = function (url) {
    return fetch(url).then(response => {
      if (response.status >= 200 && response.status < 300) return response.text();
      throw new Error(response.status);
    });
  };

  function httpVueLoader(url, name) {
    return httpVueLoader.load(parseComponentURL(url).url, name);
  }

  return httpVueLoader;
});