"""
Test harness: verify 18 solutions chống lại kết quả tham chiếu (brute force)
trên các test cases chính thức + cases biên. Chạy: python3 test_solutions.py
"""
import random
import sys
from collections import Counter

import solutions as S

PASS, FAIL = 0, 0


def check(name, actual, expected):
    global PASS, FAIL
    if actual == expected:
        PASS += 1
    else:
        FAIL += 1
        print(f"  ✗ {name}: got {actual!r}, expected {expected!r}")


# ---------- brute-force references ----------
def ref_merge(nums1, m, nums2, n):
    return sorted(nums1[:m] + nums2[:n])


def ref_remove(nums, val):
    return [x for x in nums if x != val]


def ref_uniq_run(nums):  # max 1 copy
    out = []
    for x in nums:
        if x != (out[-1] if out else object()):
            out.append(x)
    return out


def ref_uniq_2(nums):    # max 2 copies
    out = []
    for x in nums:
        ok = sum(1 for y in out if y == x) < 2
        if ok:
            out.append(x)
    return out


def ref_majority(big):  # brute-force với constraint bigger than n/2
    from collections import defaultdict
    f = defaultdict(int)
    n = len(big)
    for x in big:
        f[x] += 1
    for x, c in f.items():
        if c > n // 2:
            return x
    raise AssertionError("no majority")


def ref_rotate(nums, k):
    n = len(nums)
    if n:
        k %= n
        return nums[-k:] + nums[:-k]
    return []


# ============================================================
# Problem 88 — Merge Sorted Array (official + edge cases)
# ============================================================
def test_merge():
    official = [
        ([1, 2, 3, 0, 0, 0], 3, [2, 5, 6], 3, [1, 2, 2, 3, 5, 6]),
        ([1], 1, [], 0, [1]),
        ([0], 0, [1], 1, [1]),
    ]
    edges = [
        ([0, 0], 0, [1, 1], 2, [1, 1]),
        ([5, 0], 1, [4], 1, [4, 5]),
        ([1, 2, 3, 0, 0], 3, [1, 1], 2, [1, 1, 1, 2, 3]),
        ([4, 5, 6, 0, 0, 0], 3, [1, 2, 3], 3, [1, 2, 3, 4, 5, 6]),
        ([2, 0], 1, [2], 1, [2, 2]),
    ]
    cases = official + edges
    print("Problem 88 (Merge Sorted Array):")
    for fn in (S.merge_backwards, S.merge_copy_front, S.merge_sorted):
        print(f"  → {fn.__name__}")
        for a, m, b, n, expected in cases:
            got = fn(a[:], m, b[:], n)
            check(f"{fn.__name__}({a},{m},{b},{n})", got, expected)
    # fuzz: m,n <= 6, values in [-2, 2] (đủ nhỏ để total order complex)
    rng = random.Random(88)
    for_fn = (S.merge_backwards, S.merge_copy_front, S.merge_sorted)
    for _ in range(300):
        m, n = rng.randint(0, 6), rng.randint(0, 6)
        if m + n == 0:
            continue
        a = sorted(rng.randint(-2, 2) for _ in range(m))
        b = sorted(rng.randint(-2, 2) for _ in range(n))
        expected = ref_merge(a, m, b, n)
        for fn in for_fn:
            got = fn(a[:] + [0] * len(b), m, b[:], n)
            check(f"fuzz88 {fn.__name__}", got, expected)
    print()


# ============================================================
# Problem 27 — Remove Element (official + edge cases)
# ============================================================
def test_remove_element():
    cases = [
        ([3, 2, 2, 3], 3, [2, 2]),
        ([0, 1, 2, 2, 3, 0, 4, 2], 2, [0, 1, 3, 0, 4]),
        ([], 1, []),
        ([1], 1, []),
        ([1], 2, [1]),
        ([1, 1, 1], 1, []),
        ([5, 5, 5, 5], 5, []),
        ([4, 4, 4, 1], 4, [1]),
    ]
    print("Problem 27 (Remove Element):")
    for fn in (S.remove_element_twopointer, S.remove_element_swap, S.remove_element_filter):
        print(f"  → {fn.__name__}")
        for arr, val, expected in cases:
            a = arr[:]
            k = fn(a, val)
            # Bài 27 KHÔNG yêu cầu giữ thứ tự tương đối → so sánh theo multiset
            ok = k == len(expected) and sorted(a[:k]) == sorted(expected)
            check(f"{fn.__name__}({arr},{val}) k={k} prefix={a[:k]}", ok, True)
    rng = random.Random(27)
    for _ in range(300):
        n = rng.randint(0, 12)
        arr = [rng.randint(0, 3) for _ in range(n)]
        val = rng.randint(0, 3)
        expected = ref_remove(arr, val)
        for fn in (S.remove_element_twopointer, S.remove_element_swap, S.remove_element_filter):
            a = arr[:]
            k = fn(a, val)
            ok = k == len(expected) and sorted(a[:k]) == sorted(expected)
            # swap không giữ thứ tự nên so sánh theo multiset
            check(f"fuzz27 {fn.__name__}", ok, True)
    print()


# ============================================================
# Problem 26 — Remove Duplicates (official + edge cases)
# ============================================================
def test_remove_duplicates():
    cases = [
        ([1, 1, 2], [1, 2]),
        ([0, 0, 1, 1, 1, 2, 2, 3, 3, 4], [0, 1, 2, 3, 4]),
        ([], []),
        ([1], [1]),
        ([1, 1, 1], [1]),
        ([1, 2], [1, 2]),
    ]
    print("Problem 26 (Remove Duplicates I):")
    for fn in (S.remove_duplicates_twopointer, S.remove_duplicates_compress, S.remove_duplicates_groupby):
        print(f"  → {fn.__name__}")
        for arr, expected in cases:
            a = arr[:]
            k = fn(a)
            ok = k == len(expected) and a[:k] == expected
            check(f"{fn.__name__}({arr})", ok, True)
    rng = random.Random(26)
    for _ in range(300):
        n = rng.randint(0, 12)
        arr = sorted(rng.randint(0, 4) for _ in range(n))
        expected = ref_uniq_run(arr)
        for fn in (S.remove_duplicates_twopointer, S.remove_duplicates_compress, S.remove_duplicates_groupby):
            a = arr[:]
            k = fn(a)
            ok = k == len(expected) and a[:k] == expected
            check(f"fuzz26 {fn.__name__}", ok, True)
    print()


# ============================================================
# Problem 80 — Remove Duplicates II (official + edge cases)
# ============================================================
def test_remove_duplicates_ii():
    cases = [
        ([1, 1, 1, 2, 2, 3], [1, 1, 2, 2, 3]),
        ([0, 0, 1, 1, 1, 1, 2, 3, 3], [0, 0, 1, 1, 2, 3, 3]),
        ([], []),
        ([1], [1]),
        ([1, 1], [1, 1]),
        ([1, 1, 1], [1, 1]),
        ([1, 1, 1, 1, 1], [1, 1]),
        ([1, 2, 3], [1, 2, 3]),
        ([1, 1, 2, 2, 3, 3], [1, 1, 2, 2, 3, 3]),
    ]
    print("Problem 80 (Remove Duplicates II):")
    for fn in (S.remove_duplicates_ii_counter, S.remove_duplicates_ii_trick, S.remove_duplicates_ii_counterdict):
        print(f"  → {fn.__name__}")
        for arr, expected in cases:
            a = arr[:]
            k = fn(a)
            ok = k == len(expected) and a[:k] == expected
            check(f"{fn.__name__}({arr})", ok, True)
    rng = random.Random(80)
    for _ in range(300):
        n = rng.randint(0, 12)
        arr = sorted(rng.randint(0, 4) for _ in range(n))
        expected = ref_uniq_2(arr)
        for fn in (S.remove_duplicates_ii_counter, S.remove_duplicates_ii_trick, S.remove_duplicates_ii_counterdict):
            a = arr[:]
            k = fn(a)
            ok = k == len(expected) and a[:k] == expected
            check(f"fuzz80 {fn.__name__}", ok, True)
    print()


# ============================================================
# Problem 169 — Majority Element (official + edge cases)
# ============================================================
def test_majority():
    cases = [
        ([3, 2, 3], 3),
        ([2, 2, 1, 1, 1, 2, 2], 2),
        ([6, 5, 5], 5),
        ([1], 1),
        ([100], 100),
        ([1, 1, 100, 1, 2], 1),
    ]
    print("Problem 169 (Majority Element):")
    for fn in (S.majority_vote, S.majority_sorted, S.majority_counter):
        print(f"  → {fn.__name__}")
        for arr, expected in cases:
            got = fn(arr[:])
            check(f"{fn.__name__}({arr})", got, expected)
    rng = random.Random(169)
    for _ in range(300):
        n = rng.randint(1, 13)
        v = rng.randint(0, 5)
        # dựng mảng đảm bảo có đa số: v xuất hiện > n/2 lần
        arr = [v] * (n // 2 + 1) + [rng.randint(0, 5) for _ in range(n - (n // 2 + 1))]
        rng.shuffle(arr)
        expected = ref_majority(arr)
        for fn in (S.majority_vote, S.majority_sorted, S.majority_counter):
            got = fn(arr[:])
            check(f"fuzz169 {fn.__name__}", got, expected)
    print()


# ============================================================
# Problem 189 — Rotate Array (official + edge cases)
# ============================================================
def test_rotate():
    cases = [
        ([1, 2, 3, 4, 5, 6, 7], 3, [5, 6, 7, 1, 2, 3, 4]),
        ([-1, -100, 3, 99], 2, [3, 99, -1, -100]),
        ([1], 0, [1]),
        ([1], 10, [1]),
        ([1, 2], 3, [2, 1]),          # k > n
        ([1, 2, 3], 6, [1, 2, 3]),    # k bội của n
        ([1, 2, 3, 4], 2, [3, 4, 1, 2]),
    ]
    print("Problem 189 (Rotate Array):")
    for fn in (S.rotate_reverse, S.rotate_cyclic, S.rotate_extra):
        print(f"  → {fn.__name__}")
        for arr, k, expected in cases:
            a = arr[:]
            if fn is S.rotate_extra:
                a = arr[:]
            fn(a, k)
            check(f"{fn.__name__}({arr}, {k})", a, expected)
    rng = random.Random(189)
    for _ in range(300):
        n = rng.randint(0, 12)
        arr = [rng.randint(-3, 3) for _ in range(n)]
        k = rng.randint(0, 25)
        expected = ref_rotate(arr, k)
        for fn in (S.rotate_reverse, S.rotate_cyclic, S.rotate_extra):
            a = arr[:]
            fn(a, k)
            check(f"fuzz189 {fn.__name__}", a, expected)
    print()


if __name__ == "__main__":
    test_merge()
    test_remove_element()
    test_remove_duplicates()
    test_remove_duplicates_ii()
    test_majority()
    test_rotate()
    print(f"===== {PASS} passed, {FAIL} failed =====")
    sys.exit(1 if FAIL else 0)