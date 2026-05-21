import re


_PII_PATTERNS = [
    (r'\[NAME\]', '[REDACTED]'),                        # pre-existing name placeholders
    (r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', '[REDACTED]'),   # full names
    (r'\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b', '[EMAIL]'), # email addresses
]


def anonymise(text: str) -> str:
    """Strip PII from text before it leaves the device."""
    for pattern, replacement in _PII_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text
