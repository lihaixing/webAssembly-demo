const assert = require("assert");
const myModule = require("../index");
assert.strictEqual(myModule.add(1, 2), 3);
console.log(myModule.add(1, 2))
console.log("ok");
