/**
 * Giải mã QR trong trình duyệt. Chỉ chạy phía client.
 *
 * Hai đường, thử theo thứ tự:
 *
 *   1. `BarcodeDetector` — API sẵn trong Chrome/Edge trên Android và desktop.
 *      Chạy bằng mã máy của hệ điều hành: nhanh nhất, không tải thêm gì.
 *   2. `zxing-wasm` — bản WebAssembly, ~1MB. Dành cho Safari/iOS, nơi Apple vẫn
 *      chưa hỗ trợ BarcodeDetector.
 *
 * Đường 2 chỉ được `import()` khi thật sự cần, nên máy Android không phải tải
 * 1MB wasm chỉ để rồi không dùng tới.
 *
 * File .wasm được tự host tại /zxing_reader.wasm (xem scripts/copy-wasm.mjs).
 * Mặc định thư viện tải nó từ CDN jsDelivr — không chấp nhận được ở đây, vì mỗi
 * lần quét CCCD sẽ là một request lộ IP người thuê sang bên thứ ba.
 */

/** BarcodeDetector chưa có trong lib.dom.d.ts của TypeScript. */
interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats(): Promise<string[]>;
}

function nativeDetector(): BarcodeDetectorConstructor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  return typeof ctor === "function" ? ctor : null;
}

let nativeInstance: BarcodeDetectorLike | null | undefined;

/**
 * Dựng BarcodeDetector một lần rồi dùng lại.
 *
 * `getSupportedFormats()` là bước bắt buộc chứ không phải cho chắc: một số bản
 * Android có mặt hàm BarcodeDetector nhưng KHÔNG kèm module nhận diện QR, và
 * `new BarcodeDetector({formats:['qr_code']})` ở đó ném lỗi lúc chạy.
 */
async function getNativeDetector(): Promise<BarcodeDetectorLike | null> {
  if (nativeInstance !== undefined) return nativeInstance;

  const Ctor = nativeDetector();
  if (!Ctor) {
    nativeInstance = null;
    return null;
  }

  try {
    const formats = await Ctor.getSupportedFormats();
    nativeInstance = formats.includes("qr_code")
      ? new Ctor({ formats: ["qr_code"] })
      : null;
  } catch {
    nativeInstance = null;
  }

  return nativeInstance;
}

let zxingReady: Promise<typeof import("zxing-wasm/reader")> | null = null;

function loadZxing() {
  zxingReady ??= import("zxing-wasm/reader").then((module) => {
    module.prepareZXingModule({
      overrides: {
        // Emscripten hỏi "file này nằm đâu". Không trả lời thì nó lấy CDN.
        locateFile: (file: string, prefix: string) =>
          file.endsWith(".wasm") ? "/zxing_reader.wasm" : `${prefix}${file}`,
      },
    });
    return module;
  });
  return zxingReady;
}

/**
 * Tìm mã QR trong một khung hình hoặc một file ảnh.
 *
 * Trả về nội dung chuỗi đầu tiên đọc được, hoặc `null` nếu khung hình không có
 * mã QR nào — trường hợp bình thường khi đang quét liên tục, KHÔNG phải lỗi.
 */
export async function decodeQr(source: Blob | ImageData): Promise<string | null> {
  const detector = await getNativeDetector();

  if (detector) {
    try {
      // ImageData không phải ImageBitmapSource hợp lệ ở mọi trình duyệt, nhưng
      // Chrome nhận. Hỏng thì rơi xuống zxing bên dưới.
      const found = await detector.detect(source as ImageBitmapSource);
      const value = found.find((code) => code.rawValue)?.rawValue;
      if (value) return value;
      // Không thấy mã: dừng ở đây. Chạy tiếp sang zxing cho MỖI khung hình
      // trống sẽ làm nóng máy và tụt khung hình.
      return null;
    } catch {
      // Detector hỏng giữa chừng (hay gặp khi khung hình quá tối): thử zxing.
    }
  }

  const { readBarcodes } = await loadZxing();
  const results = await readBarcodes(source, {
    formats: ["QRCode"],
    // Mã QR trên CCCD nhỏ và hay bị loá đèn, nghiêng, hoặc mờ do lấy nét sai.
    tryHarder: true,
    tryRotate: true,
    tryInvert: true,
    maxNumberOfSymbols: 1,
  });

  return results.find((result) => result.text)?.text ?? null;
}

/** Trình duyệt có mở được camera sau không. Dùng để chọn giữa quét trực tiếp và chụp ảnh. */
export function supportsCamera() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    // getUserMedia chỉ chạy trên HTTPS (hoặc localhost). Trên http:// nó tồn tại
    // nhưng gọi vào là ném lỗi — kiểm tra trước để hiện đúng giao diện dự phòng.
    window.isSecureContext
  );
}
