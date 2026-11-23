import re
from dataclasses import dataclass
@dataclass(frozen=True)
class QcConfig:
    entity_coverage_min: float = 0.6
    unique_data_points_min: int = 3
    word_count_min: int = 1200
    density_range: tuple[float, float] = (0.8, 2.5)
    duplicate_sentence_max: float = 0.15
    internal_links_min: int = 3
    title_max: int = 60
    description_max: int = 155
@dataclass
class QcInput:
    body: str
    keyword: str
    entity_coverage: float
    unique_data_points: int
    internal_links: int
    title: str
    description: str
    banned_hits: int = 0
def evaluate(i: QcInput, cfg: QcConfig = QcConfig()) -> list[str]:
    fails: list[str] = []
    if i.entity_coverage < cfg.entity_coverage_min: fails.append("entity_coverage")
    if i.unique_data_points < cfg.unique_data_points_min: fails.append("unique_data_points")
    if len(re.findall(r"\w+", i.body)) < cfg.word_count_min: fails.append("word_count")
    if i.internal_links < cfg.internal_links_min: fails.append("internal_links")
    if len(i.title) > cfg.title_max: fails.append("title_length")
    if len(i.description) > cfg.description_max: fails.append("description_length")
    if i.banned_hits > 0: fails.append("banned_phrase")
    return fails
