#!/usr/bin/env python3
"""Verify SHA-256 of the 10 legacy prototype files under upload/ against the
manifest recorded in download/docs/99_WORKLOG/LEGACY_PROTOTYPE_EXTRACTION.md §2.11.

Manifest values (from the accepted documentation commit 6d3041d):
  index.html              ac337d780852f9998c7a2772e8272b3341c2f045bd59acb107342fd368530118
  app.js                  d11a987a4a545989daaf9cd01f71714b3184cf37ae8c5c6f1387cd6cbe414715
  login.html              7f575e56ffdd7bcefdd7a019ba8a753fcdb4bb2cee90355c67ab891c188eb311
  login.js                050417a0abea5dab04cda670a628a93644e666ea40c3f6257030ae464f623f76
  clinic-admin-laser.html f8306952c34ec5907bc43000d007bd75a85a489136d4aa307f1331b824af23c
  clinic-laser.js         433c8d41c939107ee6e65642bb29d0f5d9e9cfd26b4ab7ee85b28e0ae32df29e
  clinic-dental.html      2b7dcb658dae945233562c4ac6031a431ab768c9c2a785439f92fc69f7705701
  clinic-pediatrics.html  ce2a16795b0ed587ba0f8731648df256791c8b933907c1fdd7e95c4b0506f1a2
  clinic-internal.html    f1c25798627bfa24f1ea49ee83d90bd8958be5d8b7e25b14c81ac45c8297cfb7
  clinic-lab.html         9f18b69dd8424ae2efa3e44eb177e364720a5992e08fb952588774b2f4c50e60
"""
import hashlib
import os
import sys

UPLOAD_DIR = "/home/z/my-project/upload"

MANIFEST = {
    "index.html":              "ac337d780852f9998c7a2772e8272b3341c2f045bd59acb107342fd368530118",
    "app.js":                  "d11a987a4a545989daaf9cd01f71714b3184cf37ae8c5c6f1387cd6cbe414715",
    "login.html":              "7f575e56ffdd7bcefdd7a019ba8a753fcdb4bb2cee90355c67ab891c188eb311",
    "login.js":                "050417a0abea5dab04cda670a628a93644e666ea40c3f6257030ae464f623f76",
    "clinic-admin-laser.html": "f8306952c34ec5907bc43000d007bd75a85a489136d4aa307f1331b824af23c",
    "clinic-laser.js":         "433c8d41c939107ee6e65642bb29d0f5d9e9cfd26b4ab7ee85b28e0ae32df29e",
    "clinic-dental.html":      "2b7dcb658dae945233562c4ac6031a431ab768c9c2a785439f92fc69f7705701",
    "clinic-pediatrics.html":  "ce2a16795b0ed587ba0f8731648df256791c8b933907c1fdd7e95c4b0506f1a2",
    "clinic-internal.html":    "f1c25798627bfa24f1ea49ee83d90bd8958be5d8b7e25b14c81ac45c8297cfb7",
    "clinic-lab.html":         "9f18b69dd8424ae2efa3e44eb177e364720a5992e08fb952588774b2f4c50e60",
}

def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    print(f"{'File':<28} {'Exists':<7} {'Manifest SHA-256':<64} {'On-disk SHA-256':<64} {'Match'}")
    print("-" * 175)
    all_ok = True
    for name, expected in MANIFEST.items():
        path = os.path.join(UPLOAD_DIR, name)
        exists = os.path.exists(path)
        if exists:
            actual = sha256_of(path)
            match = (actual == expected)
        else:
            actual = "<missing>"
            match = False
        if not match:
            all_ok = False
        print(f"{name:<28} {str(exists):<7} {expected:<64} {actual:<64} {match}")
    print("-" * 175)
    print(f"Total: {len(MANIFEST)} files; all match: {all_ok}")
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
