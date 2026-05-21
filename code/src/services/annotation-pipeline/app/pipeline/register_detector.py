from python_shared.types import Register


# Formal markers per language — extended in production by cultural pair DB lookup
_FORMAL_MARKERS = {
    "ja": ["いただけますと", "ございます", "よろしくお願い", "ご検討", "恐れ入ります"],
    "vi": ["kính thưa", "trân trọng", "xin phép", "kính mong"],
}

_INFORMAL_MARKERS = {
    "ja": ["じゃん", "だよね", "っていうか", "まじ"],
    "vi": ["bạn ơi", "nhé", "nha", "ơi"],
}


def detect_register(text: str, source_lang: str) -> Register:
    """Return the register of the input text."""
    formal = _FORMAL_MARKERS.get(source_lang, [])
    informal = _INFORMAL_MARKERS.get(source_lang, [])

    if any(marker in text for marker in formal):
        return Register.formal
    if any(marker in text for marker in informal):
        return Register.informal
    return Register.neutral
