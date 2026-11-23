from enum import StrEnum
class Status(StrEnum):
    DISCOVERED = "discovered"
    SCORED = "scored"
    QUEUED = "queued"
    DRAFTING = "drafting"
    QC_FAILED = "qc_failed"
    QC_PASSED = "qc_passed"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    INDEXING = "indexing"
    INDEXED = "indexed"
    RANKING = "ranking"
    DECAYED = "decayed"
    DROPPED = "dropped"
ALLOWED: dict[Status, set[Status]] = {
    Status.DISCOVERED: {Status.SCORED, Status.DROPPED},
    Status.SCORED: {Status.QUEUED, Status.DROPPED},
    Status.QUEUED: {Status.DRAFTING, Status.DROPPED},
    Status.DRAFTING: {Status.QC_FAILED, Status.QC_PASSED},
    Status.QC_FAILED: {Status.DRAFTING, Status.DROPPED},
    Status.QC_PASSED: {Status.PUBLISHING},
    Status.PUBLISHING: {Status.PUBLISHED},
    Status.PUBLISHED: {Status.INDEXING},
    Status.INDEXING: {Status.INDEXED, Status.DROPPED},
    Status.INDEXED: {Status.RANKING},
    Status.RANKING: {Status.DECAYED},
    Status.DECAYED: {Status.DRAFTING, Status.DROPPED},
    Status.DROPPED: set(),
}
class TransitionError(ValueError):
    pass
def assert_transition(cur: Status, nxt: Status) -> None:
    if nxt not in ALLOWED[cur]:
        raise TransitionError(f"{cur} -> {nxt} 불가")
