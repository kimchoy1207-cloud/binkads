from dataclasses import dataclass
from packages.providers.base import Provider
from packages.shared.config import settings
@dataclass
class LLMResult:
    text: str
    model: str
    tokens: int
class LLMProvider(Provider):
    name = "llm"
    async def health(self) -> bool:
        return True
    async def complete(self, prompt: str, tier: str = "cheap") -> LLMResult:
        model = settings.llm_model_premium if tier == "premium" else settings.llm_model_cheap
        if self.mock:
            return LLMResult(text="# " + prompt[:60] + "\n\n" + "목업 본문입니다. " * 80, model="mock", tokens=len(prompt) // 4)
        return LLMResult(text="", model=model, tokens=0)  # TODO: 실제 호출
