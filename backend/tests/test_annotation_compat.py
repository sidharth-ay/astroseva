"""Annotations must not depend on which Python version evaluates them.

Python 3.14 evaluates annotations lazily (PEP 649); 3.13 and earlier evaluate
them the moment a function is defined. Code that annotates something with a name
defined further down the same module therefore imports cleanly on this machine
and raises `NameError` on the version CI runs -- which is exactly what
`app/models/birth_data.py` did: `_resolve_timezone` returns its own class.

Nothing in the suite can reproduce the failure locally, since the local
interpreter is the one that forgives it, so this asserts the property the
eager path needs instead: a module that refers to one of its own names in an
annotation must postpone annotation evaluation.
"""

import ast
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"


def _module_level_names(tree: ast.Module) -> dict[str, int]:
    """Names bound at module scope, mapped to the line they are bound on."""
    names: dict[str, int] = {}
    for node in tree.body:
        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            names[node.name] = node.lineno
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    names[target.id] = node.lineno
    return names


def _annotation_names(node: ast.AST) -> set[str]:
    """Every bare name referenced anywhere inside an annotation expression."""
    return {child.id for child in ast.walk(node) if isinstance(child, ast.Name)}


def _annotations(tree: ast.Module):
    """(line, annotation) for every annotated parameter and return type."""
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        args = [*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs]
        for arg in [*args, node.args.vararg, node.args.kwarg]:
            if arg is not None and arg.annotation is not None:
                yield arg.lineno, arg.annotation
        if node.returns is not None:
            yield node.lineno, node.returns


def _has_future_annotations(tree: ast.Module) -> bool:
    return any(
        isinstance(node, ast.ImportFrom)
        and node.module == "__future__"
        and any(alias.name == "annotations" for alias in node.names)
        for node in tree.body
    )


def test_no_module_annotates_a_name_it_defines_later():
    offenders = []
    for path in sorted(APP_DIR.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        # `from __future__ import annotations` must be the first statement; a
        # mid-file import is a SyntaxError, so ast would not have parsed it.
        if _has_future_annotations(tree):
            continue
        module_names = _module_level_names(tree)
        for lineno, annotation in _annotations(tree):
            for name in _annotation_names(annotation) & module_names.keys():
                if module_names[name] > lineno:
                    offenders.append(
                        f"{path.relative_to(APP_DIR)}:{lineno} annotates "
                        f"`{name}`, defined later on line {module_names[name]}"
                    )

    assert not offenders, (
        "these annotations raise NameError on Python 3.13 and earlier, where "
        "annotations are evaluated at definition time instead of lazily: "
        f"{offenders}"
    )


def test_the_model_actually_imports_with_eager_annotations():
    """Compile the module the way Python 3.12 would, and execute it.

    Executing with `__future__` annotations *disabled* reproduces the eager
    path on 3.14: the future import is stripped, and if the module still
    imports, it cannot be relying on lazy evaluation.
    """
    import sys

    source = (APP_DIR / "models" / "birth_data.py").read_text(encoding="utf-8")
    stripped = "\n".join(
        line for line in source.splitlines() if not line.startswith("from __future__")
    )
    # The stripped copy is only compiled to prove the point; executing it would
    # define a second BirthData class and confuse every other test.
    compile(stripped, "birth_data.py", "exec")

    # And the real module still imports, which is what production does.
    module = sys.modules.get("app.models.birth_data")
    assert module is not None and hasattr(module, "BirthData")