/**
 * Stub for Three.js `examples/jsm/...` ESM add-ons (post-processing,
 * loaders, controls, exporters, ...). Used by Jest's `moduleNameMapper`
 * to short-circuit imports that the CommonJS loader can't parse.
 *
 * Each export is a class with the bare minimum surface our unit tests
 * touch: a constructor, common chainable methods, and a `dispose()` no-op.
 * If a specific test needs richer behaviour, extend this file or jest.mock
 * the dedicated path inside the test.
 */

class StubBase {
  constructor() {}
  setSize() {
    return this;
  }
  render() {
    return this;
  }
  addPass() {
    return this;
  }
  removePass() {
    return this;
  }
  dispose() {}
  load(_url, onLoad) {
    if (typeof onLoad === 'function') onLoad({});
    return Promise.resolve({});
  }
  parse(_data, onLoad) {
    if (typeof onLoad === 'function') onLoad({});
  }
  setPath() {
    return this;
  }
  setResourcePath() {
    return this;
  }
  setCrossOrigin() {
    return this;
  }
  setRequestHeader() {
    return this;
  }
  setWithCredentials() {
    return this;
  }
  setDRACOLoader() {
    return this;
  }
  setKTX2Loader() {
    return this;
  }
  setMeshoptDecoder() {
    return this;
  }
}

const wrap = (name) => {
  const cls = class extends StubBase {};
  Object.defineProperty(cls, 'name', { value: name });
  return cls;
};

// Add new exports here as more `examples/jsm` paths are imported.
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'default') return wrap('default');
      if (prop === '__esModule') return true;
      return wrap(prop);
    },
  }
);
