"""Local administrative commands.

`users.role` is the single source of authority for administrator rights. With
the `ADMIN_EMAILS` allowlist gone, a deployment that has never named an
administrator has none -- which is the safe state, but it means the first one
has to be set deliberately.

This is that mechanism, and it is deliberately a local command rather than an
endpoint: a bootstrap API would let anyone who reached it mint themselves an
administrator, which is the same escalation the allowlist allowed.

    python -m app.cli set-admin you@example.com
    python -m app.cli set-role you@example.com reviewer
    python -m app.cli list-admins
"""

import argparse
import sys

from .db.database import SessionLocal
from .db.models import ROLES, User


def _find(session, email: str) -> User | None:
    return (
        session.query(User)
        .filter(User.email == (email or "").strip().lower())
        .one_or_none()
    )


def cmd_set_admin(args) -> int:
    """Grant the admin role to an existing user."""
    with SessionLocal() as session:
        user = _find(session, args.email)
        if user is None:
            print(
                f"No user with email {args.email!r}. Register them through the "
                f"app first, then re-run this command.",
                file=sys.stderr,
            )
            return 1
        if user.role == "admin":
            print(f"{user.email} already has the admin role.")
            return 0
        previous = user.role
        user.role = "admin"
        # Bump the token version so tokens issued before the change stop
        # working: an existing session must not silently gain rights.
        user.token_version = (user.token_version or 0) + 1
        session.commit()
        print(f"{user.email}: {previous} -> admin (existing sessions invalidated)")
        return 0


def cmd_set_role(args) -> int:
    """Set any role on an existing user."""
    with SessionLocal() as session:
        user = _find(session, args.email)
        if user is None:
            print(f"No user with email {args.email!r}.", file=sys.stderr)
            return 1
        if user.role == args.role:
            print(f"{user.email} already has the {args.role} role.")
            return 0
        previous = user.role
        user.role = args.role
        user.token_version = (user.token_version or 0) + 1
        session.commit()
        print(f"{user.email}: {previous} -> {args.role} (existing sessions invalidated)")
        return 0


def cmd_list_admins(args) -> int:
    """Show who currently holds the admin or reviewer role."""
    with SessionLocal() as session:
        rows = (
            session.query(User)
            .filter(User.role.in_(("admin", "reviewer")))
            .order_by(User.role, User.email)
            .all()
        )
        if not rows:
            print("No administrators or reviewers.")
            print("To make the first administrator:")
            print("  python -m app.cli set-admin you@example.com")
            return 0
        for user in rows:
            print(f"{user.role:9} {user.email}")
        return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli",
        description="Local administration commands.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("set-admin", help="grant the admin role to a user")
    p.add_argument("email")
    p.set_defaults(func=cmd_set_admin)

    p = sub.add_parser("set-role", help=f"set a user's role ({', '.join(ROLES)})")
    p.add_argument("email")
    p.add_argument("role", choices=ROLES)
    p.set_defaults(func=cmd_set_role)

    p = sub.add_parser("list-admins", help="list administrators and reviewers")
    p.set_defaults(func=cmd_list_admins)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
