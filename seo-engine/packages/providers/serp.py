import hashlib
from typing import Any
from packages.providers.base import Provider
class SerpProvider(Provider):
    name = "serp"
    async def health(self) -> bool:
        return True
    async def top_results(self, keyword: str, device: str = "desktop", limit: int = 20) -> list[dict[str, Any]]:
        if self.mock:
            h = int(hashlib.sha256(keyword.encode()).hexdigest(), 16)
            s = keyword.replace(" ", "-")
            return [{"rank": i + 1, "url": f"https://c{h % 97}.example.com/{s}-{i}", "title": f"{keyword} {i + 1}"} for i in range(limit)]
        return []  # TODO: DataForSEO 어댑터
