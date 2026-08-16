#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== [1/6] Kiểm tra môi trường ==="
for command_name in git npm node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Lỗi: Không tìm thấy lệnh $command_name trên hệ thống." >&2
    exit 1
  fi
done

# Không tự dừng 9Router. Người dùng phải dừng thủ công trước khi cập nhật.
if pgrep -f '[n]ode .*9router.*/cli\.js' >/dev/null 2>&1; then
  echo "CẢNH BÁO: Phát hiện tiến trình 9router vẫn đang chạy!" >&2
  echo "Vui lòng dừng 9router thủ công trước khi cập nhật:" >&2
  echo "  - systemd: sudo systemctl stop 9router" >&2
  echo "  - PM2:     pm2 stop 9router" >&2
  echo "  - Tray:    Chuột phải icon -> Exit" >&2
  echo "  - Terminal: Ctrl + C" >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [ "$CURRENT_BRANCH" != "custom" ]; then
  echo "Lỗi: Repo đang ở nhánh '$CURRENT_BRANCH', không phải 'custom'." >&2
  echo "Chạy: git -C \"$SCRIPT_DIR\" checkout custom" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Lỗi: Repo có file chưa commit:" >&2
  git status --short >&2
  exit 1
fi

echo "=== [2/6] Kéo code mới nhất từ nhánh custom ==="
git pull --ff-only origin custom

echo "=== [3/6] Cài dependency root ==="
npm install

echo "=== [4/6] Cài dependency CLI ==="
cd "$SCRIPT_DIR/cli"
npm install

echo "=== [5/6] Build CLI standalone production ==="
npm run build

echo "=== [6/6] Cài CLI toàn cục ==="
if [ "$(id -u)" -eq 0 ]; then
  npm install -g .
else
  sudo npm install -g .
fi

VERSION="$(9router --version 2>/dev/null || node -p "require('./package.json').version")"
COMMIT="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD)"

echo ""
echo "=================================================="
echo "Cập nhật và build 9Router thành công."
echo "Version: $VERSION"
echo "Commit:  $COMMIT"
echo "=================================================="
echo ""
echo "Khởi động lại thủ công:"
echo "  systemd: sudo systemctl start 9router"
echo "  PM2:     pm2 start 9router"
echo "  Tray:    9router, sau đó chọn Hide to Tray"
echo "  Direct:  9router"