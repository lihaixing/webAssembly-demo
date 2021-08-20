PROJ=seven
ifeq ($(OS),Windows_NT)
    RM=del
else
    RM=rm
endif

CC=emcc
# CC=em++
# CFLAGS=-O3 --emrun -s WASM=1
CFLAGS=-O3 -s WASM=1 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS='["_${PROJ}"]' --emrun --no-entry
# CFLAGS=-O3 -s WASM=1 -s STANDALONE_WASM=1 -s EXPORTED_RUNTIME_METHODS='["_${PROJ}"]' --emrun --no-entry

$(PROJ).wasm: $(PROJ).c
# $(PROJ).js: $(PROJ).cpp
		$(CC) $(CFLAGS) -o $@ $^

.PHONY:clean
clean:
		$(RM) $(PROJ).html $(PROJ).js $(PROJ).wasm