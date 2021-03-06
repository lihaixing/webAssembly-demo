export function add(a: i32, b: i32): i32 {
  return a + b;
}

export function fib(x: number) :number{
  if (x <= 0) {
    return 0;
  }
  if (x <= 2) {
    return 1
  }
  return fib(x - 1) + fib(x - 2)
}