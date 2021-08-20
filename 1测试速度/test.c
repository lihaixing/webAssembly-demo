#include <stdio.h>
// 编译： emcc -o test.js -O3 -s WASM=1 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS='["_fib"]' --emrun --no-entry test.c
int fib(int x) {
  if (x <= 0) {
    return 0;
  }
  if (x <= 2) {
    return 1;
  }
  return fib(x - 1) + fib(x - 2);
}