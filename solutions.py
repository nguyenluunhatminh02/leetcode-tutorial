"""
LeetCode Array Tutorial — Bộ 18 solution (6 bài x 3 cách).

Mỗi hàm đúng theo signature của LeetCode (mutate mảng đầu vào, trả về kết quả
theo yêu cầu của từng bài). Được verify bằng test_solutions.py.

Bảng nội dung:
  1. 88  Merge Sorted Array                 (Easy)   — merge từ cuối / copy+rồi merge / sort
  2. 27  Remove Element                     (Easy)   — 2 con trỏ ghi đè / swap với cuối / filter
  3. 26  Remove Duplicates from Sorted Array (Easy)  — 2 con trỏ / nén / groupby
  4. 80  Remove Duplicates from Sorted Array II (Medium) — đếm lần xuất hiện / trick khoảng cách 2 / Counter
  5. 169 Majority Element                   (Easy)   — Boyer–Moore / sort / Counter
  6. 189 Rotate Array                       (Medium) — reverse 3 lần / cyclic / mảng phụ (modulo)
"""

from collections import Counter
from itertools import groupby


# ============================================================
# 1. #88 Merge Sorted Array — Easy
# ============================================================

def merge_backwards(nums1, m, nums2, n):
    """
    Cách 1 — Two-pointer merge từ CUỐI (viết lùi).
    nums1 có đủ chỗ (m + n); 3 con trỏ: i = cuối phần nums1 gốc,
    j = cuối nums2, w = vị trí trống cuối cùng. Ghi phần tử lớn hơn
    vào nums1[w] rồi lùi lại. Không cần thêm mảng — O(1) thêm.
    """
    i, j, w = m - 1, n - 1, m + n - 1
    while j >= 0:
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[w] = nums1[i]
            i -= 1
        else:
            nums1[w] = nums2[j]
            j -= 1
        w -= 1
    return nums1


def merge_copy_front(nums1, m, nums2, n):
    """
    Cách 2 — Copy phần nums1 gốc ra mảng phụ, rồi merge từ ĐẦU.
    Hai con trỏ i (trong bản sao) và j (trong nums2), ghi kết quả
    vào nums1 từ vị trí 0. Dễ hiểu nhất, nhưng tốn O(m) thêm.
    """
    left = nums1[:m]            # bản sao phần thật của nums1
    i = j = w = 0
    while i < m and j < n:
        if left[i] <= nums2[j]:
            nums1[w] = left[i]
            i += 1
        else:
            nums1[w] = nums2[j]
            j += 1
        w += 1
    while i < m:                # dốc nốt phần còn lại
        nums1[w] = left[i]
        i += 1
        w += 1
    while j < n:
        nums1[w] = nums2[j]
        j += 1
        w += 1
    return nums1


def merge_sorted(nums1, m, nums2, n):
    """
    Cách 3 — Nối nums2 vào đuôi nums1 rồi sort tại chỗ.
    Ngắn nhất, đúng 100% — nhưng O((m+n)·log(m+n)) và không dạy
    được kỹ thuật gì. Dùng khi code cho nhanh, không phải lúc ôn phỏng vấn.
    """
    nums1[m:] = nums2[:n]
    nums1.sort()
    return nums1


# ============================================================
# 2. #27 Remove Element — Easy
# ============================================================

def remove_element_twopointer(nums, val):
    """
    Cách 1 — Two-pointer ghi đè (slow/fast, giữ thứ tự tương đối).
    w = vị trí "sẽ ghi" (slow), r = con trỏ duyệt (fast).
    Gặp phần tử != val thì ghi vào nums[w] và tăng w.
    w cuối cùng chính là k = số phần tử giữ lại.
    """
    w = 0
    for r in range(len(nums)):
        if nums[r] != val:
            nums[w] = nums[r]
            w += 1
    return w


def remove_element_swap(nums, val):
    """
    Cách 2 — Swap với phần tử cuối.
    Gặp nums[left] == val thì đổi chỗ với nums[right] và thu hẹp right;
    không tăng left vì phần tử mới swap vào cần được kiểm tra lại.
    Không giữ thứ tự tương đối nhưng ít phép ghi hơn (mỗi ô ghi nhiều nhất 1 lần).
    """
    left, right = 0, len(nums) - 1
    while left <= right:
        if nums[left] == val:
            nums[left], nums[right] = nums[right], nums[left]
            right -= 1
        else:
            left += 1
    return left


def remove_element_filter(nums, val):
    """
    Cách 3 — Lọc bằng list comprehension (dùng mảng phụ).
    Rõ ràng nhất, viết 2 dòng — nhưng tốn O(n) thêm và có thể bị hỏi
    "hãy làm in-place" trong phỏng vấn.
    """
    kept = [x for x in nums if x != val]
    nums[:] = kept
    return len(kept)


# ============================================================
# 3. #26 Remove Duplicates from Sorted Array — Easy
# ============================================================

def remove_duplicates_twopointer(nums):
    """
    Cách 1 — Two-pointer ghi đè (giữ thứ tự).
    w = vị trí ghi tiếp theo; vì mảng đã SORTED nên chỉ cần so nums[r]
    với nums[w - 1] (phần tử khác biệt gần nhất đã ghi) để biết có trùng không.
    """
    if not nums:
        return 0
    w = 1
    for r in range(1, len(nums)):
        if nums[r] != nums[w - 1]:
            nums[w] = nums[r]
            w += 1
    return w


def remove_duplicates_compress(nums):
    """
    Cách 2 — Nén sang list mới rồi ghi đè.
    Duyệt 1 lần, chỉ thêm phần tử khác phần tử liền trước (đã sort nên
    như vậy là đủ để loại trùng). Extra space O(n).
    """
    kept = []
    for x in nums:
        if not kept or kept[-1] != x:
            kept.append(x)
    nums[:] = kept
    return len(kept)


def remove_duplicates_groupby(nums):
    """
    Cách 3 — itertools.groupby.
    groupby gom các giá trị liên tiếp giống nhau thành các "run";
    chỉ cần ghi lại phần tử đầu mỗi run vào nums.
    """
    w = 0
    for val, _ in groupby(nums):
        nums[w] = val
        w += 1
    return w


# ============================================================
# 4. #80 Remove Duplicates from Sorted Array II — Medium
# ============================================================

def remove_duplicates_ii_counter(nums):
    """
    Cách 1 — Two-pointer + đếm số lần xuất hiện liên tiếp.
    Giữ run_count: thấy giá trị mới -> reset về 1; cùng giá trị -> +1.
    Chỉ ghi khi run_count <= 2. Trực quan, dễ nói ra trong phỏng vấn.
    """
    w = 0
    run_count = 0
    last = None
    for x in nums:
        run_count = run_count + 1 if x == last else 1
        last = x
        if run_count <= 2:
            nums[w] = x
            w += 1
    return w


def remove_duplicates_ii_trick(nums):
    """
    Cách 2 — Trick "so với vị trí cách 2 ô" (nums[w - 2]).
    Ghi nums[r] nếu nums[r] != nums[w - 2]: nếu đã có 2 (hoặc hơn) bản sao
    của giá trị đó trong vùng đã ghi, ô cách 2 vị trí về trước cũng mang
    cùng giá trị -> bỏ qua. Một dòng so sánh, không cần biến đếm.
    """
    w = 0
    for r in range(len(nums)):
        if w < 2 or nums[r] != nums[w - 2]:
            nums[w] = nums[r]
            w += 1
    return w


def remove_duplicates_ii_counterdict(nums):
    """
    Cách 3 — Đếm tần suất bằng Counter rồi dựng lại (extra space).
    Vì mảng đã sort, thứ tự chèn của Counter chính là thứ tự giá trị
    tăng dần: ghi lại mỗi giá trị tối đa 2 lần.
    """
    freq = Counter(nums)
    w = 0
    for x in freq:                      # dict giữ thứ tự chèn (Py3.7+)
        for _ in range(min(freq[x], 2)):
            nums[w] = x
            w += 1
    return w


# ============================================================
# 5. #169 Majority Element — Easy
# ============================================================

def majority_vote(nums):
    """
    Cách 1 — Boyer–Moore Majority Vote.
    Một "phiếu": trùng candidate thì +1, khác thì -1; votes về 0 thì
    đổi candidate. Vì phần tử major (> n/2 lần) luôn tồn tại, nó luôn
    là candidate cuối cùng. O(1) thêm — không cần biết trước gì.
    """
    candidate, votes = None, 0
    for x in nums:
        if votes == 0:
            candidate = x
        votes += 1 if x == candidate else -1
    return candidate


def majority_sorted(nums):
    """
    Cách 2 — Sort rồi lấy phần tử chính giữa.
    Sau khi sort, phần tử major chiếm > n/2 vị trí, nên nó chắc chắn
    phủ qua vị trí giữa nums[n // 2]. O(n log n) thời gian.
    """
    nums.sort()
    return nums[len(nums) // 2]


def majority_counter(nums):
    """
    Cách 3 — Đếm tần suất bằng Counter.
    Trực tiếp nhất: đếm mọi phần tử, trả về cái xuất hiện nhiều nhất.
    O(n) thời gian nhưng O(n) thêm — đổi bộ nhớ lấy sự đơn giản.
    """
    return Counter(nums).most_common(1)[0][0]


# ============================================================
# 6. #189 Rotate Array — Medium
# ============================================================

def rotate_reverse(nums, k):
    """
    Cách 1 — Reverse 3 lần.
    k %= n rồi: reverse cả mảng -> reverse đoạn [0, k) -> reverse [k, n).
    Mỗi phần tử bị đổi chỗ 2 lần -> O(n) thời gian, O(1) thêm.
    """
    n = len(nums)
    if n < 2:
        return
    k %= n
    if k == 0:
        return

    def reverse(lo, hi):
        while lo < hi:
            nums[lo], nums[hi] = nums[hi], nums[lo]
            lo += 1
            hi -= 1

    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)


def rotate_cyclic(nums, k):
    """
    Cách 2 — Cyclic replacements (xích phần tử "juggling").
    Đặt từng phần tử vào đúng vị trí (i + k) % n của nó; các xích
    được sinh ra theo vòng lặp bắt đầu từ 0, 1, ... cho tới khi
    mọi phần tử đã được đặt (đếm bằng count). Mỗi phần tử ghi đúng 1 lần.
    """
    n = len(nums)
    if n < 2:
        return
    k %= n
    if k == 0:
        return
    placed = 0
    start = 0
    while placed < n:
        cur = start
        carry = nums[start]
        while True:
            nxt = (cur + k) % n
            carry, nums[nxt] = nums[nxt], carry
            cur = nxt
            placed += 1
            if cur == start:
                break
        start += 1


def rotate_extra(nums, k):
    """
    Cách 3 — Mảng phụ + tính vị trí bằng modulo.
    rotated[(i + k) % n] = nums[i] là công thức gốc của phép xoay;
    dễ hiểu nhất về mặt toán, tốn O(n) thêm.
    (Bản rút gọn Python-idiomatic: nums[:] = nums[-k:] + nums[:-k].)
    """
    n = len(nums)
    if n == 0:
        return
    k %= n
    if k == 0:
        return
    rotated = [0] * n
    for i, x in enumerate(nums):
        rotated[(i + k) % n] = x
    nums[:] = rotated