from abc import ABC, abstractmethod
from packages.shared.config import settings
class Provider(ABC):
    name: str = "base"
    @property
    def mock(self) -> bool:
        return settings.mock_mode
    @abstractmethod
    async def health(self) -> bool: ...
