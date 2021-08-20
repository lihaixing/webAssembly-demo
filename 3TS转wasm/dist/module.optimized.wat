(module
 (type $i32_i32_=>_i32 (func (param i32 i32) (result i32)))
 (type $f64_=>_f64 (func (param f64) (result f64)))
 (memory $0 0)
 (export "add" (func $src/module/add))
 (export "fib" (func $src/module/fib))
 (export "memory" (memory $0))
 (func $src/module/add (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  i32.add
 )
 (func $src/module/fib (param $0 f64) (result f64)
  local.get $0
  f64.const 0
  f64.le
  if
   f64.const 0
   return
  end
  local.get $0
  f64.const 2
  f64.le
  if
   f64.const 1
   return
  end
  local.get $0
  f64.const 1
  f64.sub
  call $src/module/fib
  local.get $0
  f64.const 2
  f64.sub
  call $src/module/fib
  f64.add
 )
)
