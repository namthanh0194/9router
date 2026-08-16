# AI Maintenance Guide

Tài liệu này là checklist bắt buộc cho AI agent khi cập nhật fork từ [`decolua/9router`](https://github.com/decolua/9router).

## Non-negotiable rules

- Không chạy `git reset --hard`, `git push --force`, hoặc xóa branch nếu user chưa yêu cầu rõ.
- Không tự bỏ custom code khi gặp conflict.
- Luôn đọc code của cả upstream và fork trước khi quyết định.
- Ưu tiên thay đổi nhỏ, dễ review.
- Nếu upstream đã có tính năng tương đương custom code, báo rõ và đề xuất bỏ custom patch trùng lặp; không tự xóa patch.
- Nếu upstream refactor lớn, kiểm tra toàn bộ integration liên quan. Không chỉ resolve conflict cú pháp.

## Update checklist

1. Kiểm tra trạng thái để không ghi đè thay đổi hiện có:

   ```bash
   git status --short --branch
   git branch -vv
   git remote -v
   ```

2. Fetch upstream, không merge ngay:

   ```bash
   git fetch upstream --prune
   git switch upstream-master
   git merge --ff-only upstream/master
   git switch custom
   ```

3. Review update trước khi thay đổi:

   ```bash
   git log --oneline custom..upstream-master
   git diff --stat custom...upstream-master
   git diff custom...upstream-master
   git log --oneline upstream-master..custom
   ```

4. Đọc `CHANGELOG.md` nếu có thay đổi upstream. Đọc tài liệu và code vùng bị ảnh hưởng.

5. Xác định phần custom liên quan bằng `docs/CUSTOMIZATION.md`. Liệt kê risk trước khi sửa: contract/API, schema/database, env, provider behavior, Docker/deploy, migration, và test coverage.

6. Chọn cách an toàn nhất:
   - Thông thường: merge `upstream-master` vào `custom`.
   - Chỉ cần vài commit độc lập: đề xuất cherry-pick trước khi chạy.

   ```bash
   git switch custom
   git merge upstream-master
   ```

7. Khi conflict: đọc cả hai phía, giữ behavior custom hiện tại trừ khi upstream làm nó không còn phù hợp. Resolve theo behavior, không theo cú pháp. Sau refactor lớn, kiểm tra mọi caller/integration liên quan.

8. Chạy các kiểm tra repo hỗ trợ:

   ```bash
   npx eslint .
   npm run build
   # Sau khi cài dependencies cho tests:
   # npx vitest run
   ```

   Test suite checkout sạch có known failures; dùng baseline trong `tests/__baseline__/` theo `CLAUDE.md` để nhận diện regression, không kết luận raw suite phải all-green.

9. Cập nhật `docs/CUSTOMIZATION.md` với custom mới, thay đổi tương thích, dependency/env/database/API/Docker, và conflict risk. Cập nhật `docs/UPSTREAM-SYNC.md` nếu topology hoặc lệnh sync đổi.

10. Chỉ kết luận thành công sau khi verify status, branch, remotes, diff, lint/build/tests phù hợp:

   ```bash
   git status --short --branch
   git branch -vv
   git remote -v
   git diff --check
   ```
