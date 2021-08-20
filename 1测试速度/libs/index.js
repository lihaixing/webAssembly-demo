
function fetchAndInstantiateWasm(url, imports) {
  return fetch(url)
    .then(res => {
      if (res.ok)
        return res.arrayBuffer();
      throw new Error(`Unable to fetch Web Assembly file ${url}.`);
    })
    .then(bytes => WebAssembly.compile(bytes))
    .then(module =>{
      console.log(module)
      return  WebAssembly.instantiate(module, imports || {})
    })
    .then(instance => instance.exports);
}

function fetchAndInstantiateWasm2(url, imports) {
  if ('WebAssembly' in window) {
    return WebAssembly.instantiateStreaming(fetch(url)).then(result => {
      return result.instance.exports;
    })
  }
}