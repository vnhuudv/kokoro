import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/annotation-pipeline'))

from python_shared.types import AnnotateRequest, AnnotationResult, IntentResult, Register, Language, SuggestionChip
from app.pipeline.annotator import build_annotation

def test_annotate_request_validates():
    req = AnnotateRequest(
        message_id="123.456",
        channel_id="C001",
        sender_id="U001",
        sender_culture=Language.vi,
        text="Please review by end of week.",
    )
    assert req.sender_culture == Language.vi

def test_annotation_result_has_micro_text_and_message_id():
    result = AnnotationResult(
        message_id="123.456",
        register=Register.neutral,
        intent_label="Firm deadline request",
        micro_text="Cultural context here.",
        coaching_rationale="Rationale here.",
    )
    assert result.micro_text == "Cultural context here."
    assert result.message_id == "123.456"

def test_intent_result_validates():
    intent = IntentResult(
        intent_label="Firm deadline request",
        risk_category="time_commitment_ambiguity",
        micro_text="End of week is often read as soft.",
        suggestions=[SuggestionChip(label="Reply formally", register=Register.formal, text="承知いたしました。")],
        coaching_rationale="Vietnamese directness can read as ambiguous.",
    )
    assert intent.intent_label == "Firm deadline request"

def test_build_annotation_maps_all_intent_fields():
    intent = IntentResult(
        intent_label="Firm deadline request",
        risk_category="time_commitment_ambiguity",
        micro_text="End of week is often read as soft.",
        coaching_rationale="Vietnamese directness can read as ambiguous.",
        suggestions=[SuggestionChip(label="Reply formally", register=Register.formal, text="承知いたしました。")],
    )
    result = build_annotation("123.456", Register.neutral, intent)
    assert result.message_id == "123.456"
    assert result.register == Register.neutral
    assert result.intent_label == "Firm deadline request"
    assert result.risk_category == "time_commitment_ambiguity"
    assert result.micro_text == "End of week is often read as soft."
    assert result.coaching_rationale == "Vietnamese directness can read as ambiguous."
    assert len(result.suggestions) == 1
    assert result.suggestions[0].label == "Reply formally"
