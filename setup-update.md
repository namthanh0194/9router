# Cài Đặt và Cập Nhật 9Router Custom Trên Windows VPS

Tài liệu này dành cho **Windows VPS có giao diện Desktop/RDP**, chạy 9Router 24/7 bằng lệnh `9router` và lựa chọn **Hide to Tray (Background)**.

## Đường dẫn sử dụng

| Thành phần | Đường dẫn |
|---|---|
| Mã nguồn custom | `C:\9router-custom` |
| Thư mục build CLI | `C:\9router-custom\cli` |
| Dữ liệu, tài khoản và cấu hình | `%USERPROFILE%\.9router` |
| File tự khởi động của tray | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\9router.vbs` |
| Dashboard trên VPS | `http://localhost:20128/dashboard` |
| Dashboard từ máy khác | `http://<IP_VPS>:20128/dashboard` |

## Lưu ý quan trọng

- Không chạy `npm install -g 9router`. Lệnh đó tải bản upstream từ npm registry, không chứa thay đổi trong fork của bạn.
- Cài bản custom bằng `npm install -g .` tại `C:\9router-custom\cli`.
- Không xóa `%USERPROFILE%\.9router`; đây là nơi chứa tài khoản và cấu hình hiện tại.
- Yêu cầu Node.js `>= 20.9.0`, npm và Git.
- `Hide to Tray` không phải Windows Service. Sau khi VPS reboot, đúng tài khoản Windows phải đăng nhập ít nhất một lần để Windows Startup chạy 9Router, trừ khi VPS đã bật tự đăng nhập.

---

# Phần 1: Cài đặt lần đầu

## Bước 1: Mở PowerShell với quyền Administrator

Trong Start Menu:

1. Tìm **PowerShell**.
2. Chuột phải **Windows PowerShell**.
3. Chọn **Run as administrator**.

Kiểm tra môi trường:

```powershell
node --version
npm --version
git --version
```

Node.js phải từ `20.9.0` trở lên.

## Bước 2: Thoát 9Router gốc đang chạy

Cách an toàn nhất:

1. Mở khay hệ thống ở góc phải Taskbar.
2. Chuột phải biểu tượng 9Router.
3. Chọn **Exit**.

Nếu không thấy biểu tượng tray, chạy PowerShell:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*9router*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

Không cần chạy `npm uninstall -g 9router`; bước cài custom sẽ ghi đè package global cùng tên.

## Bước 3: Clone nhánh custom vào đường dẫn cố định

```powershell
cd C:\
git clone -b custom https://github.com/namthanh0194/9router.git C:\9router-custom
```

Kiểm tra nhánh:

```powershell
cd C:\9router-custom
git branch --show-current
```

Kết quả phải là:

```text
custom
```

Nếu thư mục `C:\9router-custom` đã tồn tại, không clone lại. Chuyển sang phần **Cập nhật sau khi push GitHub**.

## Bước 4: Cài dependency của ứng dụng

```powershell
cd C:\9router-custom
npm install
```

## Bước 5: Build và cài CLI custom toàn cục

```powershell
cd C:\9router-custom\cli
npm install
npm run build
npm install -g .
```

Lệnh `npm run build` tạo bản production standalone, phù hợp chạy 24/7 hơn `npm run dev`.

Kiểm tra Windows đang dùng đúng lệnh global:

```powershell
Get-Command 9router | Select-Object Source
npm root -g
9router --version
```

## Bước 6: Chạy và chọn Hide to Tray

```powershell
9router
```

Trong menu:

```text
Choose Interface (vX.Y.Z)
Server: http://localhost:20128

Web UI (Open in Browser)
Terminal UI (Interactive CLI)
Hide to Tray (Background)
Exit
```

Dùng phím mũi tên chọn **Hide to Tray (Background)** và nhấn **Enter**.

Sau khi chọn:

- 9Router chạy nền trong System Tray.
- Có thể đóng cửa sổ PowerShell.
- 9Router tạo file tự khởi động tại `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\9router.vbs`.
- Khi đóng Remote Desktop, chỉ **Disconnect**. Không chọn **Sign out / Log off**, vì đăng xuất sẽ đóng ứng dụng trong phiên Windows.

Kiểm tra dashboard:

```text
http://localhost:20128/dashboard
```

Từ máy khác:

```text
http://<IP_VPS>:20128/dashboard
```

---

# Phần 2: Cập nhật sau khi sửa code và push GitHub

Sau mỗi lần bạn commit và push code mới lên nhánh `custom`, thực hiện các bước sau trên VPS.

## Bước 1: Thoát 9Router đang chạy trong tray

Khuyên dùng:

1. Chuột phải biểu tượng 9Router trong System Tray.
2. Chọn **Exit**.

Nếu không thấy biểu tượng:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*9router*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## Bước 2: Kéo code mới nhất từ nhánh custom

```powershell
cd C:\9router-custom
git status --short
git pull --ff-only origin custom
```

`git status --short` nên không trả về dòng nào. Nếu có file đã sửa trực tiếp trên VPS, không chạy tiếp trước khi xác định có cần giữ thay đổi đó hay không.

Kiểm tra commit mới nhất:

```powershell
git log -1 --oneline
```

## Bước 3: Cài dependency và build lại

```powershell
cd C:\9router-custom
npm install

cd C:\9router-custom\cli
npm install
npm run build
npm install -g .
```

## Bước 4: Chạy lại Hide to Tray

```powershell
9router
```

Chọn **Hide to Tray (Background)** và nhấn **Enter**.

Kiểm tra:

```powershell
9router --version
cd C:\9router-custom
git rev-parse --short HEAD
```

Mở dashboard và kiểm tra version hiển thị khớp với `9router --version`.

---

# Phần 3: Rollback khi bản mới lỗi

> **Cảnh báo:** `git reset --hard` xóa mọi thay đổi chưa commit trong `C:\9router-custom`. Chỉ thực hiện khi bạn không sửa code trực tiếp trên VPS hoặc đã sao lưu thay đổi cần giữ.

## Bước 1: Thoát 9Router

Thoát từ System Tray, hoặc chạy:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*9router*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

## Bước 2: Chọn commit ổn định

```powershell
cd C:\9router-custom
git log --oneline -5
```

Sao chép SHA của commit chạy ổn định, ví dụ `dccb66c8`.

## Bước 3: Đưa source về commit ổn định

Thay `dccb66c8` bằng SHA bạn chọn:

```powershell
cd C:\9router-custom
git reset --hard dccb66c8
```

## Bước 4: Build và cài lại bản cũ

```powershell
cd C:\9router-custom
npm install

cd C:\9router-custom\cli
npm install
npm run build
npm install -g .
```

## Bước 5: Chạy lại

```powershell
9router
```

Chọn **Hide to Tray (Background)**.

---

# Lệnh cập nhật nhanh

Chỉ dùng khối lệnh này khi `git status --short` sạch và 9Router đã được thoát khỏi System Tray:

```powershell
cd C:\9router-custom
git pull --ff-only origin custom
npm install
cd C:\9router-custom\cli
npm install
npm run build
npm install -g .
9router
```

Sau đó chọn **Hide to Tray (Background)**.