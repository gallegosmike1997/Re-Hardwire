from collections import Counter

SOMATIC_TRIGGERS = [
    "panic", "shaking", "breathe", "chest", "flash", "memory",
    "racing", "sweating", "frozen",
]
DBT_TRIGGERS = [
    "text", "message", "reply", "say to them", "send",
    "argument", "fight", "screaming", "boundary",
]
ACT_TRIGGERS = [
    "stuck", "purpose", "values", "meaning", "avoiding",
    "direction", "let go", "control", "acceptance", "willingness",
]
CRISIS_TRIGGERS = [
    "suicide", "kill myself", "end it all", "want to die",
    "hurt myself", "hopeless", "no way out",
]


def get_user_state(user_input: str) -> str:
    """
    Lightweight weighted keyword classifier for routing user input
    to CBT/DBT/ACT/SOMATIC/CRISIS modules.
    """
    text_clean = user_input.lower()
    scores = Counter()

    # token-based scoring to reduce false positives from substrings
    tokens = text_clean.split()
    for token in tokens:
        if token in SOMATIC_TRIGGERS:
            scores["SOMATIC"] += 1
        if token in DBT_TRIGGERS:
            scores["DBT"] += 1
        if token in ACT_TRIGGERS:
            scores["ACT"] += 1
        if token in CRISIS_TRIGGERS:
            scores["CRISIS"] += 2

    if scores:
        return scores.most_common(1)[0][0]

    return "CBT"
