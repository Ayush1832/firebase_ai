import os
import struct
import zlib

def make_png(width, height, r, g, b, a=255):
    # PNG signature
    png_sig = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (raw RGBA scanlines)
    raw_scanlines = bytearray()
    for y in range(height):
        raw_scanlines.append(0) # filter byte 0 (None)
        for x in range(width):
            raw_scanlines.extend([r, g, b, a])
            
    compressed = zlib.compress(bytes(raw_scanlines))
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    return png_sig + ihdr_chunk + idat_chunk + iend_chunk

os.makedirs('icons', exist_ok=True)
for size in [16, 32, 48, 128]:
    with open(f'icons/{size}.png', 'wb') as f:
        # #0B57D0 -> (11, 87, 208)
        f.write(make_png(size, size, 11, 87, 208))
print("Icons created successfully.")
