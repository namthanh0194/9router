# VieNeu TTS API qua 9Router

Tài liệu này mô tả cách gọi VieNeu TTS thông qua API OpenAI-compatible của 9Router.

## Kiến trúc

```text
Client
  |
  | POST /v1/audio/speech
  v
9Router (mặc định http://localhost:20128)
  |
  | Bearer VieNeu API key được lưu trong Connection
  v
VieNeu TTS Bridge (http://localhost:8880)
```

Client chỉ cần gửi **9Router API key**. VieNeu API key được cấu hình và lưu trong connection `selfhosted-tts` của 9Router; không gửi VieNeu API key trực tiếp từ client.

## Endpoint

```http
POST http://localhost:20128/v1/audio/speech
```

Đổi `localhost:20128` thành domain hoặc tunnel của 9Router khi gọi từ máy khác.

## Xác thực

```http
Authorization: Bearer <9ROUTER_API_KEY>
Content-Type: application/json
```

`<9ROUTER_API_KEY>` là API key được tạo trong trang **Endpoint & Key** của 9Router, không phải API key của VieNeu bridge.

## Request body

```json
{
  "model": "selfhosted-tts/vieneu",
  "input": "Nội dung cần đọc",
  "voice": "Minh Đức",
  "response_format": "mp3",
  "speed": 1.0
}
```

| Field | Bắt buộc | Giá trị | Mô tả |
| --- | --- | --- | --- |
| `model` | Có | `selfhosted-tts/vieneu` | Chọn provider VieNeu TTS trong 9Router. |
| `input` | Có | Chuỗi 1–2000 ký tự | Nội dung tiếng Việt cần tổng hợp. |
| `voice` | Không | Mặc định `Minh Đức` | Bridge hiện tại sử dụng giọng `Minh Đức`. |
| `response_format` | Không | `mp3` hoặc `wav` | Định dạng audio do VieNeu tạo; mặc định `mp3`. |
| `speed` | Không | `0.25`–`4.0` | Mặc định `1.0`. Bridge hiện nhận field này nhưng chưa áp dụng thay đổi tốc độ. |

Không gửi field `language`; VieNeu bridge hiện không định nghĩa field này.

## Audio Format và Output Format

Hai tùy chọn này có mục đích khác nhau.

### Audio Format

Field `response_format` trong JSON request quyết định định dạng audio:

- `"mp3"`: VieNeu trả audio MPEG.
- `"wav"`: VieNeu trả audio WAV.

### Output Format

Query parameter của 9Router quyết định cách đóng gói response:

- Không có `?response_format=json`: trả trực tiếp binary audio.
- Có `?response_format=json`: trả JSON chứa audio Base64.

Ví dụ: `response_format: "wav"` kết hợp `?response_format=json` sẽ trả JSON Base64 của file WAV, không phải MP3.

## Ví dụ WAV Binary

```bash
curl -X POST http://localhost:20128/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_9ROUTER_API_KEY" \
  -d '{
    "model": "selfhosted-tts/vieneu",
    "input": "Xin chào, đây là VieNeu TTS qua 9Router.",
    "voice": "Minh Đức",
    "response_format": "wav",
    "speed": 1.0
  }' \
  --output speech.wav
```

Response thành công:

```http
HTTP/1.1 200 OK
Content-Type: audio/wav
```

## Ví dụ MP3 Binary

```bash
curl -X POST http://localhost:20128/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_9ROUTER_API_KEY" \
  -d '{
    "model": "selfhosted-tts/vieneu",
    "input": "Xin chào, đây là bản MP3.",
    "voice": "Minh Đức",
    "response_format": "mp3",
    "speed": 1.0
  }' \
  --output speech.mp3
```

Response thành công:

```http
HTTP/1.1 200 OK
Content-Type: audio/mp3
```

VieNeu upstream sử dụng `audio/mpeg`; 9Router trả content type dựa trên định dạng audio đã nhận diện.

## Ví dụ JSON Base64

```bash
curl -X POST "http://localhost:20128/v1/audio/speech?response_format=json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_9ROUTER_API_KEY" \
  -d '{
    "model": "selfhosted-tts/vieneu",
    "input": "Xin chào, audio này được trả dưới dạng Base64.",
    "voice": "Minh Đức",
    "response_format": "wav",
    "speed": 1.0
  }'
```

Response:

```json
{
  "audio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
  "format": "wav"
}
```

- `audio`: dữ liệu audio Base64.
- `format`: định dạng audio thực tế.

## JavaScript

```js
const response = await fetch("http://localhost:20128/v1/audio/speech?response_format=json", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer YOUR_9ROUTER_API_KEY",
  },
  body: JSON.stringify({
    model: "selfhosted-tts/vieneu",
    input: "Xin chào từ JavaScript.",
    voice: "Minh Đức",
    response_format: "mp3",
    speed: 1,
  }),
});

if (!response.ok) {
  throw new Error(`VieNeu TTS failed: ${response.status}`);
}

const { audio, format } = await response.json();
const bytes = Uint8Array.from(atob(audio), (character) => character.charCodeAt(0));
const blob = new Blob([bytes], { type: `audio/${format}` });
const audioUrl = URL.createObjectURL(blob);
new Audio(audioUrl).play();
```

## Kiểm tra connection

Nút **Check** trong form connection gọi:

```http
GET http://localhost:8880/v1/models
Authorization: Bearer <VIENEU_API_KEY>
```

Kết quả:

- HTTP `2xx`: API key hợp lệ.
- HTTP `401` hoặc `403`: API key không hợp lệ.
- HTTP khác: VieNeu endpoint không khả dụng.

VieNeu endpoint `localhost:8880` là kết nối nội bộ giữa 9Router và bridge. Client thông thường không cần gọi endpoint này.

## Mã lỗi thường gặp

| HTTP | Nguyên nhân thường gặp |
| --- | --- |
| `400` | Thiếu `model`, thiếu `input`, model sai hoặc request không hợp lệ. |
| `401` | Thiếu hoặc sai 9Router API key. |
| `502` | 9Router không kết nối được VieNeu hoặc VieNeu trả lỗi tổng hợp audio. |
| `503` | Không có connection VieNeu khả dụng. |

Response lỗi có dạng JSON, ví dụ:

```json
{
  "error": {
    "message": "VieNeu TTS endpoint unavailable"
  }
}
```

Cấu trúc lỗi có thể là chuỗi hoặc object tùy route và loại lỗi; client nên kiểm tra cả `error.message` và `error`.

## Cấu hình VieNeu trong 9Router

- Provider nội bộ: `selfhosted-tts`.
- Tên hiển thị: `VieNeu TTS`.
- Model: `vieneu`.
- Base URL mặc định: `http://localhost:8880`.
- Audio endpoint upstream: `/v1/audio/speech`.
- Models endpoint upstream: `/v1/models`.
- Authorization upstream: `Bearer <VIENEU_API_KEY>`.

Không cần thêm Base URL vào request của client. 9Router tự lấy Base URL và VieNeu API key từ connection đã lưu.