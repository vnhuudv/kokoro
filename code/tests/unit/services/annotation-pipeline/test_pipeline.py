import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/annotation-pipeline'))

from app.pipeline.anonymiser import anonymise
from app.pipeline.register_detector import detect_register
from python_shared.types import Register

def test_anonymise_removes_placeholder_name():
    result = anonymise("Hello [NAME], please review this.")
    assert "[NAME]" not in result or result == "Hello [REDACTED], please review this."

def test_detect_register_returns_register_enum():
    result = detect_register("ご検討いただけますと幸いです", source_lang="ja")
    assert result in (Register.formal, Register.neutral, Register.informal)
