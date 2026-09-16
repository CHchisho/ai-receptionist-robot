from pathlib import Path

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def sqlite_tmp(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "sqlite_path", str(tmp_path / "app.sqlite"))
