from packages.core.scoring import KeywordMetrics, is_eligible, score
def m(**kw):
    base = dict(volume=100, kd=20, top_dr_avg=30.0, intent="commercial", top_dr30_count=1)
    base.update(kw)
    return KeywordMetrics(**base)
def test_low_volume():
    assert not is_eligible(m(volume=29))
def test_high_kd():
    assert not is_eligible(m(kd=46))
def test_many_competitors():
    assert not is_eligible(m(top_dr30_count=3))
def test_boundary_ok():
    assert is_eligible(m(volume=30, kd=45, top_dr30_count=2))
def test_intent_order():
    assert score(m(intent="transactional")) > score(m(intent="informational"))
