# Upstream Sync

## Remote and branch roles

- **Upstream source:** [`decolua/9router`](https://github.com/decolua/9router)
- **`origin`:** fork cá nhân: [`namthanh0194/9router`](https://github.com/namthanh0194/9router)
- **`upstream`:** repo gốc `https://github.com/decolua/9router.git`
- **`upstream-master`:** branch local gần nguyên bản. Chỉ đồng bộ fast-forward từ `upstream/master`; không viết custom vào đây.
- **`custom`:** branch làm việc chứa custom. Merge update từ `upstream-master` vào branch này.

`master` được giữ nguyên như checkpoint fork ban đầu. Làm việc và push trên `custom`.

## Lấy update mới

```bash
git fetch upstream --prune
git switch upstream-master
git merge --ff-only upstream/master
git switch custom
git log --oneline custom..upstream-master
git diff --stat custom...upstream-master
git diff custom...upstream-master
```

Đọc `CHANGELOG.md` nếu upstream thay đổi nó. Review commit và diff trước khi merge.

## Xem commit và diff

```bash
# Commit upstream chưa có trong custom
git log --oneline custom..upstream-master

# Diff tổng quan
git diff --stat custom...upstream-master

# Diff chi tiết
git diff custom...upstream-master

# Xem custom chưa có trong upstream snapshot
git log --oneline upstream-master..custom
```

## Merge upstream vào custom

```bash
git switch custom
git merge upstream-master
git status
git push origin custom
```

Push lần đầu nếu remote chưa có branch:

```bash
git push -u origin custom
```

## Xử lý conflict

1. Dừng, đọc cả phiên bản `HEAD` (custom) và `upstream-master`.
2. Giữ behavior custom hiện tại, trừ khi upstream đã thay đổi contract khiến behavior đó không còn phù hợp.
3. Sửa conflict, rồi kiểm tra phần tích hợp liên quan.
4. Stage các file đã resolve và hoàn tất merge:

```bash
git status
git add <resolved-files>
git commit
git diff --check
```

Hủy merge chưa hoàn tất khi cần quay lại trạng thái trước merge:

```bash
git merge --abort
```

## Rollback merge đã commit

Không dùng `reset --hard` trên branch đã chia sẻ. Tạo commit đảo merge:

```bash
git log --oneline --merges
git revert -m 1 <merge-commit>
git push origin custom
```

Nếu chưa push và cần quyết định lại, tạo branch backup trước mọi thao tác có tính phá hủy:

```bash
git branch backup/custom-before-recovery
git status
```
