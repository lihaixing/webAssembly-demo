#include <stdio.h>
extern int printValue(int x);

int seven(int argc)
{
  printValue(argc);
  return 123;
}