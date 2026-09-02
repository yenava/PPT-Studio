#!/usr/bin/env python3
from __future__ import annotations

import argparse
import getpass
from pathlib import Path

from textppt_common import DEFAULT_CONFIG_PATH, PADDLE_ENV, write_private_config


def main() -> int:
    parser = argparse.ArgumentParser(description="Store a PaddleOCR token in a mode-0600 local config file.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    args = parser.parse_args()
    token = getpass.getpass("PaddleOCR token: ").strip()
    if not token:
        raise SystemExit("Token cannot be empty.")
    target = Path(args.config).expanduser()
    write_private_config(target, {PADDLE_ENV: token})
    print(f"Stored PaddleOCR token in {target} with private permissions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

