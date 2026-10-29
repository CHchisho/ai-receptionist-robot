from app.services.venue_name import expand_official_venue_name


def test_short_name_becomes_full_official_name() -> None:
    text = "The workshop is in the Innovation Garage this afternoon."

    assert (
        expand_official_venue_name(text)
        == "The workshop is in the Nokia Espoo Innovation Garage this afternoon."
    )


def test_partial_prefixes_are_completed_once() -> None:
    assert (
        expand_official_venue_name("Visit Nokia Innovation Garage.")
        == "Visit Nokia Espoo Innovation Garage."
    )
    assert (
        expand_official_venue_name("Visit Espoo Innovation Garage.")
        == "Visit Nokia Espoo Innovation Garage."
    )


def test_full_name_is_not_duplicated() -> None:
    text = "Welcome to Nokia Espoo Innovation Garage."

    assert expand_official_venue_name(text) == text
    assert expand_official_venue_name(expand_official_venue_name(text)) == text


def test_finnish_case_ending_stays_on_the_full_name() -> None:
    assert (
        expand_official_venue_name(
            "Olen vastaanottaja Innovation Garagen tiloissa ja kerron Innovation Garagesta."
        )
        == "Olen vastaanottaja Nokia Espoo Innovation Garagen tiloissa ja kerron Nokia Espoo Innovation Garagesta."
    )


def test_already_full_finnish_form_is_not_duplicated() -> None:
    text = "Tietoa Nokia Espoo Innovation Garagesta."

    assert expand_official_venue_name(text) == text


def test_lowercase_mention_uses_official_casing() -> None:
    assert (
        expand_official_venue_name("meet us at innovation garage")
        == "meet us at Nokia Espoo Innovation Garage"
    )
