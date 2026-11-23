from dataclasses import dataclass
INTENT_WEIGHT = {"transactional": 1.5, "commercial": 1.3, "informational": 1.0, "navigational": 0.6}
@dataclass(frozen=True)
class KeywordMetrics:
    volume: int
    kd: int
    top_dr_avg: float | None
    intent: str
    top_dr30_count: int
@dataclass(frozen=True)
class FilterConfig:
    volume_min: int = 30
    kd_max: int = 45
    top_dr30_count_max: int = 2
def is_eligible(m: KeywordMetrics, cfg: FilterConfig = FilterConfig()) -> bool:
    if m.volume < cfg.volume_min or m.kd > cfg.kd_max:
        return False
    return m.top_dr30_count <= cfg.top_dr30_count_max
def score(m: KeywordMetrics) -> float:
    dr = m.top_dr_avg if m.top_dr_avg and m.top_dr_avg > 0 else 1.0
    return (m.volume * INTENT_WEIGHT.get(m.intent, 1.0)) / (max(m.kd, 1) * dr)
