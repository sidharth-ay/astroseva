"""The pinned dependencies must be the versions the app is actually tested on.

Two packages were pinned below what the working environment runs, and both
pinned versions carry published CVEs:

  python-jose 3.3.0  ->  CVE-2024-33663
  python-multipart 0.0.9  ->  CVE-2024-53981

`requirements.txt` is what the Docker image installs, so the versions in it, not
the ones in the developer's venv, were what shipped.
"""

import re
from pathlib import Path

import pytest

REQUIREMENTS = (
    Path(__file__).resolve().parents[1] / "requirements.txt"
).read_text(encoding="utf-8")

PINNED = dict(
    re.findall(r"^([A-Za-z0-9_.-]+)==([^\s#]+)", REQUIREMENTS, re.M)
)

# Packages whose pinned version carried a published advisory.
VULNERABLE = {
    "python-jose": "3.3.0",    # CVE-2024-33663
    "python-multipart": "0.0.9",  # CVE-2024-53981
}


@pytest.mark.parametrize("package,bad", sorted(VULNERABLE.items()))
def test_the_vulnerable_pin_is_gone(package, bad):
    assert PINNED.get(package) != bad, (
        f"{package} is still pinned to {bad}, which has a published CVE"
    )


@pytest.mark.parametrize("package,bad", sorted(VULNERABLE.items()))
def test_the_pin_matches_the_installed_version(package, bad):
    """A pin below what is installed means the image differs from what was
    tested, which is how the CVE shipped in the first place."""
    from importlib.metadata import version

    installed = version(package)
    assert PINNED.get(package) == installed, (
        f"{package} pinned to {PINNED.get(package)} but "
        f"{installed} is installed and tested"
    )


def test_the_two_packages_actually_work_at_the_pinned_versions():
    """Bumped, so prove the JWT and multipart paths still function."""
    import jose
    import jose.jwt
    from multipart.multipart import parse_options_header  # noqa: F401

    assert jose.__version__ == PINNED["python-jose"]

    token = jose.jwt.encode({"sub": "42", "exp": 9999999999}, "k", algorithm="HS256")
    assert jose.jwt.decode(token, "k", algorithms=["HS256"])["sub"] == "42"


def test_the_algorithm_is_still_pinned_on_decode(client, test_sessionmaker):
    """A version bump must not loosen which algorithms are accepted."""
    import jose.jwt

    # A token signed with a different algorithm family must not verify.
    unsigned_style = jose.jwt.encode(
        {"sub": "42", "exp": 9999999999}, "k", algorithm="HS256"
    )
    with pytest.raises(Exception):
        jose.jwt.decode(
            unsigned_style, "k", algorithms=["RS256", "ES256", "none"]
        )
