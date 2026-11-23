import pytest
from packages.core.states import Status, assert_transition, TransitionError
def test_valid():
    assert_transition(Status.DISCOVERED, Status.SCORED)
def test_invalid():
    with pytest.raises(TransitionError):
        assert_transition(Status.DISCOVERED, Status.PUBLISHED)
