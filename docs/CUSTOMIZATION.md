# Customization Register

## Purpose

Fork này tồn tại để giữ các thay đổi riêng của `namthanh0194` trên nền `decolua/9router`, nhưng vẫn cập nhật upstream có kiểm soát.

## Rules

- Không sửa `upstream-master` nếu không thật sự cần; branch này chỉ dùng để mirror upstream.
- Mọi custom feature quan trọng phải có entry bên dưới.
- Luôn ghi file sửa, lý do, dependency/env/database/API/Docker có liên quan.
- Khi upstream có tính năng tương đương, ghi nhận việc đánh giá trước khi giữ hoặc bỏ custom patch.

## Customizations

<!-- Copy template này cho mỗi thay đổi. -->

## Tên thay đổi

### Mục đích

- Mô tả vấn đề cần giải quyết.

### Upstream behavior

- Mô tả behavior của `decolua/9router` trước custom.

### Custom behavior

- Mô tả behavior fork sau custom.

### Files changed

- `path/to/file` — lý do.

### Environment variables

- Tên biến, giá trị mặc định, nơi dùng, ảnh hưởng bảo mật. Ghi `Không có` nếu không dùng.

### Database changes

- Migration/schema/data migration và rollback. Ghi `Không có` nếu không dùng.

### API changes

- Endpoint/request/response/compatibility. Ghi `Không có` nếu không dùng.

### Docker changes

- Dockerfile/compose/image/runtime config. Ghi `Không có` nếu không dùng.

### Dependency changes

- Package, version, lý do, tác động cập nhật. Ghi `Không có` nếu không dùng.

### Upgrade notes

- Thứ tự deploy, migration, biến môi trường, xác minh.

### Conflict risk

- File/vùng dễ conflict với upstream và cách review.
