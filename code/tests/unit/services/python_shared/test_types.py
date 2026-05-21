import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))

from python_shared.types import AnnotationResult, Language, Register

def test_annotation_result_model():
    result = AnnotationResult(
        register=Register.formal,
        intent_label="Firm request",
        annotation_text="This is a formal request.",
        coaching_rationale="Japanese keigo signals strong intent.",
        suggestions=[],
    )
    assert result.register == Register.formal
    assert result.intent_label == "Firm request"

def test_language_enum():
    assert Language.vi == "vi"
    assert Language.ja == "ja"
