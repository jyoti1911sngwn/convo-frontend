// src/shims/empty.js
module.exports = function () { return {}; };
module.exports.prototype = {};
// ^ prevents prototype errors when code does Object.create(something.prototype)