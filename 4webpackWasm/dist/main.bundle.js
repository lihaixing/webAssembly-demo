/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@assemblyscript/loader/index.js":
/*!******************************************************!*\
  !*** ./node_modules/@assemblyscript/loader/index.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports) => {



// Runtime header offsets
const ID_OFFSET = -8;
const SIZE_OFFSET = -4;

// Runtime ids
const ARRAYBUFFER_ID = 0;
const STRING_ID = 1;
// const ARRAYBUFFERVIEW_ID = 2;

// Runtime type information
const ARRAYBUFFERVIEW = 1 << 0;
const ARRAY = 1 << 1;
const STATICARRAY = 1 << 2;
// const SET = 1 << 3;
// const MAP = 1 << 4;
const VAL_ALIGN_OFFSET = 6;
// const VAL_ALIGN = 1 << VAL_ALIGN_OFFSET;
const VAL_SIGNED = 1 << 11;
const VAL_FLOAT = 1 << 12;
// const VAL_NULLABLE = 1 << 13;
const VAL_MANAGED = 1 << 14;
// const KEY_ALIGN_OFFSET = 15;
// const KEY_ALIGN = 1 << KEY_ALIGN_OFFSET;
// const KEY_SIGNED = 1 << 20;
// const KEY_FLOAT = 1 << 21;
// const KEY_NULLABLE = 1 << 22;
// const KEY_MANAGED = 1 << 23;

// Array(BufferView) layout
const ARRAYBUFFERVIEW_BUFFER_OFFSET = 0;
const ARRAYBUFFERVIEW_DATASTART_OFFSET = 4;
const ARRAYBUFFERVIEW_DATALENGTH_OFFSET = 8;
const ARRAYBUFFERVIEW_SIZE = 12;
const ARRAY_LENGTH_OFFSET = 12;
const ARRAY_SIZE = 16;

const BIGINT = typeof BigUint64Array !== "undefined";
const THIS = Symbol();
const CHUNKSIZE = 1024;

/** Gets a string from an U32 and an U16 view on a memory. */
function getStringImpl(buffer, ptr) {
  const U32 = new Uint32Array(buffer);
  const U16 = new Uint16Array(buffer);
  let length = U32[(ptr + SIZE_OFFSET) >>> 2] >>> 1;
  let offset = ptr >>> 1;
  if (length <= CHUNKSIZE) return String.fromCharCode.apply(String, U16.subarray(offset, offset + length));
  const parts = [];
  do {
    const last = U16[offset + CHUNKSIZE - 1];
    const size = last >= 0xD800 && last < 0xDC00 ? CHUNKSIZE - 1 : CHUNKSIZE;
    parts.push(String.fromCharCode.apply(String, U16.subarray(offset, offset += size)));
    length -= size;
  } while (length > CHUNKSIZE);
  return parts.join("") + String.fromCharCode.apply(String, U16.subarray(offset, offset + length));
}

/** Prepares the base module prior to instantiation. */
function preInstantiate(imports) {
  const extendedExports = {};

  function getString(memory, ptr) {
    if (!memory) return "<yet unknown>";
    return getStringImpl(memory.buffer, ptr);
  }

  // add common imports used by stdlib for convenience
  const env = (imports.env = imports.env || {});
  env.abort = env.abort || function abort(msg, file, line, colm) {
    const memory = extendedExports.memory || env.memory; // prefer exported, otherwise try imported
    throw Error("abort: " + getString(memory, msg) + " at " + getString(memory, file) + ":" + line + ":" + colm);
  };
  env.trace = env.trace || function trace(msg, n) {
    const memory = extendedExports.memory || env.memory;
    console.log("trace: " + getString(memory, msg) + (n ? " " : "") + Array.prototype.slice.call(arguments, 2, 2 + n).join(", "));
  };
  env.seed = env.seed || function seed() {
    return Date.now();
  };
  imports.Math = imports.Math || Math;
  imports.Date = imports.Date || Date;

  return extendedExports;
}

/** Prepares the final module once instantiation is complete. */
function postInstantiate(extendedExports, instance) {
  const exports = instance.exports;
  const memory = exports.memory;
  const table = exports.table;
  const alloc = exports["__alloc"];
  const retain = exports["__retain"];
  const rttiBase = exports["__rtti_base"] || ~0; // oob if not present

  /** Gets the runtime type info for the given id. */
  function getInfo(id) {
    const U32 = new Uint32Array(memory.buffer);
    const count = U32[rttiBase >>> 2];
    if ((id >>>= 0) >= count) throw Error("invalid id: " + id);
    return U32[(rttiBase + 4 >>> 2) + id * 2];
  }

  /** Gets the runtime base id for the given id. */
  function getBase(id) {
    const U32 = new Uint32Array(memory.buffer);
    const count = U32[rttiBase >>> 2];
    if ((id >>>= 0) >= count) throw Error("invalid id: " + id);
    return U32[(rttiBase + 4 >>> 2) + id * 2 + 1];
  }

  /** Gets the runtime alignment of a collection's values. */
  function getValueAlign(info) {
    return 31 - Math.clz32((info >>> VAL_ALIGN_OFFSET) & 31); // -1 if none
  }

  /** Gets the runtime alignment of a collection's keys. */
  // function getKeyAlign(info) {
  //   return 31 - Math.clz32((info >>> KEY_ALIGN_OFFSET) & 31); // -1 if none
  // }

  /** Allocates a new string in the module's memory and returns its retained pointer. */
  function __allocString(str) {
    const length = str.length;
    const ptr = alloc(length << 1, STRING_ID);
    const U16 = new Uint16Array(memory.buffer);
    for (var i = 0, p = ptr >>> 1; i < length; ++i) U16[p + i] = str.charCodeAt(i);
    return ptr;
  }

  extendedExports.__allocString = __allocString;

  /** Reads a string from the module's memory by its pointer. */
  function __getString(ptr) {
    const buffer = memory.buffer;
    const id = new Uint32Array(buffer)[ptr + ID_OFFSET >>> 2];
    if (id !== STRING_ID) throw Error("not a string: " + ptr);
    return getStringImpl(buffer, ptr);
  }

  extendedExports.__getString = __getString;

  /** Gets the view matching the specified alignment, signedness and floatness. */
  function getView(alignLog2, signed, float) {
    const buffer = memory.buffer;
    if (float) {
      switch (alignLog2) {
        case 2: return new Float32Array(buffer);
        case 3: return new Float64Array(buffer);
      }
    } else {
      switch (alignLog2) {
        case 0: return new (signed ? Int8Array : Uint8Array)(buffer);
        case 1: return new (signed ? Int16Array : Uint16Array)(buffer);
        case 2: return new (signed ? Int32Array : Uint32Array)(buffer);
        case 3: return new (signed ? BigInt64Array : BigUint64Array)(buffer);
      }
    }
    throw Error("unsupported align: " + alignLog2);
  }

  /** Allocates a new array in the module's memory and returns its retained pointer. */
  function __allocArray(id, values) {
    const info = getInfo(id);
    if (!(info & (ARRAYBUFFERVIEW | ARRAY | STATICARRAY))) throw Error("not an array: " + id + ", flags= " + info);
    const align = getValueAlign(info);
    const length = values.length;
    const buf = alloc(length << align, info & STATICARRAY ? id : ARRAYBUFFER_ID);
    let result;
    if (info & STATICARRAY) {
      result = buf;
    } else {
      const arr = alloc(info & ARRAY ? ARRAY_SIZE : ARRAYBUFFERVIEW_SIZE, id);
      const U32 = new Uint32Array(memory.buffer);
      U32[arr + ARRAYBUFFERVIEW_BUFFER_OFFSET >>> 2] = retain(buf);
      U32[arr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2] = buf;
      U32[arr + ARRAYBUFFERVIEW_DATALENGTH_OFFSET >>> 2] = length << align;
      if (info & ARRAY) U32[arr + ARRAY_LENGTH_OFFSET >>> 2] = length;
      result = arr;
    }
    const view = getView(align, info & VAL_SIGNED, info & VAL_FLOAT);
    if (info & VAL_MANAGED) {
      for (let i = 0; i < length; ++i) view[(buf >>> align) + i] = retain(values[i]);
    } else {
      view.set(values, buf >>> align);
    }
    return result;
  }

  extendedExports.__allocArray = __allocArray;

  /** Gets a live view on an array's values in the module's memory. Infers the array type from RTTI. */
  function __getArrayView(arr) {
    const U32 = new Uint32Array(memory.buffer);
    const id = U32[arr + ID_OFFSET >>> 2];
    const info = getInfo(id);
    if (!(info & (ARRAYBUFFERVIEW | ARRAY | STATICARRAY))) throw Error("not an array: " + id + ", flags=" + info);
    const align = getValueAlign(info);
    let buf = info & STATICARRAY
      ? arr
      : U32[arr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2];
    const length = info & ARRAY
      ? U32[arr + ARRAY_LENGTH_OFFSET >>> 2]
      : U32[buf + SIZE_OFFSET >>> 2] >>> align;
    return getView(align, info & VAL_SIGNED, info & VAL_FLOAT).subarray(buf >>>= align, buf + length);
  }

  extendedExports.__getArrayView = __getArrayView;

  /** Copies an array's values from the module's memory. Infers the array type from RTTI. */
  function __getArray(arr) {
    const input = __getArrayView(arr);
    const len = input.length;
    const out = new Array(len);
    for (let i = 0; i < len; i++) out[i] = input[i];
    return out;
  }

  extendedExports.__getArray = __getArray;

  /** Copies an ArrayBuffer's value from the module's memory. */
  function __getArrayBuffer(ptr) {
    const buffer = memory.buffer;
    const length = new Uint32Array(buffer)[ptr + SIZE_OFFSET >>> 2];
    return buffer.slice(ptr, ptr + length);
  }

  extendedExports.__getArrayBuffer = __getArrayBuffer;

  /** Copies a typed array's values from the module's memory. */
  function getTypedArray(Type, alignLog2, ptr) {
    return new Type(getTypedArrayView(Type, alignLog2, ptr));
  }

  /** Gets a live view on a typed array's values in the module's memory. */
  function getTypedArrayView(Type, alignLog2, ptr) {
    const buffer = memory.buffer;
    const U32 = new Uint32Array(buffer);
    const bufPtr = U32[ptr + ARRAYBUFFERVIEW_DATASTART_OFFSET >>> 2];
    return new Type(buffer, bufPtr, U32[bufPtr + SIZE_OFFSET >>> 2] >>> alignLog2);
  }

  /** Attach a set of get TypedArray and View functions to the exports. */
  function attachTypedArrayFunctions(ctor, name, align) {
    extendedExports["__get" + name] = getTypedArray.bind(null, ctor, align);
    extendedExports["__get" + name + "View"] = getTypedArrayView.bind(null, ctor, align);
  }

  [
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array
  ].forEach(ctor => {
    attachTypedArrayFunctions(ctor, ctor.name, 31 - Math.clz32(ctor.BYTES_PER_ELEMENT));
  });

  if (BIGINT) {
    [BigUint64Array, BigInt64Array].forEach(ctor => {
      attachTypedArrayFunctions(ctor, ctor.name.slice(3), 3);
    });
  }

  /** Tests whether an object is an instance of the class represented by the specified base id. */
  function __instanceof(ptr, baseId) {
    const U32 = new Uint32Array(memory.buffer);
    let id = U32[(ptr + ID_OFFSET) >>> 2];
    if (id <= U32[rttiBase >>> 2]) {
      do {
        if (id == baseId) return true;
        id = getBase(id);
      } while (id);
    }
    return false;
  }

  extendedExports.__instanceof = __instanceof;

  // Pull basic exports to extendedExports so code in preInstantiate can use them
  extendedExports.memory = extendedExports.memory || memory;
  extendedExports.table  = extendedExports.table  || table;

  // Demangle exports and provide the usual utility on the prototype
  return demangle(exports, extendedExports);
}

function isResponse(src) {
  return typeof Response !== "undefined" && src instanceof Response;
}

function isModule(src) {
  return src instanceof WebAssembly.Module;
}

/** Asynchronously instantiates an AssemblyScript module from anything that can be instantiated. */
async function instantiate(source, imports = {}) {
  if (isResponse(source = await source)) return instantiateStreaming(source, imports);
  const module = isModule(source) ? source : await WebAssembly.compile(source);
  const extended = preInstantiate(imports);
  const instance = await WebAssembly.instantiate(module, imports);
  const exports = postInstantiate(extended, instance);
  return { module, instance, exports };
}

exports.instantiate = instantiate;

/** Synchronously instantiates an AssemblyScript module from a WebAssembly.Module or binary buffer. */
function instantiateSync(source, imports = {}) {
  const module = isModule(source) ? source : new WebAssembly.Module(source);
  const extended = preInstantiate(imports);
  const instance = new WebAssembly.Instance(module, imports);
  const exports = postInstantiate(extended, instance);
  return { module, instance, exports };
}

exports.instantiateSync = instantiateSync;

/** Asynchronously instantiates an AssemblyScript module from a response, i.e. as obtained by `fetch`. */
async function instantiateStreaming(source, imports = {}) {
  if (!WebAssembly.instantiateStreaming) {
    return instantiate(
      isResponse(source = await source)
        ? source.arrayBuffer()
        : source,
      imports
    );
  }
  const extended = preInstantiate(imports);
  const result = await WebAssembly.instantiateStreaming(source, imports);
  const exports = postInstantiate(extended, result.instance);
  return { ...result, exports };
}

exports.instantiateStreaming = instantiateStreaming;

/** Demangles an AssemblyScript module's exports to a friendly object structure. */
function demangle(exports, extendedExports = {}) {
  extendedExports = Object.create(extendedExports);
  const setArgumentsLength = exports["__argumentsLength"]
    ? length => { exports["__argumentsLength"].value = length; }
    : exports["__setArgumentsLength"] || exports["__setargc"] || (() => { /* nop */ });
  for (let internalName in exports) {
    if (!Object.prototype.hasOwnProperty.call(exports, internalName)) continue;
    const elem = exports[internalName];
    let parts = internalName.split(".");
    let curr = extendedExports;
    while (parts.length > 1) {
      let part = parts.shift();
      if (!Object.prototype.hasOwnProperty.call(curr, part)) curr[part] = {};
      curr = curr[part];
    }
    let name = parts[0];
    let hash = name.indexOf("#");
    if (hash >= 0) {
      const className = name.substring(0, hash);
      const classElem = curr[className];
      if (typeof classElem === "undefined" || !classElem.prototype) {
        const ctor = function(...args) {
          return ctor.wrap(ctor.prototype.constructor(0, ...args));
        };
        ctor.prototype = {
          valueOf: function valueOf() {
            return this[THIS];
          }
        };
        ctor.wrap = function(thisValue) {
          return Object.create(ctor.prototype, { [THIS]: { value: thisValue, writable: false } });
        };
        if (classElem) Object.getOwnPropertyNames(classElem).forEach(name =>
          Object.defineProperty(ctor, name, Object.getOwnPropertyDescriptor(classElem, name))
        );
        curr[className] = ctor;
      }
      name = name.substring(hash + 1);
      curr = curr[className].prototype;
      if (/^(get|set):/.test(name)) {
        if (!Object.prototype.hasOwnProperty.call(curr, name = name.substring(4))) {
          let getter = exports[internalName.replace("set:", "get:")];
          let setter = exports[internalName.replace("get:", "set:")];
          Object.defineProperty(curr, name, {
            get: function() { return getter(this[THIS]); },
            set: function(value) { setter(this[THIS], value); },
            enumerable: true
          });
        }
      } else {
        if (name === 'constructor') {
          (curr[name] = (...args) => {
            setArgumentsLength(args.length);
            return elem(...args);
          }).original = elem;
        } else { // instance method
          (curr[name] = function(...args) { // !
            setArgumentsLength(args.length);
            return elem(this[THIS], ...args);
          }).original = elem;
        }
      }
    } else {
      if (/^(get|set):/.test(name)) {
        if (!Object.prototype.hasOwnProperty.call(curr, name = name.substring(4))) {
          Object.defineProperty(curr, name, {
            get: exports[internalName.replace("set:", "get:")],
            set: exports[internalName.replace("get:", "set:")],
            enumerable: true
          });
        }
      } else if (typeof elem === "function" && elem !== setArgumentsLength) {
        (curr[name] = (...args) => {
          setArgumentsLength(args.length);
          return elem(...args);
        }).original = elem;
      } else {
        curr[name] = elem;
      }
    }
  }
  return extendedExports;
}

exports.demangle = demangle;


/***/ }),

/***/ "./assemblyscript/demo1.ts":
/*!*********************************!*\
  !*** ./assemblyscript/demo1.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _assemblyscript_loader__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @assemblyscript/loader */ "./node_modules/@assemblyscript/loader/index.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (imports) => {
  const buffer = new ArrayBuffer(149);
  const uint8 = new Uint8Array(buffer);
  uint8.set([0,97,115,109,1,0,0,0,1,12,2,96,2,127,127,1,127,96,1,124,1,124,3,3,2,0,1,5,3,1,0,0,7,22,3,6,109,101,109,111,114,121,2,0,3,97,100,100,0,0,3,102,105,98,0,1,10,91,2,7,0,32,0,32,1,106,11,81,0,32,0,68,0,0,0,0,0,0,0,0,101,4,64,68,0,0,0,0,0,0,0,0,15,11,32,0,68,0,0,0,0,0,0,0,64,101,4,64,68,0,0,0,0,0,0,240,63,15,11,32,0,68,0,0,0,0,0,0,240,63,161,16,1,32,0,68,0,0,0,0,0,0,0,64,161,16,1,160,11]);
  const { exports } = await _assemblyscript_loader__WEBPACK_IMPORTED_MODULE_0__.instantiate(buffer, imports || {});
  return exports;
});

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__) => {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _module_optimized_wasm__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./module.optimized.wasm */ "./src/module.optimized.wasm");
/* harmony import */ var _assemblyscript_demo1_ts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../assemblyscript/demo1.ts */ "./assemblyscript/demo1.ts");
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_module_optimized_wasm__WEBPACK_IMPORTED_MODULE_0__]);
_module_optimized_wasm__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? await __webpack_async_dependencies__ : __webpack_async_dependencies__)[0];


function component() {
  
  console.time('测试fib速度1')
      console.log((0,_module_optimized_wasm__WEBPACK_IMPORTED_MODULE_0__.fib)(40));
      console.timeEnd('测试fib速度1')

  const imports = { env: {} };
  (0,_assemblyscript_demo1_ts__WEBPACK_IMPORTED_MODULE_1__.default)(imports).then(function (asmModule) {
      console.time('测试fib速度2')
      console.log(asmModule.fib(40))
      console.timeEnd('测试fib速度2')
    
  })

  const element = document.createElement('div');

  // Lodash, currently included via a script, is required for this line to work

  return element;
}

document.body.appendChild(component());
});

/***/ }),

/***/ "./src/module.optimized.wasm":
/*!***********************************!*\
  !*** ./src/module.optimized.wasm ***!
  \***********************************/
/***/ ((module, exports, __webpack_require__) => {

module.exports = __webpack_require__.v(exports, module.id, "c966b8c9b7a968e3a377");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/async module */
/******/ 	(() => {
/******/ 		var webpackThen = typeof Symbol === "function" ? Symbol("webpack then") : "__webpack_then__";
/******/ 		var webpackExports = typeof Symbol === "function" ? Symbol("webpack exports") : "__webpack_exports__";
/******/ 		var completeQueue = (queue) => {
/******/ 			if(queue) {
/******/ 				queue.forEach((fn) => (fn.r--));
/******/ 				queue.forEach((fn) => (fn.r-- ? fn.r++ : fn()));
/******/ 			}
/******/ 		}
/******/ 		var completeFunction = (fn) => (!--fn.r && fn());
/******/ 		var queueFunction = (queue, fn) => (queue ? queue.push(fn) : completeFunction(fn));
/******/ 		var wrapDeps = (deps) => (deps.map((dep) => {
/******/ 			if(dep !== null && typeof dep === "object") {
/******/ 				if(dep[webpackThen]) return dep;
/******/ 				if(dep.then) {
/******/ 					var queue = [];
/******/ 					dep.then((r) => {
/******/ 						obj[webpackExports] = r;
/******/ 						completeQueue(queue);
/******/ 						queue = 0;
/******/ 					});
/******/ 					var obj = {};
/******/ 												obj[webpackThen] = (fn, reject) => (queueFunction(queue, fn), dep.catch(reject));
/******/ 					return obj;
/******/ 				}
/******/ 			}
/******/ 			var ret = {};
/******/ 								ret[webpackThen] = (fn) => (completeFunction(fn));
/******/ 								ret[webpackExports] = dep;
/******/ 								return ret;
/******/ 		}));
/******/ 		__webpack_require__.a = (module, body, hasAwait) => {
/******/ 			var queue = hasAwait && [];
/******/ 			var exports = module.exports;
/******/ 			var currentDeps;
/******/ 			var outerResolve;
/******/ 			var reject;
/******/ 			var isEvaluating = true;
/******/ 			var nested = false;
/******/ 			var whenAll = (deps, onResolve, onReject) => {
/******/ 				if (nested) return;
/******/ 				nested = true;
/******/ 				onResolve.r += deps.length;
/******/ 				deps.map((dep, i) => (dep[webpackThen](onResolve, onReject)));
/******/ 				nested = false;
/******/ 			};
/******/ 			var promise = new Promise((resolve, rej) => {
/******/ 				reject = rej;
/******/ 				outerResolve = () => (resolve(exports), completeQueue(queue), queue = 0);
/******/ 			});
/******/ 			promise[webpackExports] = exports;
/******/ 			promise[webpackThen] = (fn, rejectFn) => {
/******/ 				if (isEvaluating) { return completeFunction(fn); }
/******/ 				if (currentDeps) whenAll(currentDeps, fn, rejectFn);
/******/ 				queueFunction(queue, fn);
/******/ 				promise.catch(rejectFn);
/******/ 			};
/******/ 			module.exports = promise;
/******/ 			body((deps) => {
/******/ 				if(!deps) return outerResolve();
/******/ 				currentDeps = wrapDeps(deps);
/******/ 				var fn, result;
/******/ 				var promise = new Promise((resolve, reject) => {
/******/ 					fn = () => (resolve(result = currentDeps.map((d) => (d[webpackExports]))));
/******/ 					fn.r = 0;
/******/ 					whenAll(currentDeps, fn, reject);
/******/ 				});
/******/ 				return fn.r ? promise : result;
/******/ 			}).then(outerResolve, reject);
/******/ 			isEvaluating = false;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/wasm loading */
/******/ 	(() => {
/******/ 		__webpack_require__.v = (exports, wasmModuleId, wasmModuleHash, importsObj) => {
/******/ 			var req = fetch(__webpack_require__.p + "" + wasmModuleHash + ".module.wasm");
/******/ 			if (typeof WebAssembly.instantiateStreaming === 'function') {
/******/ 				return WebAssembly.instantiateStreaming(req, importsObj)
/******/ 					.then((res) => (Object.assign(exports, res.instance.exports)));
/******/ 			}
/******/ 			return req
/******/ 				.then((x) => (x.arrayBuffer()))
/******/ 				.then((bytes) => (WebAssembly.instantiate(bytes, importsObj)))
/******/ 				.then((res) => (Object.assign(exports, res.instance.exports)));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module used 'module' so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.js");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0E7VUFDQTs7Ozs7V0N0QkE7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQSxJQUFJO1dBQ0o7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsQ0FBQztXQUNEO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLEVBQUU7V0FDRjtXQUNBO1dBQ0Esc0JBQXNCO1dBQ3RCO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsR0FBRztXQUNIO1dBQ0EsRUFBRTtXQUNGO1dBQ0E7Ozs7O1dDckVBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EseUNBQXlDLHdDQUF3QztXQUNqRjtXQUNBO1dBQ0E7Ozs7O1dDUEE7V0FDQTtXQUNBO1dBQ0E7V0FDQSxHQUFHO1dBQ0g7V0FDQTtXQUNBLENBQUM7Ozs7O1dDUEQ7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdEOzs7OztXQ05BO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7Ozs7O1dDVkE7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0E7Ozs7O1VFZkE7VUFDQTtVQUNBO1VBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9AbGloYWl4aW5nL3dlYnBhY2tXYXNtLy4vbm9kZV9tb2R1bGVzL0Bhc3NlbWJseXNjcmlwdC9sb2FkZXIvaW5kZXguanMiLCJ3ZWJwYWNrOi8vQGxpaGFpeGluZy93ZWJwYWNrV2FzbS8uL2Fzc2VtYmx5c2NyaXB0L2RlbW8xLnRzIiwid2VicGFjazovL0BsaWhhaXhpbmcvd2VicGFja1dhc20vLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vQGxpaGFpeGluZy93ZWJwYWNrV2FzbS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9AbGloYWl4aW5nL3dlYnBhY2tXYXNtL3dlYnBhY2svcnVudGltZS9hc3luYyBtb2R1bGUiLCJ3ZWJwYWNrOi8vQGxpaGFpeGluZy93ZWJwYWNrV2FzbS93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vQGxpaGFpeGluZy93ZWJwYWNrV2FzbS93ZWJwYWNrL3J1bnRpbWUvZ2xvYmFsIiwid2VicGFjazovL0BsaWhhaXhpbmcvd2VicGFja1dhc20vd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9AbGloYWl4aW5nL3dlYnBhY2tXYXNtL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vQGxpaGFpeGluZy93ZWJwYWNrV2FzbS93ZWJwYWNrL3J1bnRpbWUvd2FzbSBsb2FkaW5nIiwid2VicGFjazovL0BsaWhhaXhpbmcvd2VicGFja1dhc20vd2VicGFjay9ydW50aW1lL3B1YmxpY1BhdGgiLCJ3ZWJwYWNrOi8vQGxpaGFpeGluZy93ZWJwYWNrV2FzbS93ZWJwYWNrL2JlZm9yZS1zdGFydHVwIiwid2VicGFjazovL0BsaWhhaXhpbmcvd2VicGFja1dhc20vd2VicGFjay9zdGFydHVwIiwid2VicGFjazovL0BsaWhhaXhpbmcvd2VicGFja1dhc20vd2VicGFjay9hZnRlci1zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG4vLyBSdW50aW1lIGhlYWRlciBvZmZzZXRzXG5jb25zdCBJRF9PRkZTRVQgPSAtODtcbmNvbnN0IFNJWkVfT0ZGU0VUID0gLTQ7XG5cbi8vIFJ1bnRpbWUgaWRzXG5jb25zdCBBUlJBWUJVRkZFUl9JRCA9IDA7XG5jb25zdCBTVFJJTkdfSUQgPSAxO1xuLy8gY29uc3QgQVJSQVlCVUZGRVJWSUVXX0lEID0gMjtcblxuLy8gUnVudGltZSB0eXBlIGluZm9ybWF0aW9uXG5jb25zdCBBUlJBWUJVRkZFUlZJRVcgPSAxIDw8IDA7XG5jb25zdCBBUlJBWSA9IDEgPDwgMTtcbmNvbnN0IFNUQVRJQ0FSUkFZID0gMSA8PCAyO1xuLy8gY29uc3QgU0VUID0gMSA8PCAzO1xuLy8gY29uc3QgTUFQID0gMSA8PCA0O1xuY29uc3QgVkFMX0FMSUdOX09GRlNFVCA9IDY7XG4vLyBjb25zdCBWQUxfQUxJR04gPSAxIDw8IFZBTF9BTElHTl9PRkZTRVQ7XG5jb25zdCBWQUxfU0lHTkVEID0gMSA8PCAxMTtcbmNvbnN0IFZBTF9GTE9BVCA9IDEgPDwgMTI7XG4vLyBjb25zdCBWQUxfTlVMTEFCTEUgPSAxIDw8IDEzO1xuY29uc3QgVkFMX01BTkFHRUQgPSAxIDw8IDE0O1xuLy8gY29uc3QgS0VZX0FMSUdOX09GRlNFVCA9IDE1O1xuLy8gY29uc3QgS0VZX0FMSUdOID0gMSA8PCBLRVlfQUxJR05fT0ZGU0VUO1xuLy8gY29uc3QgS0VZX1NJR05FRCA9IDEgPDwgMjA7XG4vLyBjb25zdCBLRVlfRkxPQVQgPSAxIDw8IDIxO1xuLy8gY29uc3QgS0VZX05VTExBQkxFID0gMSA8PCAyMjtcbi8vIGNvbnN0IEtFWV9NQU5BR0VEID0gMSA8PCAyMztcblxuLy8gQXJyYXkoQnVmZmVyVmlldykgbGF5b3V0XG5jb25zdCBBUlJBWUJVRkZFUlZJRVdfQlVGRkVSX09GRlNFVCA9IDA7XG5jb25zdCBBUlJBWUJVRkZFUlZJRVdfREFUQVNUQVJUX09GRlNFVCA9IDQ7XG5jb25zdCBBUlJBWUJVRkZFUlZJRVdfREFUQUxFTkdUSF9PRkZTRVQgPSA4O1xuY29uc3QgQVJSQVlCVUZGRVJWSUVXX1NJWkUgPSAxMjtcbmNvbnN0IEFSUkFZX0xFTkdUSF9PRkZTRVQgPSAxMjtcbmNvbnN0IEFSUkFZX1NJWkUgPSAxNjtcblxuY29uc3QgQklHSU5UID0gdHlwZW9mIEJpZ1VpbnQ2NEFycmF5ICE9PSBcInVuZGVmaW5lZFwiO1xuY29uc3QgVEhJUyA9IFN5bWJvbCgpO1xuY29uc3QgQ0hVTktTSVpFID0gMTAyNDtcblxuLyoqIEdldHMgYSBzdHJpbmcgZnJvbSBhbiBVMzIgYW5kIGFuIFUxNiB2aWV3IG9uIGEgbWVtb3J5LiAqL1xuZnVuY3Rpb24gZ2V0U3RyaW5nSW1wbChidWZmZXIsIHB0cikge1xuICBjb25zdCBVMzIgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyKTtcbiAgY29uc3QgVTE2ID0gbmV3IFVpbnQxNkFycmF5KGJ1ZmZlcik7XG4gIGxldCBsZW5ndGggPSBVMzJbKHB0ciArIFNJWkVfT0ZGU0VUKSA+Pj4gMl0gPj4+IDE7XG4gIGxldCBvZmZzZXQgPSBwdHIgPj4+IDE7XG4gIGlmIChsZW5ndGggPD0gQ0hVTktTSVpFKSByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIFUxNi5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGxlbmd0aCkpO1xuICBjb25zdCBwYXJ0cyA9IFtdO1xuICBkbyB7XG4gICAgY29uc3QgbGFzdCA9IFUxNltvZmZzZXQgKyBDSFVOS1NJWkUgLSAxXTtcbiAgICBjb25zdCBzaXplID0gbGFzdCA+PSAweEQ4MDAgJiYgbGFzdCA8IDB4REMwMCA/IENIVU5LU0laRSAtIDEgOiBDSFVOS1NJWkU7XG4gICAgcGFydHMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgVTE2LnN1YmFycmF5KG9mZnNldCwgb2Zmc2V0ICs9IHNpemUpKSk7XG4gICAgbGVuZ3RoIC09IHNpemU7XG4gIH0gd2hpbGUgKGxlbmd0aCA+IENIVU5LU0laRSk7XG4gIHJldHVybiBwYXJ0cy5qb2luKFwiXCIpICsgU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIFUxNi5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGxlbmd0aCkpO1xufVxuXG4vKiogUHJlcGFyZXMgdGhlIGJhc2UgbW9kdWxlIHByaW9yIHRvIGluc3RhbnRpYXRpb24uICovXG5mdW5jdGlvbiBwcmVJbnN0YW50aWF0ZShpbXBvcnRzKSB7XG4gIGNvbnN0IGV4dGVuZGVkRXhwb3J0cyA9IHt9O1xuXG4gIGZ1bmN0aW9uIGdldFN0cmluZyhtZW1vcnksIHB0cikge1xuICAgIGlmICghbWVtb3J5KSByZXR1cm4gXCI8eWV0IHVua25vd24+XCI7XG4gICAgcmV0dXJuIGdldFN0cmluZ0ltcGwobWVtb3J5LmJ1ZmZlciwgcHRyKTtcbiAgfVxuXG4gIC8vIGFkZCBjb21tb24gaW1wb3J0cyB1c2VkIGJ5IHN0ZGxpYiBmb3IgY29udmVuaWVuY2VcbiAgY29uc3QgZW52ID0gKGltcG9ydHMuZW52ID0gaW1wb3J0cy5lbnYgfHwge30pO1xuICBlbnYuYWJvcnQgPSBlbnYuYWJvcnQgfHwgZnVuY3Rpb24gYWJvcnQobXNnLCBmaWxlLCBsaW5lLCBjb2xtKSB7XG4gICAgY29uc3QgbWVtb3J5ID0gZXh0ZW5kZWRFeHBvcnRzLm1lbW9yeSB8fCBlbnYubWVtb3J5OyAvLyBwcmVmZXIgZXhwb3J0ZWQsIG90aGVyd2lzZSB0cnkgaW1wb3J0ZWRcbiAgICB0aHJvdyBFcnJvcihcImFib3J0OiBcIiArIGdldFN0cmluZyhtZW1vcnksIG1zZykgKyBcIiBhdCBcIiArIGdldFN0cmluZyhtZW1vcnksIGZpbGUpICsgXCI6XCIgKyBsaW5lICsgXCI6XCIgKyBjb2xtKTtcbiAgfTtcbiAgZW52LnRyYWNlID0gZW52LnRyYWNlIHx8IGZ1bmN0aW9uIHRyYWNlKG1zZywgbikge1xuICAgIGNvbnN0IG1lbW9yeSA9IGV4dGVuZGVkRXhwb3J0cy5tZW1vcnkgfHwgZW52Lm1lbW9yeTtcbiAgICBjb25zb2xlLmxvZyhcInRyYWNlOiBcIiArIGdldFN0cmluZyhtZW1vcnksIG1zZykgKyAobiA/IFwiIFwiIDogXCJcIikgKyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIsIDIgKyBuKS5qb2luKFwiLCBcIikpO1xuICB9O1xuICBlbnYuc2VlZCA9IGVudi5zZWVkIHx8IGZ1bmN0aW9uIHNlZWQoKSB7XG4gICAgcmV0dXJuIERhdGUubm93KCk7XG4gIH07XG4gIGltcG9ydHMuTWF0aCA9IGltcG9ydHMuTWF0aCB8fCBNYXRoO1xuICBpbXBvcnRzLkRhdGUgPSBpbXBvcnRzLkRhdGUgfHwgRGF0ZTtcblxuICByZXR1cm4gZXh0ZW5kZWRFeHBvcnRzO1xufVxuXG4vKiogUHJlcGFyZXMgdGhlIGZpbmFsIG1vZHVsZSBvbmNlIGluc3RhbnRpYXRpb24gaXMgY29tcGxldGUuICovXG5mdW5jdGlvbiBwb3N0SW5zdGFudGlhdGUoZXh0ZW5kZWRFeHBvcnRzLCBpbnN0YW5jZSkge1xuICBjb25zdCBleHBvcnRzID0gaW5zdGFuY2UuZXhwb3J0cztcbiAgY29uc3QgbWVtb3J5ID0gZXhwb3J0cy5tZW1vcnk7XG4gIGNvbnN0IHRhYmxlID0gZXhwb3J0cy50YWJsZTtcbiAgY29uc3QgYWxsb2MgPSBleHBvcnRzW1wiX19hbGxvY1wiXTtcbiAgY29uc3QgcmV0YWluID0gZXhwb3J0c1tcIl9fcmV0YWluXCJdO1xuICBjb25zdCBydHRpQmFzZSA9IGV4cG9ydHNbXCJfX3J0dGlfYmFzZVwiXSB8fCB+MDsgLy8gb29iIGlmIG5vdCBwcmVzZW50XG5cbiAgLyoqIEdldHMgdGhlIHJ1bnRpbWUgdHlwZSBpbmZvIGZvciB0aGUgZ2l2ZW4gaWQuICovXG4gIGZ1bmN0aW9uIGdldEluZm8oaWQpIHtcbiAgICBjb25zdCBVMzIgPSBuZXcgVWludDMyQXJyYXkobWVtb3J5LmJ1ZmZlcik7XG4gICAgY29uc3QgY291bnQgPSBVMzJbcnR0aUJhc2UgPj4+IDJdO1xuICAgIGlmICgoaWQgPj4+PSAwKSA+PSBjb3VudCkgdGhyb3cgRXJyb3IoXCJpbnZhbGlkIGlkOiBcIiArIGlkKTtcbiAgICByZXR1cm4gVTMyWyhydHRpQmFzZSArIDQgPj4+IDIpICsgaWQgKiAyXTtcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBydW50aW1lIGJhc2UgaWQgZm9yIHRoZSBnaXZlbiBpZC4gKi9cbiAgZnVuY3Rpb24gZ2V0QmFzZShpZCkge1xuICAgIGNvbnN0IFUzMiA9IG5ldyBVaW50MzJBcnJheShtZW1vcnkuYnVmZmVyKTtcbiAgICBjb25zdCBjb3VudCA9IFUzMltydHRpQmFzZSA+Pj4gMl07XG4gICAgaWYgKChpZCA+Pj49IDApID49IGNvdW50KSB0aHJvdyBFcnJvcihcImludmFsaWQgaWQ6IFwiICsgaWQpO1xuICAgIHJldHVybiBVMzJbKHJ0dGlCYXNlICsgNCA+Pj4gMikgKyBpZCAqIDIgKyAxXTtcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBydW50aW1lIGFsaWdubWVudCBvZiBhIGNvbGxlY3Rpb24ncyB2YWx1ZXMuICovXG4gIGZ1bmN0aW9uIGdldFZhbHVlQWxpZ24oaW5mbykge1xuICAgIHJldHVybiAzMSAtIE1hdGguY2x6MzIoKGluZm8gPj4+IFZBTF9BTElHTl9PRkZTRVQpICYgMzEpOyAvLyAtMSBpZiBub25lXG4gIH1cblxuICAvKiogR2V0cyB0aGUgcnVudGltZSBhbGlnbm1lbnQgb2YgYSBjb2xsZWN0aW9uJ3Mga2V5cy4gKi9cbiAgLy8gZnVuY3Rpb24gZ2V0S2V5QWxpZ24oaW5mbykge1xuICAvLyAgIHJldHVybiAzMSAtIE1hdGguY2x6MzIoKGluZm8gPj4+IEtFWV9BTElHTl9PRkZTRVQpICYgMzEpOyAvLyAtMSBpZiBub25lXG4gIC8vIH1cblxuICAvKiogQWxsb2NhdGVzIGEgbmV3IHN0cmluZyBpbiB0aGUgbW9kdWxlJ3MgbWVtb3J5IGFuZCByZXR1cm5zIGl0cyByZXRhaW5lZCBwb2ludGVyLiAqL1xuICBmdW5jdGlvbiBfX2FsbG9jU3RyaW5nKHN0cikge1xuICAgIGNvbnN0IGxlbmd0aCA9IHN0ci5sZW5ndGg7XG4gICAgY29uc3QgcHRyID0gYWxsb2MobGVuZ3RoIDw8IDEsIFNUUklOR19JRCk7XG4gICAgY29uc3QgVTE2ID0gbmV3IFVpbnQxNkFycmF5KG1lbW9yeS5idWZmZXIpO1xuICAgIGZvciAodmFyIGkgPSAwLCBwID0gcHRyID4+PiAxOyBpIDwgbGVuZ3RoOyArK2kpIFUxNltwICsgaV0gPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICByZXR1cm4gcHRyO1xuICB9XG5cbiAgZXh0ZW5kZWRFeHBvcnRzLl9fYWxsb2NTdHJpbmcgPSBfX2FsbG9jU3RyaW5nO1xuXG4gIC8qKiBSZWFkcyBhIHN0cmluZyBmcm9tIHRoZSBtb2R1bGUncyBtZW1vcnkgYnkgaXRzIHBvaW50ZXIuICovXG4gIGZ1bmN0aW9uIF9fZ2V0U3RyaW5nKHB0cikge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG1lbW9yeS5idWZmZXI7XG4gICAgY29uc3QgaWQgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyKVtwdHIgKyBJRF9PRkZTRVQgPj4+IDJdO1xuICAgIGlmIChpZCAhPT0gU1RSSU5HX0lEKSB0aHJvdyBFcnJvcihcIm5vdCBhIHN0cmluZzogXCIgKyBwdHIpO1xuICAgIHJldHVybiBnZXRTdHJpbmdJbXBsKGJ1ZmZlciwgcHRyKTtcbiAgfVxuXG4gIGV4dGVuZGVkRXhwb3J0cy5fX2dldFN0cmluZyA9IF9fZ2V0U3RyaW5nO1xuXG4gIC8qKiBHZXRzIHRoZSB2aWV3IG1hdGNoaW5nIHRoZSBzcGVjaWZpZWQgYWxpZ25tZW50LCBzaWduZWRuZXNzIGFuZCBmbG9hdG5lc3MuICovXG4gIGZ1bmN0aW9uIGdldFZpZXcoYWxpZ25Mb2cyLCBzaWduZWQsIGZsb2F0KSB7XG4gICAgY29uc3QgYnVmZmVyID0gbWVtb3J5LmJ1ZmZlcjtcbiAgICBpZiAoZmxvYXQpIHtcbiAgICAgIHN3aXRjaCAoYWxpZ25Mb2cyKSB7XG4gICAgICAgIGNhc2UgMjogcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyKTtcbiAgICAgICAgY2FzZSAzOiByZXR1cm4gbmV3IEZsb2F0NjRBcnJheShidWZmZXIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzd2l0Y2ggKGFsaWduTG9nMikge1xuICAgICAgICBjYXNlIDA6IHJldHVybiBuZXcgKHNpZ25lZCA/IEludDhBcnJheSA6IFVpbnQ4QXJyYXkpKGJ1ZmZlcik7XG4gICAgICAgIGNhc2UgMTogcmV0dXJuIG5ldyAoc2lnbmVkID8gSW50MTZBcnJheSA6IFVpbnQxNkFycmF5KShidWZmZXIpO1xuICAgICAgICBjYXNlIDI6IHJldHVybiBuZXcgKHNpZ25lZCA/IEludDMyQXJyYXkgOiBVaW50MzJBcnJheSkoYnVmZmVyKTtcbiAgICAgICAgY2FzZSAzOiByZXR1cm4gbmV3IChzaWduZWQgPyBCaWdJbnQ2NEFycmF5IDogQmlnVWludDY0QXJyYXkpKGJ1ZmZlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IEVycm9yKFwidW5zdXBwb3J0ZWQgYWxpZ246IFwiICsgYWxpZ25Mb2cyKTtcbiAgfVxuXG4gIC8qKiBBbGxvY2F0ZXMgYSBuZXcgYXJyYXkgaW4gdGhlIG1vZHVsZSdzIG1lbW9yeSBhbmQgcmV0dXJucyBpdHMgcmV0YWluZWQgcG9pbnRlci4gKi9cbiAgZnVuY3Rpb24gX19hbGxvY0FycmF5KGlkLCB2YWx1ZXMpIHtcbiAgICBjb25zdCBpbmZvID0gZ2V0SW5mbyhpZCk7XG4gICAgaWYgKCEoaW5mbyAmIChBUlJBWUJVRkZFUlZJRVcgfCBBUlJBWSB8IFNUQVRJQ0FSUkFZKSkpIHRocm93IEVycm9yKFwibm90IGFuIGFycmF5OiBcIiArIGlkICsgXCIsIGZsYWdzPSBcIiArIGluZm8pO1xuICAgIGNvbnN0IGFsaWduID0gZ2V0VmFsdWVBbGlnbihpbmZvKTtcbiAgICBjb25zdCBsZW5ndGggPSB2YWx1ZXMubGVuZ3RoO1xuICAgIGNvbnN0IGJ1ZiA9IGFsbG9jKGxlbmd0aCA8PCBhbGlnbiwgaW5mbyAmIFNUQVRJQ0FSUkFZID8gaWQgOiBBUlJBWUJVRkZFUl9JRCk7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoaW5mbyAmIFNUQVRJQ0FSUkFZKSB7XG4gICAgICByZXN1bHQgPSBidWY7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGFyciA9IGFsbG9jKGluZm8gJiBBUlJBWSA/IEFSUkFZX1NJWkUgOiBBUlJBWUJVRkZFUlZJRVdfU0laRSwgaWQpO1xuICAgICAgY29uc3QgVTMyID0gbmV3IFVpbnQzMkFycmF5KG1lbW9yeS5idWZmZXIpO1xuICAgICAgVTMyW2FyciArIEFSUkFZQlVGRkVSVklFV19CVUZGRVJfT0ZGU0VUID4+PiAyXSA9IHJldGFpbihidWYpO1xuICAgICAgVTMyW2FyciArIEFSUkFZQlVGRkVSVklFV19EQVRBU1RBUlRfT0ZGU0VUID4+PiAyXSA9IGJ1ZjtcbiAgICAgIFUzMlthcnIgKyBBUlJBWUJVRkZFUlZJRVdfREFUQUxFTkdUSF9PRkZTRVQgPj4+IDJdID0gbGVuZ3RoIDw8IGFsaWduO1xuICAgICAgaWYgKGluZm8gJiBBUlJBWSkgVTMyW2FyciArIEFSUkFZX0xFTkdUSF9PRkZTRVQgPj4+IDJdID0gbGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gYXJyO1xuICAgIH1cbiAgICBjb25zdCB2aWV3ID0gZ2V0VmlldyhhbGlnbiwgaW5mbyAmIFZBTF9TSUdORUQsIGluZm8gJiBWQUxfRkxPQVQpO1xuICAgIGlmIChpbmZvICYgVkFMX01BTkFHRUQpIHtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHZpZXdbKGJ1ZiA+Pj4gYWxpZ24pICsgaV0gPSByZXRhaW4odmFsdWVzW2ldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmlldy5zZXQodmFsdWVzLCBidWYgPj4+IGFsaWduKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGV4dGVuZGVkRXhwb3J0cy5fX2FsbG9jQXJyYXkgPSBfX2FsbG9jQXJyYXk7XG5cbiAgLyoqIEdldHMgYSBsaXZlIHZpZXcgb24gYW4gYXJyYXkncyB2YWx1ZXMgaW4gdGhlIG1vZHVsZSdzIG1lbW9yeS4gSW5mZXJzIHRoZSBhcnJheSB0eXBlIGZyb20gUlRUSS4gKi9cbiAgZnVuY3Rpb24gX19nZXRBcnJheVZpZXcoYXJyKSB7XG4gICAgY29uc3QgVTMyID0gbmV3IFVpbnQzMkFycmF5KG1lbW9yeS5idWZmZXIpO1xuICAgIGNvbnN0IGlkID0gVTMyW2FyciArIElEX09GRlNFVCA+Pj4gMl07XG4gICAgY29uc3QgaW5mbyA9IGdldEluZm8oaWQpO1xuICAgIGlmICghKGluZm8gJiAoQVJSQVlCVUZGRVJWSUVXIHwgQVJSQVkgfCBTVEFUSUNBUlJBWSkpKSB0aHJvdyBFcnJvcihcIm5vdCBhbiBhcnJheTogXCIgKyBpZCArIFwiLCBmbGFncz1cIiArIGluZm8pO1xuICAgIGNvbnN0IGFsaWduID0gZ2V0VmFsdWVBbGlnbihpbmZvKTtcbiAgICBsZXQgYnVmID0gaW5mbyAmIFNUQVRJQ0FSUkFZXG4gICAgICA/IGFyclxuICAgICAgOiBVMzJbYXJyICsgQVJSQVlCVUZGRVJWSUVXX0RBVEFTVEFSVF9PRkZTRVQgPj4+IDJdO1xuICAgIGNvbnN0IGxlbmd0aCA9IGluZm8gJiBBUlJBWVxuICAgICAgPyBVMzJbYXJyICsgQVJSQVlfTEVOR1RIX09GRlNFVCA+Pj4gMl1cbiAgICAgIDogVTMyW2J1ZiArIFNJWkVfT0ZGU0VUID4+PiAyXSA+Pj4gYWxpZ247XG4gICAgcmV0dXJuIGdldFZpZXcoYWxpZ24sIGluZm8gJiBWQUxfU0lHTkVELCBpbmZvICYgVkFMX0ZMT0FUKS5zdWJhcnJheShidWYgPj4+PSBhbGlnbiwgYnVmICsgbGVuZ3RoKTtcbiAgfVxuXG4gIGV4dGVuZGVkRXhwb3J0cy5fX2dldEFycmF5VmlldyA9IF9fZ2V0QXJyYXlWaWV3O1xuXG4gIC8qKiBDb3BpZXMgYW4gYXJyYXkncyB2YWx1ZXMgZnJvbSB0aGUgbW9kdWxlJ3MgbWVtb3J5LiBJbmZlcnMgdGhlIGFycmF5IHR5cGUgZnJvbSBSVFRJLiAqL1xuICBmdW5jdGlvbiBfX2dldEFycmF5KGFycikge1xuICAgIGNvbnN0IGlucHV0ID0gX19nZXRBcnJheVZpZXcoYXJyKTtcbiAgICBjb25zdCBsZW4gPSBpbnB1dC5sZW5ndGg7XG4gICAgY29uc3Qgb3V0ID0gbmV3IEFycmF5KGxlbik7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykgb3V0W2ldID0gaW5wdXRbaV07XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIGV4dGVuZGVkRXhwb3J0cy5fX2dldEFycmF5ID0gX19nZXRBcnJheTtcblxuICAvKiogQ29waWVzIGFuIEFycmF5QnVmZmVyJ3MgdmFsdWUgZnJvbSB0aGUgbW9kdWxlJ3MgbWVtb3J5LiAqL1xuICBmdW5jdGlvbiBfX2dldEFycmF5QnVmZmVyKHB0cikge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG1lbW9yeS5idWZmZXI7XG4gICAgY29uc3QgbGVuZ3RoID0gbmV3IFVpbnQzMkFycmF5KGJ1ZmZlcilbcHRyICsgU0laRV9PRkZTRVQgPj4+IDJdO1xuICAgIHJldHVybiBidWZmZXIuc2xpY2UocHRyLCBwdHIgKyBsZW5ndGgpO1xuICB9XG5cbiAgZXh0ZW5kZWRFeHBvcnRzLl9fZ2V0QXJyYXlCdWZmZXIgPSBfX2dldEFycmF5QnVmZmVyO1xuXG4gIC8qKiBDb3BpZXMgYSB0eXBlZCBhcnJheSdzIHZhbHVlcyBmcm9tIHRoZSBtb2R1bGUncyBtZW1vcnkuICovXG4gIGZ1bmN0aW9uIGdldFR5cGVkQXJyYXkoVHlwZSwgYWxpZ25Mb2cyLCBwdHIpIHtcbiAgICByZXR1cm4gbmV3IFR5cGUoZ2V0VHlwZWRBcnJheVZpZXcoVHlwZSwgYWxpZ25Mb2cyLCBwdHIpKTtcbiAgfVxuXG4gIC8qKiBHZXRzIGEgbGl2ZSB2aWV3IG9uIGEgdHlwZWQgYXJyYXkncyB2YWx1ZXMgaW4gdGhlIG1vZHVsZSdzIG1lbW9yeS4gKi9cbiAgZnVuY3Rpb24gZ2V0VHlwZWRBcnJheVZpZXcoVHlwZSwgYWxpZ25Mb2cyLCBwdHIpIHtcbiAgICBjb25zdCBidWZmZXIgPSBtZW1vcnkuYnVmZmVyO1xuICAgIGNvbnN0IFUzMiA9IG5ldyBVaW50MzJBcnJheShidWZmZXIpO1xuICAgIGNvbnN0IGJ1ZlB0ciA9IFUzMltwdHIgKyBBUlJBWUJVRkZFUlZJRVdfREFUQVNUQVJUX09GRlNFVCA+Pj4gMl07XG4gICAgcmV0dXJuIG5ldyBUeXBlKGJ1ZmZlciwgYnVmUHRyLCBVMzJbYnVmUHRyICsgU0laRV9PRkZTRVQgPj4+IDJdID4+PiBhbGlnbkxvZzIpO1xuICB9XG5cbiAgLyoqIEF0dGFjaCBhIHNldCBvZiBnZXQgVHlwZWRBcnJheSBhbmQgVmlldyBmdW5jdGlvbnMgdG8gdGhlIGV4cG9ydHMuICovXG4gIGZ1bmN0aW9uIGF0dGFjaFR5cGVkQXJyYXlGdW5jdGlvbnMoY3RvciwgbmFtZSwgYWxpZ24pIHtcbiAgICBleHRlbmRlZEV4cG9ydHNbXCJfX2dldFwiICsgbmFtZV0gPSBnZXRUeXBlZEFycmF5LmJpbmQobnVsbCwgY3RvciwgYWxpZ24pO1xuICAgIGV4dGVuZGVkRXhwb3J0c1tcIl9fZ2V0XCIgKyBuYW1lICsgXCJWaWV3XCJdID0gZ2V0VHlwZWRBcnJheVZpZXcuYmluZChudWxsLCBjdG9yLCBhbGlnbik7XG4gIH1cblxuICBbXG4gICAgSW50OEFycmF5LFxuICAgIFVpbnQ4QXJyYXksXG4gICAgVWludDhDbGFtcGVkQXJyYXksXG4gICAgSW50MTZBcnJheSxcbiAgICBVaW50MTZBcnJheSxcbiAgICBJbnQzMkFycmF5LFxuICAgIFVpbnQzMkFycmF5LFxuICAgIEZsb2F0MzJBcnJheSxcbiAgICBGbG9hdDY0QXJyYXlcbiAgXS5mb3JFYWNoKGN0b3IgPT4ge1xuICAgIGF0dGFjaFR5cGVkQXJyYXlGdW5jdGlvbnMoY3RvciwgY3Rvci5uYW1lLCAzMSAtIE1hdGguY2x6MzIoY3Rvci5CWVRFU19QRVJfRUxFTUVOVCkpO1xuICB9KTtcblxuICBpZiAoQklHSU5UKSB7XG4gICAgW0JpZ1VpbnQ2NEFycmF5LCBCaWdJbnQ2NEFycmF5XS5mb3JFYWNoKGN0b3IgPT4ge1xuICAgICAgYXR0YWNoVHlwZWRBcnJheUZ1bmN0aW9ucyhjdG9yLCBjdG9yLm5hbWUuc2xpY2UoMyksIDMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFRlc3RzIHdoZXRoZXIgYW4gb2JqZWN0IGlzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkIGJhc2UgaWQuICovXG4gIGZ1bmN0aW9uIF9faW5zdGFuY2VvZihwdHIsIGJhc2VJZCkge1xuICAgIGNvbnN0IFUzMiA9IG5ldyBVaW50MzJBcnJheShtZW1vcnkuYnVmZmVyKTtcbiAgICBsZXQgaWQgPSBVMzJbKHB0ciArIElEX09GRlNFVCkgPj4+IDJdO1xuICAgIGlmIChpZCA8PSBVMzJbcnR0aUJhc2UgPj4+IDJdKSB7XG4gICAgICBkbyB7XG4gICAgICAgIGlmIChpZCA9PSBiYXNlSWQpIHJldHVybiB0cnVlO1xuICAgICAgICBpZCA9IGdldEJhc2UoaWQpO1xuICAgICAgfSB3aGlsZSAoaWQpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBleHRlbmRlZEV4cG9ydHMuX19pbnN0YW5jZW9mID0gX19pbnN0YW5jZW9mO1xuXG4gIC8vIFB1bGwgYmFzaWMgZXhwb3J0cyB0byBleHRlbmRlZEV4cG9ydHMgc28gY29kZSBpbiBwcmVJbnN0YW50aWF0ZSBjYW4gdXNlIHRoZW1cbiAgZXh0ZW5kZWRFeHBvcnRzLm1lbW9yeSA9IGV4dGVuZGVkRXhwb3J0cy5tZW1vcnkgfHwgbWVtb3J5O1xuICBleHRlbmRlZEV4cG9ydHMudGFibGUgID0gZXh0ZW5kZWRFeHBvcnRzLnRhYmxlICB8fCB0YWJsZTtcblxuICAvLyBEZW1hbmdsZSBleHBvcnRzIGFuZCBwcm92aWRlIHRoZSB1c3VhbCB1dGlsaXR5IG9uIHRoZSBwcm90b3R5cGVcbiAgcmV0dXJuIGRlbWFuZ2xlKGV4cG9ydHMsIGV4dGVuZGVkRXhwb3J0cyk7XG59XG5cbmZ1bmN0aW9uIGlzUmVzcG9uc2Uoc3JjKSB7XG4gIHJldHVybiB0eXBlb2YgUmVzcG9uc2UgIT09IFwidW5kZWZpbmVkXCIgJiYgc3JjIGluc3RhbmNlb2YgUmVzcG9uc2U7XG59XG5cbmZ1bmN0aW9uIGlzTW9kdWxlKHNyYykge1xuICByZXR1cm4gc3JjIGluc3RhbmNlb2YgV2ViQXNzZW1ibHkuTW9kdWxlO1xufVxuXG4vKiogQXN5bmNocm9ub3VzbHkgaW5zdGFudGlhdGVzIGFuIEFzc2VtYmx5U2NyaXB0IG1vZHVsZSBmcm9tIGFueXRoaW5nIHRoYXQgY2FuIGJlIGluc3RhbnRpYXRlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbnRpYXRlKHNvdXJjZSwgaW1wb3J0cyA9IHt9KSB7XG4gIGlmIChpc1Jlc3BvbnNlKHNvdXJjZSA9IGF3YWl0IHNvdXJjZSkpIHJldHVybiBpbnN0YW50aWF0ZVN0cmVhbWluZyhzb3VyY2UsIGltcG9ydHMpO1xuICBjb25zdCBtb2R1bGUgPSBpc01vZHVsZShzb3VyY2UpID8gc291cmNlIDogYXdhaXQgV2ViQXNzZW1ibHkuY29tcGlsZShzb3VyY2UpO1xuICBjb25zdCBleHRlbmRlZCA9IHByZUluc3RhbnRpYXRlKGltcG9ydHMpO1xuICBjb25zdCBpbnN0YW5jZSA9IGF3YWl0IFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlKG1vZHVsZSwgaW1wb3J0cyk7XG4gIGNvbnN0IGV4cG9ydHMgPSBwb3N0SW5zdGFudGlhdGUoZXh0ZW5kZWQsIGluc3RhbmNlKTtcbiAgcmV0dXJuIHsgbW9kdWxlLCBpbnN0YW5jZSwgZXhwb3J0cyB9O1xufVxuXG5leHBvcnRzLmluc3RhbnRpYXRlID0gaW5zdGFudGlhdGU7XG5cbi8qKiBTeW5jaHJvbm91c2x5IGluc3RhbnRpYXRlcyBhbiBBc3NlbWJseVNjcmlwdCBtb2R1bGUgZnJvbSBhIFdlYkFzc2VtYmx5Lk1vZHVsZSBvciBiaW5hcnkgYnVmZmVyLiAqL1xuZnVuY3Rpb24gaW5zdGFudGlhdGVTeW5jKHNvdXJjZSwgaW1wb3J0cyA9IHt9KSB7XG4gIGNvbnN0IG1vZHVsZSA9IGlzTW9kdWxlKHNvdXJjZSkgPyBzb3VyY2UgOiBuZXcgV2ViQXNzZW1ibHkuTW9kdWxlKHNvdXJjZSk7XG4gIGNvbnN0IGV4dGVuZGVkID0gcHJlSW5zdGFudGlhdGUoaW1wb3J0cyk7XG4gIGNvbnN0IGluc3RhbmNlID0gbmV3IFdlYkFzc2VtYmx5Lkluc3RhbmNlKG1vZHVsZSwgaW1wb3J0cyk7XG4gIGNvbnN0IGV4cG9ydHMgPSBwb3N0SW5zdGFudGlhdGUoZXh0ZW5kZWQsIGluc3RhbmNlKTtcbiAgcmV0dXJuIHsgbW9kdWxlLCBpbnN0YW5jZSwgZXhwb3J0cyB9O1xufVxuXG5leHBvcnRzLmluc3RhbnRpYXRlU3luYyA9IGluc3RhbnRpYXRlU3luYztcblxuLyoqIEFzeW5jaHJvbm91c2x5IGluc3RhbnRpYXRlcyBhbiBBc3NlbWJseVNjcmlwdCBtb2R1bGUgZnJvbSBhIHJlc3BvbnNlLCBpLmUuIGFzIG9idGFpbmVkIGJ5IGBmZXRjaGAuICovXG5hc3luYyBmdW5jdGlvbiBpbnN0YW50aWF0ZVN0cmVhbWluZyhzb3VyY2UsIGltcG9ydHMgPSB7fSkge1xuICBpZiAoIVdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKSB7XG4gICAgcmV0dXJuIGluc3RhbnRpYXRlKFxuICAgICAgaXNSZXNwb25zZShzb3VyY2UgPSBhd2FpdCBzb3VyY2UpXG4gICAgICAgID8gc291cmNlLmFycmF5QnVmZmVyKClcbiAgICAgICAgOiBzb3VyY2UsXG4gICAgICBpbXBvcnRzXG4gICAgKTtcbiAgfVxuICBjb25zdCBleHRlbmRlZCA9IHByZUluc3RhbnRpYXRlKGltcG9ydHMpO1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZyhzb3VyY2UsIGltcG9ydHMpO1xuICBjb25zdCBleHBvcnRzID0gcG9zdEluc3RhbnRpYXRlKGV4dGVuZGVkLCByZXN1bHQuaW5zdGFuY2UpO1xuICByZXR1cm4geyAuLi5yZXN1bHQsIGV4cG9ydHMgfTtcbn1cblxuZXhwb3J0cy5pbnN0YW50aWF0ZVN0cmVhbWluZyA9IGluc3RhbnRpYXRlU3RyZWFtaW5nO1xuXG4vKiogRGVtYW5nbGVzIGFuIEFzc2VtYmx5U2NyaXB0IG1vZHVsZSdzIGV4cG9ydHMgdG8gYSBmcmllbmRseSBvYmplY3Qgc3RydWN0dXJlLiAqL1xuZnVuY3Rpb24gZGVtYW5nbGUoZXhwb3J0cywgZXh0ZW5kZWRFeHBvcnRzID0ge30pIHtcbiAgZXh0ZW5kZWRFeHBvcnRzID0gT2JqZWN0LmNyZWF0ZShleHRlbmRlZEV4cG9ydHMpO1xuICBjb25zdCBzZXRBcmd1bWVudHNMZW5ndGggPSBleHBvcnRzW1wiX19hcmd1bWVudHNMZW5ndGhcIl1cbiAgICA/IGxlbmd0aCA9PiB7IGV4cG9ydHNbXCJfX2FyZ3VtZW50c0xlbmd0aFwiXS52YWx1ZSA9IGxlbmd0aDsgfVxuICAgIDogZXhwb3J0c1tcIl9fc2V0QXJndW1lbnRzTGVuZ3RoXCJdIHx8IGV4cG9ydHNbXCJfX3NldGFyZ2NcIl0gfHwgKCgpID0+IHsgLyogbm9wICovIH0pO1xuICBmb3IgKGxldCBpbnRlcm5hbE5hbWUgaW4gZXhwb3J0cykge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGV4cG9ydHMsIGludGVybmFsTmFtZSkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGVsZW0gPSBleHBvcnRzW2ludGVybmFsTmFtZV07XG4gICAgbGV0IHBhcnRzID0gaW50ZXJuYWxOYW1lLnNwbGl0KFwiLlwiKTtcbiAgICBsZXQgY3VyciA9IGV4dGVuZGVkRXhwb3J0cztcbiAgICB3aGlsZSAocGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgbGV0IHBhcnQgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY3VyciwgcGFydCkpIGN1cnJbcGFydF0gPSB7fTtcbiAgICAgIGN1cnIgPSBjdXJyW3BhcnRdO1xuICAgIH1cbiAgICBsZXQgbmFtZSA9IHBhcnRzWzBdO1xuICAgIGxldCBoYXNoID0gbmFtZS5pbmRleE9mKFwiI1wiKTtcbiAgICBpZiAoaGFzaCA+PSAwKSB7XG4gICAgICBjb25zdCBjbGFzc05hbWUgPSBuYW1lLnN1YnN0cmluZygwLCBoYXNoKTtcbiAgICAgIGNvbnN0IGNsYXNzRWxlbSA9IGN1cnJbY2xhc3NOYW1lXTtcbiAgICAgIGlmICh0eXBlb2YgY2xhc3NFbGVtID09PSBcInVuZGVmaW5lZFwiIHx8ICFjbGFzc0VsZW0ucHJvdG90eXBlKSB7XG4gICAgICAgIGNvbnN0IGN0b3IgPSBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgICAgICAgcmV0dXJuIGN0b3Iud3JhcChjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvcigwLCAuLi5hcmdzKSk7XG4gICAgICAgIH07XG4gICAgICAgIGN0b3IucHJvdG90eXBlID0ge1xuICAgICAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uIHZhbHVlT2YoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpc1tUSElTXTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGN0b3Iud3JhcCA9IGZ1bmN0aW9uKHRoaXNWYWx1ZSkge1xuICAgICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKGN0b3IucHJvdG90eXBlLCB7IFtUSElTXTogeyB2YWx1ZTogdGhpc1ZhbHVlLCB3cml0YWJsZTogZmFsc2UgfSB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGNsYXNzRWxlbSkgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY2xhc3NFbGVtKS5mb3JFYWNoKG5hbWUgPT5cbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY3RvciwgbmFtZSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihjbGFzc0VsZW0sIG5hbWUpKVxuICAgICAgICApO1xuICAgICAgICBjdXJyW2NsYXNzTmFtZV0gPSBjdG9yO1xuICAgICAgfVxuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKGhhc2ggKyAxKTtcbiAgICAgIGN1cnIgPSBjdXJyW2NsYXNzTmFtZV0ucHJvdG90eXBlO1xuICAgICAgaWYgKC9eKGdldHxzZXQpOi8udGVzdChuYW1lKSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjdXJyLCBuYW1lID0gbmFtZS5zdWJzdHJpbmcoNCkpKSB7XG4gICAgICAgICAgbGV0IGdldHRlciA9IGV4cG9ydHNbaW50ZXJuYWxOYW1lLnJlcGxhY2UoXCJzZXQ6XCIsIFwiZ2V0OlwiKV07XG4gICAgICAgICAgbGV0IHNldHRlciA9IGV4cG9ydHNbaW50ZXJuYWxOYW1lLnJlcGxhY2UoXCJnZXQ6XCIsIFwic2V0OlwiKV07XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGN1cnIsIG5hbWUsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBnZXR0ZXIodGhpc1tUSElTXSk7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHNldHRlcih0aGlzW1RISVNdLCB2YWx1ZSk7IH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChuYW1lID09PSAnY29uc3RydWN0b3InKSB7XG4gICAgICAgICAgKGN1cnJbbmFtZV0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgc2V0QXJndW1lbnRzTGVuZ3RoKGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgIHJldHVybiBlbGVtKC4uLmFyZ3MpO1xuICAgICAgICAgIH0pLm9yaWdpbmFsID0gZWxlbTtcbiAgICAgICAgfSBlbHNlIHsgLy8gaW5zdGFuY2UgbWV0aG9kXG4gICAgICAgICAgKGN1cnJbbmFtZV0gPSBmdW5jdGlvbiguLi5hcmdzKSB7IC8vICFcbiAgICAgICAgICAgIHNldEFyZ3VtZW50c0xlbmd0aChhcmdzLmxlbmd0aCk7XG4gICAgICAgICAgICByZXR1cm4gZWxlbSh0aGlzW1RISVNdLCAuLi5hcmdzKTtcbiAgICAgICAgICB9KS5vcmlnaW5hbCA9IGVsZW07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKC9eKGdldHxzZXQpOi8udGVzdChuYW1lKSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjdXJyLCBuYW1lID0gbmFtZS5zdWJzdHJpbmcoNCkpKSB7XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGN1cnIsIG5hbWUsIHtcbiAgICAgICAgICAgIGdldDogZXhwb3J0c1tpbnRlcm5hbE5hbWUucmVwbGFjZShcInNldDpcIiwgXCJnZXQ6XCIpXSxcbiAgICAgICAgICAgIHNldDogZXhwb3J0c1tpbnRlcm5hbE5hbWUucmVwbGFjZShcImdldDpcIiwgXCJzZXQ6XCIpXSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZWxlbSA9PT0gXCJmdW5jdGlvblwiICYmIGVsZW0gIT09IHNldEFyZ3VtZW50c0xlbmd0aCkge1xuICAgICAgICAoY3VycltuYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgc2V0QXJndW1lbnRzTGVuZ3RoKGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICByZXR1cm4gZWxlbSguLi5hcmdzKTtcbiAgICAgICAgfSkub3JpZ2luYWwgPSBlbGVtO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3VycltuYW1lXSA9IGVsZW07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBleHRlbmRlZEV4cG9ydHM7XG59XG5cbmV4cG9ydHMuZGVtYW5nbGUgPSBkZW1hbmdsZTtcbiIsIlxuaW1wb3J0IGxvYWRlciBmcm9tICdAYXNzZW1ibHlzY3JpcHQvbG9hZGVyJztcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIChpbXBvcnRzKSA9PiB7XG4gIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigxNDkpO1xuICBjb25zdCB1aW50OCA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIHVpbnQ4LnNldChbMCw5NywxMTUsMTA5LDEsMCwwLDAsMSwxMiwyLDk2LDIsMTI3LDEyNywxLDEyNyw5NiwxLDEyNCwxLDEyNCwzLDMsMiwwLDEsNSwzLDEsMCwwLDcsMjIsMyw2LDEwOSwxMDEsMTA5LDExMSwxMTQsMTIxLDIsMCwzLDk3LDEwMCwxMDAsMCwwLDMsMTAyLDEwNSw5OCwwLDEsMTAsOTEsMiw3LDAsMzIsMCwzMiwxLDEwNiwxMSw4MSwwLDMyLDAsNjgsMCwwLDAsMCwwLDAsMCwwLDEwMSw0LDY0LDY4LDAsMCwwLDAsMCwwLDAsMCwxNSwxMSwzMiwwLDY4LDAsMCwwLDAsMCwwLDAsNjQsMTAxLDQsNjQsNjgsMCwwLDAsMCwwLDAsMjQwLDYzLDE1LDExLDMyLDAsNjgsMCwwLDAsMCwwLDAsMjQwLDYzLDE2MSwxNiwxLDMyLDAsNjgsMCwwLDAsMCwwLDAsMCw2NCwxNjEsMTYsMSwxNjAsMTFdKTtcbiAgY29uc3QgeyBleHBvcnRzIH0gPSBhd2FpdCBsb2FkZXIuaW5zdGFudGlhdGUoYnVmZmVyLCBpbXBvcnRzIHx8IHt9KTtcbiAgcmV0dXJuIGV4cG9ydHM7XG59OyIsImltcG9ydCB7IGZpYiB9IGZyb20gJy4vbW9kdWxlLm9wdGltaXplZC53YXNtJ1xuaW1wb3J0IGFzbVByb21pc2UgZnJvbSAnLi4vYXNzZW1ibHlzY3JpcHQvZGVtbzEudHMnXG5mdW5jdGlvbiBjb21wb25lbnQoKSB7XG4gIFxuICBjb25zb2xlLnRpbWUoJ+a1i+ivlWZpYumAn+W6pjEnKVxuICAgICAgY29uc29sZS5sb2coZmliKDQwKSk7XG4gICAgICBjb25zb2xlLnRpbWVFbmQoJ+a1i+ivlWZpYumAn+W6pjEnKVxuXG4gIGNvbnN0IGltcG9ydHMgPSB7IGVudjoge30gfTtcbiAgYXNtUHJvbWlzZShpbXBvcnRzKS50aGVuKGZ1bmN0aW9uIChhc21Nb2R1bGUpIHtcbiAgICAgIGNvbnNvbGUudGltZSgn5rWL6K+VZmli6YCf5bqmMicpXG4gICAgICBjb25zb2xlLmxvZyhhc21Nb2R1bGUuZmliKDQwKSlcbiAgICAgIGNvbnNvbGUudGltZUVuZCgn5rWL6K+VZmli6YCf5bqmMicpXG4gICAgXG4gIH0pXG5cbiAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIC8vIExvZGFzaCwgY3VycmVudGx5IGluY2x1ZGVkIHZpYSBhIHNjcmlwdCwgaXMgcmVxdWlyZWQgZm9yIHRoaXMgbGluZSB0byB3b3JrXG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY29tcG9uZW50KCkpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0aWQ6IG1vZHVsZUlkLFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCJ2YXIgd2VicGFja1RoZW4gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgPyBTeW1ib2woXCJ3ZWJwYWNrIHRoZW5cIikgOiBcIl9fd2VicGFja190aGVuX19cIjtcbnZhciB3ZWJwYWNrRXhwb3J0cyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiA/IFN5bWJvbChcIndlYnBhY2sgZXhwb3J0c1wiKSA6IFwiX193ZWJwYWNrX2V4cG9ydHNfX1wiO1xudmFyIGNvbXBsZXRlUXVldWUgPSAocXVldWUpID0+IHtcblx0aWYocXVldWUpIHtcblx0XHRxdWV1ZS5mb3JFYWNoKChmbikgPT4gKGZuLnItLSkpO1xuXHRcdHF1ZXVlLmZvckVhY2goKGZuKSA9PiAoZm4uci0tID8gZm4ucisrIDogZm4oKSkpO1xuXHR9XG59XG52YXIgY29tcGxldGVGdW5jdGlvbiA9IChmbikgPT4gKCEtLWZuLnIgJiYgZm4oKSk7XG52YXIgcXVldWVGdW5jdGlvbiA9IChxdWV1ZSwgZm4pID0+IChxdWV1ZSA/IHF1ZXVlLnB1c2goZm4pIDogY29tcGxldGVGdW5jdGlvbihmbikpO1xudmFyIHdyYXBEZXBzID0gKGRlcHMpID0+IChkZXBzLm1hcCgoZGVwKSA9PiB7XG5cdGlmKGRlcCAhPT0gbnVsbCAmJiB0eXBlb2YgZGVwID09PSBcIm9iamVjdFwiKSB7XG5cdFx0aWYoZGVwW3dlYnBhY2tUaGVuXSkgcmV0dXJuIGRlcDtcblx0XHRpZihkZXAudGhlbikge1xuXHRcdFx0dmFyIHF1ZXVlID0gW107XG5cdFx0XHRkZXAudGhlbigocikgPT4ge1xuXHRcdFx0XHRvYmpbd2VicGFja0V4cG9ydHNdID0gcjtcblx0XHRcdFx0Y29tcGxldGVRdWV1ZShxdWV1ZSk7XG5cdFx0XHRcdHF1ZXVlID0gMDtcblx0XHRcdH0pO1xuXHRcdFx0dmFyIG9iaiA9IHt9O1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRvYmpbd2VicGFja1RoZW5dID0gKGZuLCByZWplY3QpID0+IChxdWV1ZUZ1bmN0aW9uKHF1ZXVlLCBmbiksIGRlcC5jYXRjaChyZWplY3QpKTtcblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fVxuXHR9XG5cdHZhciByZXQgPSB7fTtcblx0XHRcdFx0XHRcdHJldFt3ZWJwYWNrVGhlbl0gPSAoZm4pID0+IChjb21wbGV0ZUZ1bmN0aW9uKGZuKSk7XG5cdFx0XHRcdFx0XHRyZXRbd2VicGFja0V4cG9ydHNdID0gZGVwO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHJldDtcbn0pKTtcbl9fd2VicGFja19yZXF1aXJlX18uYSA9IChtb2R1bGUsIGJvZHksIGhhc0F3YWl0KSA9PiB7XG5cdHZhciBxdWV1ZSA9IGhhc0F3YWl0ICYmIFtdO1xuXHR2YXIgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzO1xuXHR2YXIgY3VycmVudERlcHM7XG5cdHZhciBvdXRlclJlc29sdmU7XG5cdHZhciByZWplY3Q7XG5cdHZhciBpc0V2YWx1YXRpbmcgPSB0cnVlO1xuXHR2YXIgbmVzdGVkID0gZmFsc2U7XG5cdHZhciB3aGVuQWxsID0gKGRlcHMsIG9uUmVzb2x2ZSwgb25SZWplY3QpID0+IHtcblx0XHRpZiAobmVzdGVkKSByZXR1cm47XG5cdFx0bmVzdGVkID0gdHJ1ZTtcblx0XHRvblJlc29sdmUuciArPSBkZXBzLmxlbmd0aDtcblx0XHRkZXBzLm1hcCgoZGVwLCBpKSA9PiAoZGVwW3dlYnBhY2tUaGVuXShvblJlc29sdmUsIG9uUmVqZWN0KSkpO1xuXHRcdG5lc3RlZCA9IGZhbHNlO1xuXHR9O1xuXHR2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWopID0+IHtcblx0XHRyZWplY3QgPSByZWo7XG5cdFx0b3V0ZXJSZXNvbHZlID0gKCkgPT4gKHJlc29sdmUoZXhwb3J0cyksIGNvbXBsZXRlUXVldWUocXVldWUpLCBxdWV1ZSA9IDApO1xuXHR9KTtcblx0cHJvbWlzZVt3ZWJwYWNrRXhwb3J0c10gPSBleHBvcnRzO1xuXHRwcm9taXNlW3dlYnBhY2tUaGVuXSA9IChmbiwgcmVqZWN0Rm4pID0+IHtcblx0XHRpZiAoaXNFdmFsdWF0aW5nKSB7IHJldHVybiBjb21wbGV0ZUZ1bmN0aW9uKGZuKTsgfVxuXHRcdGlmIChjdXJyZW50RGVwcykgd2hlbkFsbChjdXJyZW50RGVwcywgZm4sIHJlamVjdEZuKTtcblx0XHRxdWV1ZUZ1bmN0aW9uKHF1ZXVlLCBmbik7XG5cdFx0cHJvbWlzZS5jYXRjaChyZWplY3RGbik7XG5cdH07XG5cdG1vZHVsZS5leHBvcnRzID0gcHJvbWlzZTtcblx0Ym9keSgoZGVwcykgPT4ge1xuXHRcdGlmKCFkZXBzKSByZXR1cm4gb3V0ZXJSZXNvbHZlKCk7XG5cdFx0Y3VycmVudERlcHMgPSB3cmFwRGVwcyhkZXBzKTtcblx0XHR2YXIgZm4sIHJlc3VsdDtcblx0XHR2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGZuID0gKCkgPT4gKHJlc29sdmUocmVzdWx0ID0gY3VycmVudERlcHMubWFwKChkKSA9PiAoZFt3ZWJwYWNrRXhwb3J0c10pKSkpO1xuXHRcdFx0Zm4uciA9IDA7XG5cdFx0XHR3aGVuQWxsKGN1cnJlbnREZXBzLCBmbiwgcmVqZWN0KTtcblx0XHR9KTtcblx0XHRyZXR1cm4gZm4uciA/IHByb21pc2UgOiByZXN1bHQ7XG5cdH0pLnRoZW4ob3V0ZXJSZXNvbHZlLCByZWplY3QpO1xuXHRpc0V2YWx1YXRpbmcgPSBmYWxzZTtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5nID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0dHJ5IHtcblx0XHRyZXR1cm4gdGhpcyB8fCBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JykgcmV0dXJuIHdpbmRvdztcblx0fVxufSkoKTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy52ID0gKGV4cG9ydHMsIHdhc21Nb2R1bGVJZCwgd2FzbU1vZHVsZUhhc2gsIGltcG9ydHNPYmopID0+IHtcblx0dmFyIHJlcSA9IGZldGNoKF9fd2VicGFja19yZXF1aXJlX18ucCArIFwiXCIgKyB3YXNtTW9kdWxlSGFzaCArIFwiLm1vZHVsZS53YXNtXCIpO1xuXHRpZiAodHlwZW9mIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0cmV0dXJuIFdlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKHJlcSwgaW1wb3J0c09iailcblx0XHRcdC50aGVuKChyZXMpID0+IChPYmplY3QuYXNzaWduKGV4cG9ydHMsIHJlcy5pbnN0YW5jZS5leHBvcnRzKSkpO1xuXHR9XG5cdHJldHVybiByZXFcblx0XHQudGhlbigoeCkgPT4gKHguYXJyYXlCdWZmZXIoKSkpXG5cdFx0LnRoZW4oKGJ5dGVzKSA9PiAoV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUoYnl0ZXMsIGltcG9ydHNPYmopKSlcblx0XHQudGhlbigocmVzKSA9PiAoT2JqZWN0LmFzc2lnbihleHBvcnRzLCByZXMuaW5zdGFuY2UuZXhwb3J0cykpKTtcbn07IiwidmFyIHNjcmlwdFVybDtcbmlmIChfX3dlYnBhY2tfcmVxdWlyZV9fLmcuaW1wb3J0U2NyaXB0cykgc2NyaXB0VXJsID0gX193ZWJwYWNrX3JlcXVpcmVfXy5nLmxvY2F0aW9uICsgXCJcIjtcbnZhciBkb2N1bWVudCA9IF9fd2VicGFja19yZXF1aXJlX18uZy5kb2N1bWVudDtcbmlmICghc2NyaXB0VXJsICYmIGRvY3VtZW50KSB7XG5cdGlmIChkb2N1bWVudC5jdXJyZW50U2NyaXB0KVxuXHRcdHNjcmlwdFVybCA9IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQuc3JjXG5cdGlmICghc2NyaXB0VXJsKSB7XG5cdFx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKTtcblx0XHRpZihzY3JpcHRzLmxlbmd0aCkgc2NyaXB0VXJsID0gc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdLnNyY1xuXHR9XG59XG4vLyBXaGVuIHN1cHBvcnRpbmcgYnJvd3NlcnMgd2hlcmUgYW4gYXV0b21hdGljIHB1YmxpY1BhdGggaXMgbm90IHN1cHBvcnRlZCB5b3UgbXVzdCBzcGVjaWZ5IGFuIG91dHB1dC5wdWJsaWNQYXRoIG1hbnVhbGx5IHZpYSBjb25maWd1cmF0aW9uXG4vLyBvciBwYXNzIGFuIGVtcHR5IHN0cmluZyAoXCJcIikgYW5kIHNldCB0aGUgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gdmFyaWFibGUgZnJvbSB5b3VyIGNvZGUgdG8gdXNlIHlvdXIgb3duIGxvZ2ljLlxuaWYgKCFzY3JpcHRVcmwpIHRocm93IG5ldyBFcnJvcihcIkF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyXCIpO1xuc2NyaXB0VXJsID0gc2NyaXB0VXJsLnJlcGxhY2UoLyMuKiQvLCBcIlwiKS5yZXBsYWNlKC9cXD8uKiQvLCBcIlwiKS5yZXBsYWNlKC9cXC9bXlxcL10rJC8sIFwiL1wiKTtcbl9fd2VicGFja19yZXF1aXJlX18ucCA9IHNjcmlwdFVybDsiLCIiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIHVzZWQgJ21vZHVsZScgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvaW5kZXguanNcIik7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=