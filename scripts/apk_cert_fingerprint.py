"""Huella SHA-256 del certificado de firma v2/v3 de un APK (formato APK Signing Block)."""
import hashlib, struct, sys

data = open(sys.argv[1], 'rb').read()
eocd = data.rfind(b'PK\x05\x06')
cd_offset = struct.unpack_from('<I', data, eocd + 16)[0]
assert data[cd_offset - 16:cd_offset] == b'APK Sig Block 42', 'sin APK Signing Block'
block_size = struct.unpack_from('<Q', data, cd_offset - 24)[0]
start = cd_offset - block_size - 8
pos, end = start + 8, cd_offset - 24

def prefixed(buf, off):
    n = struct.unpack_from('<I', buf, off)[0]
    return buf[off + 4: off + 4 + n], off + 4 + n

while pos < end:
    size = struct.unpack_from('<Q', data, pos)[0]
    pid = struct.unpack_from('<I', data, pos + 8)[0]
    value = data[pos + 12: pos + 8 + size]
    if pid in (0x7109871a, 0xf05368c0):  # v2, v3
        signers, _ = prefixed(value, 0)
        signer, _ = prefixed(signers, 0)
        signed_data, _ = prefixed(signer, 0)
        _digests, off = prefixed(signed_data, 0)
        certs, _ = prefixed(signed_data, off)
        cert, _ = prefixed(certs, 0)
        fp = hashlib.sha256(cert).hexdigest().upper()
        print(':'.join(fp[i:i + 2] for i in range(0, len(fp), 2)))
        break
    pos += 8 + size
