import { fib } from './module.optimized.wasm'
// import asmPromise from '../assemblyscript/demo1.ts'
function component() {
  
  console.time('测试fib速度1')
      console.log(fib(40));
      console.timeEnd('测试fib速度1')

  // const imports = { env: {} };
  // asmPromise(imports).then(function (asmModule) {
  //     console.time('测试fib速度2')
  //     console.log(asmModule.fib(40))
  //     console.timeEnd('测试fib速度2')
    
  // })

  const element = document.createElement('div');

  // Lodash, currently included via a script, is required for this line to work

  return element;
}

document.body.appendChild(component());