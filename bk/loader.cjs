// Webpack loader: the Bad Kids overlay for structs-webapp's client sources.
const {patch, upstreamPath} = require('./overlay.cjs');

module.exports = function bkLoader(source) {
  const rel = upstreamPath(this.resourcePath);
  const {code, stale, dependencies} = patch(rel, source);
  dependencies.forEach(file => this.addDependency(file));
  for (const text of stale) {
    this.emitWarning(new Error(`bk: ${rel} no longer contains ${JSON.stringify(text)}`));
  }
  return code;
};
