import re

OFFICIAL_VENUE_NAME = "Nokia Espoo Innovation Garage"

# Finnish case endings used on the English stem (Garagen, Garagesta, Garagessa).
# Longer endings come first so "sta" is not left unmatched after "Garage".
_CASE_ENDING = r"(?:ssa|sta|een|lla|lta|lle|ksi|tta|na|en|a|n)"

_VENUE_MENTION = re.compile(
    rf"\b(?:(?:Nokia\s+Espoo|Nokia|Espoo)\s+)?Innovation\s+Garage(?:{_CASE_ENDING})?\b",
    re.IGNORECASE,
)


def expand_official_venue_name(text: str) -> str:
    """Rewrite every Innovation Garage mention to the full official name.

    "Innovation Garage", "Nokia Innovation Garage", and "Espoo Innovation Garage"
    become "Nokia Espoo Innovation Garage". A name that is already complete is
    left as that single full name. A Finnish ending stays attached (Garagen).
    """

    def replace(match: re.Match[str]) -> str:
        raw = match.group(0)
        garage = re.search(r"garage", raw, re.IGNORECASE)
        suffix = raw[garage.end() :].lower() if garage else ""
        return f"{OFFICIAL_VENUE_NAME}{suffix}"

    return _VENUE_MENTION.sub(replace, text)
