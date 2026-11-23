from packages.core.qc import QcInput, evaluate
def good(**kw):
    base = dict(body="테스트 본문입니다. " * 1300, keyword="테스트", entity_coverage=0.8, unique_data_points=5, internal_links=5, title="제목", description="설명")
    base.update(kw)
    return QcInput(**base)
def test_pass():
    assert evaluate(good()) == []
def test_low_coverage():
    assert "entity_coverage" in evaluate(good(entity_coverage=0.1))
def test_long_title():
    assert "title_length" in evaluate(good(title="가" * 80))
