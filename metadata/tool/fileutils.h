#ifndef FILEUTILS_H
#define FILEUTILS_H

#include <vector>
#include <cstdint>

std::vector<uint8_t> read_file(const char *path);

void write_file(const char *path, const void *buf, size_t size);

#endif //FILEUTILS_H
