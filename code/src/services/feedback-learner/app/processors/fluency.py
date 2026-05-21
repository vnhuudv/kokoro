_SCORE_DELTAS: dict[str, int] = {
    "annotation_viewed": 1,
    "suggestion_used": 3,
    "suggestion_dismissed": 0,
    "pattern_understood": 5,
    "coaching_panel_opened": 2,
    "pre_send_flag_viewed": 1,
    "pre_send_original_sent": 0,
    "pre_send_suggestion_used": 3,
}


def compute_fluency_delta(event_type: str, current_score: int) -> int:
    """Return how much the fluency score should increase for this event."""
    delta = _SCORE_DELTAS.get(event_type, 0)
    # Cap at 100
    return min(delta, 100 - current_score)
