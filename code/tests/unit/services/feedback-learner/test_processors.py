import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/feedback-learner'))

from app.processors.fluency import compute_fluency_delta


def test_suggestion_used_increases_score():
    delta = compute_fluency_delta(event_type="suggestion_used", current_score=50)
    assert delta > 0

def test_pattern_understood_increases_score_more():
    delta_understood = compute_fluency_delta(event_type="pattern_understood", current_score=50)
    delta_used = compute_fluency_delta(event_type="suggestion_used", current_score=50)
    assert delta_understood >= delta_used

def test_score_cannot_exceed_100():
    delta = compute_fluency_delta(event_type="suggestion_used", current_score=99)
    assert 99 + delta <= 100
