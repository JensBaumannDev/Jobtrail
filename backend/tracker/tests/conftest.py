import datetime

import pytest
from django.utils import timezone

FROZEN_TODAY = datetime.date(2026, 11, 27)


@pytest.fixture
def frozen_today(monkeypatch):
    monkeypatch.setattr(timezone, 'localdate', lambda *args, **kwargs: FROZEN_TODAY)
    return FROZEN_TODAY
