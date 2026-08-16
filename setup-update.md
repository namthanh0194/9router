# Hướng Dẫn Cài Đặt & Cập Nhật 9Router (Bản Custom) Trên VPS Ubuntu & Windows

Tài liệu này hướng dẫn chi tiết từng bước từ cài đặt lần đầu, cập nhật sau khi push GitHub, đến xử lý sự cố (rollback) cho cả hai hệ điều hành:
1. **Ubuntu VPS / Linux Server**
2. **Windows VPS / Windows Server**

---

## 📌 Lưu Ý Quan Trọng Chung Cho Mọi Hệ Điều Hành

1. **Tuyệt đối không dùng lệnh `npm install -g 9router`**:
   - Lệnh này tải bản gốc từ npm registry của tác giả, làm mất toàn bộ tính năng và bản vá của bản custom.
   - Luôn cài đặt trực tiếp từ thư mục `cli` của mã nguồn này bằng `npm install -g .` (hoặc `sudo npm install -g .` trên Ubuntu).
2. **Toàn bộ cấu hình và tài khoản được bảo toàn**:
   - Dữ liệu lưu tại:
     - **Ubuntu / Linux**: `~/.9router` (`/home/<user>/.9router`)
     - **Windows**: `%USERPROFILE%\.9router` (`C:\Users\<user>\.9router`)
   - Cài đè hoặc cập nhật mã nguồn không làm mất cấu hình, API key hay tài khoản đã thêm.
3. **Yêu cầu hệ thống**:
   - **Node.js**: Phiên bản `>= 20.9.0` (khuyên dùng Node 20 LTS hoặc 22 LTS).
   - **Git**: Đã cài đặt trên máy chủ.
   - **Cổng dịch vụ mặc định**: `20128` (Dashboard: `http://<IP_VPS>:20128/dashboard`).

---

## 🗺️ Bảng Đối Chiếu Đường Dẫn & Lệnh Giữa Ubuntu và Windows

| Thành phần / Thao tác | Ubuntu VPS (Linux) | Windows VPS |
|---|---|---|
| **Thư mục mã nguồn** | `~/9router-custom` | `C:\9router-custom` |
| **Thư mục build CLI** | `~/9router-custom/cli` | `C:\9router-custom\cli` |
| **Thư mục dữ liệu cấu hình** | `~/.9router` | `%USERPROFILE%\.9router` |
| **Lệnh cài global** | `sudo npm install -g .` | `npm install -g .` |
| **Chạy nền 24/7** | `systemd` service hoặc `pm2` (hoặc Hide to Tray nếu có Desktop GUI) | `9router` -> chọn `Hide to Tray (Background)` |

---

# PHẦN A: HƯỚNG DẪN TRÊN UBUNTU VPS (LINUX)

---

### A1. Cài đặt lần đầu trên Ubuntu VPS

#### Bước 1: Dừng bản 9Router cũ đang chạy (nếu có)
```bash
sudo systemctl stop 9router 2>/dev/null || pm2 stop 9router 2>/dev/null || pkill -f "9router" 2>/dev/null || true
```

#### Bước 2: Clone mã nguồn fork về thư mục `~/9router-custom`
```bash
# 1. Tải bản fork nhánh custom
git clone -b custom https://github.com/namthanh0194/9router.git ~/9router-custom
```

#### Bước 3: Cài đặt dependency và build production
```bash
# 2. Cài dependency root (cần cho Next.js build)
cd ~/9router-custom
npm install

# 3. Cài dependency CLI, build Next.js standalone và ghi đè package global
cd ~/9router-custom/cli
npm install
npm run build
sudo npm install -g .
```

#### Bước 4: Kiểm tra cài đặt thành công
```bash
9router --version
which 9router
```

---

### A2. Cấu hình chạy 24/7 trên Ubuntu VPS

Tùy thuộc vào loại VPS của bạn:

#### Cách 1 (Khuyên Dùng Cho Ubuntu Server / SSH Headless - Dùng systemd):
Tạo file dịch vụ systemd để 9Router tự động chạy ngầm và tự bật lại khi VPS khởi động:

```bash
ROUTER_BIN="$(which 9router)"
CURRENT_USER="$USER"
CURRENT_HOME="$HOME"

sudo tee /etc/systemd/system/9router.service > /dev/null << EOF
[Unit]
Description=9Router AI Gateway Service
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_HOME
ExecStart=$ROUTER_BIN --tray --skip-update --no-browser
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOME=$CURRENT_HOME

[Install]
WantedBy=multi-user.target
EOF

# Nạp cấu hình và kích hoạt chạy 24/7
sudo systemctl daemon-reload
sudo systemctl enable --now 9router
```
*(Đoạn script trên đã tự động điền đúng User `$USER`, Home `$HOME` và đường dẫn file thực thi `which 9router`).*

Kiểm tra trạng thái:
```bash
sudo systemctl status 9router
```

#### Cách 2 (Dùng PM2):
```bash
sudo npm install -g pm2
pm2 delete 9router 2>/dev/null || true
pm2 start "$(which 9router)" --name "9router" -- --tray --skip-update --no-browser
pm2 save
pm2 startup
```

#### Cách 3 (Nếu Ubuntu có giao diện Desktop GUI / XFCE / GNOME qua RDP/VNC):
Chạy trực tiếp:
```bash
9router
```
- Dùng phím mũi tên chọn **`★ Hide to Tray (Background)`** -> Nhấn **Enter**.

---

### A3. Quy trình Cập Nhật trên Ubuntu (Khi sửa code & push GitHub)

Mỗi khi bạn commit & push code mới lên nhánh `custom`, thực hiện 3 bước sau:

#### Bước 1: Dừng 9Router thủ công
- Nếu dùng **systemd**: `sudo systemctl stop 9router`
- Nếu dùng **PM2**: `pm2 stop 9router`
- Nếu dùng **Hide to Tray**: Chuột phải icon khay hệ thống -> **Exit** (hoặc `pkill -f "9router"`)
- Nếu chạy Terminal: `Ctrl + C`

#### Bước 2: Chạy 1 lệnh cập nhật tự động
```bash
bash ~/9router-custom/update-vps.sh
```

> **Ghi chú:** Script `update-vps.sh` tự động chạy: `git pull`, `npm install`, build Next.js standalone và `sudo npm install -g .`. Script sẽ kiểm tra và từ chối chạy nếu phát hiện tiến trình cũ chưa được bạn tắt.

#### Bước 3: Khởi động lại 9Router thủ công
- Nếu dùng **systemd**: `sudo systemctl start 9router`
- Nếu dùng **PM2**: `pm2 start 9router`
- Nếu dùng **Hide to Tray**: `9router` (chọn lại **`★ Hide to Tray`**)
- Nếu chạy trực tiếp: `9router`

**Kiểm tra sau cập nhật:**
```bash
# Xem commit hiện tại
git -C ~/9router-custom rev-parse --short HEAD

# Xem phiên bản CLI
9router --version

# Xem log thời gian thực
sudo journalctl -u 9router -f --lines 50
# hoặc: pm2 logs 9router --lines 50
```

---
### A4. Rollback trên Ubuntu (Khi bản cập nhật bị lỗi)

```bash
# 1. Di chuyển vào thư mục dự án
cd ~/9router-custom

# 2. Xem các commit gần nhất để lấy mã commit ổn định
git log --oneline -5

# 3. Reset code về commit hoạt động tốt (ví dụ: 9720b1f3)
git reset --hard 9720b1f3

# 4. Build và cài lại bản cũ
npm install
cd ~/9router-custom/cli
npm install
npm run build
sudo npm install -g .

# 5. Khởi động lại dịch vụ
sudo systemctl restart 9router
```

---

# PHẦN B: HƯỚNG DẪN TRÊN WINDOWS VPS (WINDOWS SERVER / DESKTOP)

---

### B1. Cài đặt lần đầu trên Windows VPS

#### Bước 1: Mở PowerShell với quyền Administrator
1. Nhấn nút Start trên Windows -> Gõ **PowerShell**.
2. Chuột phải vào **Windows PowerShell** -> Chọn **Run as administrator**.

#### Bước 2: Thoát bản 9Router cũ đang chạy (nếu có)
- Chuột phải vào biểu tượng 9Router ở khay hệ thống (System Tray) -> Chọn **Exit**.
- Hoặc chạy lệnh PowerShell:
  ```powershell
  Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*9router*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  ```

#### Bước 3: Clone mã nguồn fork về `C:\9router-custom`
```powershell
cd C:\
git clone -b custom https://github.com/namthanh0194/9router.git C:\9router-custom
```

#### Bước 4: Cài đặt dependency và build bản Production
```powershell
# 1. Cài dependency root Next.js
cd C:\9router-custom
npm install

# 2. Build gói CLI sang standalone production và cài toàn cục
cd C:\9router-custom\cli
npm install
npm run build
npm install -g .
```

#### Bước 5: Khởi động vào chế độ Hide to Tray (Chạy 24/7)
1. Gõ lệnh:
   ```powershell
   9router
   ```
2. Trong menu xuất hiện, dùng phím mũi tên di chuyển xuống dòng **`★ Hide to Tray (Background)`** và nhấn **Enter**.
3. **Lưu ý giữ tiến trình 24/7**:
   - 9Router tự tạo file khởi động cùng Windows tại `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\9router.vbs`.
   - Bạn có thể tắt cửa sổ PowerShell.
   - Khi thoát Remote Desktop (RDP), hãy chọn **Disconnect**, **không chọn Sign Out / Log off**.

---

### B2. Quy trình Cập Nhật trên Windows (Khi sửa code & push GitHub)

Mỗi khi có commit mới trên nhánh `custom`, chạy các lệnh sau trên Windows VPS:

```powershell
# 1. Thoát 9Router đang chạy (hoặc chuột phải icon khay hệ thống -> Exit)
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*9router*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# 2. Kéo code mới nhất từ nhánh custom
cd C:\9router-custom
git pull --ff-only origin custom

# 3. Cài dependency và build lại bản production
npm install
cd C:\9router-custom\cli
npm install
npm run build
npm install -g .

# 4. Khởi động lại
9router
```
- Chọn lại: **`★ Hide to Tray (Background)`**.

---

### B3. Rollback trên Windows (Khi bản cập nhật bị lỗi)

```powershell
# 1. Thoát 9Router đang chạy
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*9router*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# 2. Reset về commit ổn định (ví dụ: 9720b1f3)
cd C:\9router-custom
git reset --hard 9720b1f3

# 3. Cài & build lại bản cũ
npm install
cd C:\9router-custom\cli
npm install
npm run build
npm install -g .

# 4. Khởi động lại
9router
# (Chọn Hide to Tray)
```