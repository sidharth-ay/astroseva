"""North Indian chart geometry regression test.

The 12 cells must tile the 400x400 frame exactly: four inner diamonds
(1, 4, 7, 10) of area 20000 each and eight border triangles of area 10000
each. The previous table gave houses 11 and 12 the same three points, so one
cell was drawn twice, another was left empty, and the total area came to
150000 instead of 160000.
"""

import re
from pathlib import Path

CHART = (Path(__file__).resolve().parents[2]
         / "frontend" / "src" / "components" / "KundliChart.tsx")


def _houses():
    src = CHART.read_text(encoding="utf-8")
    block = re.search(r"const HOUSES.*?\];", src, re.S)
    assert block, "HOUSES table not found in KundliChart.tsx"
    rows = re.findall(r'house:\s*(\d+),\s*points:\s*"([^"]+)"', block.group(0))
    return {int(h): [tuple(float(v) for v in p.split(",")) for p in pts.split()]
            for h, pts in rows}


def _area(v):
    total = 0.0
    for i in range(len(v)):
        x1, y1 = v[i]
        x2, y2 = v[(i + 1) % len(v)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def _centroid(v):
    return (sum(p[0] for p in v) / len(v), sum(p[1] for p in v) / len(v))


def test_twelve_cells_present():
    houses = _houses()
    assert sorted(houses) == list(range(1, 13))


def test_no_duplicate_cells():
    houses = _houses()
    seen = {}
    for h, verts in houses.items():
        key = tuple(sorted(verts))
        assert key not in seen, f"house {h} duplicates house {seen[key]}"
        seen[key] = h


def test_cells_tile_the_frame():
    houses = _houses()
    total = sum(_area(v) for v in houses.values())
    assert abs(total - 400 * 400) < 1, f"cells cover {total}, expected 160000"


def test_diamond_houses_are_larger():
    """Houses 1/4/7/10 are the four diamonds; the rest are border triangles."""
    houses = _houses()
    for h in (1, 4, 7, 10):
        assert abs(_area(houses[h]) - 20000) < 1, f"house {h} is not a diamond"
    for h in (2, 3, 5, 6, 8, 9, 11, 12):
        assert abs(_area(houses[h]) - 10000) < 1, f"house {h} is not a triangle"


def test_key_house_positions():
    """1 top, 4 left, 7 bottom, 10 right; 7th is opposite the 1st."""
    houses = _houses()
    c1, c4 = _centroid(houses[1]), _centroid(houses[4])
    c7, c10 = _centroid(houses[7]), _centroid(houses[10])

    assert c1[0] == 200 and c1[1] < 200, "ascendant cell must be top-centre"
    assert c4[0] < 200 and c4[1] == 200, "IC cell must be left-centre"
    assert c7[0] == 200 and c7[1] > 200, "Descendant cell must be bottom-centre"
    assert c10[0] > 200 and c10[1] == 200, "MC cell must be right-centre"

    # 1st and 7th sit on the same vertical axis, 180 degrees apart.
    assert abs(c1[0] - c7[0]) < 1
    assert c7[1] - c1[1] == 200


def test_houses_run_anticlockwise():
    """From the top diamond, house 2 must be top-left (anticlockwise)."""
    houses = _houses()
    c2 = _centroid(houses[2])
    c1 = _centroid(houses[1])
    # Anticlockwise from top-centre means decreasing x at the same height band.
    assert c2[0] < c1[0], "2nd house must lie left of the ascendant cell"
    assert c2[1] < c1[1], "2nd house must sit higher than the ascendant cell"


def test_only_diagonals_are_drawn():
    """A North Indian chart has no vertical/horizontal cross."""
    src = CHART.read_text(encoding="utf-8")
    block = re.search(r"const CENTER_LINES.*?\];", src, re.S).group(0)
    lines = re.findall(r'"([^"]+)"', block)
    assert len(lines) == 2, f"expected 2 diagonals, found {len(lines)}"
    for line in lines:
        x1, y1, x2, y2 = (float(v) for v in line.replace(",", " ").split())
        # A diagonal is neither axis-aligned (a cross) nor vertical/horizontal.
        assert abs(x2 - x1) > 1 and abs(y2 - y1) > 1, f"{line} is axis-aligned"
