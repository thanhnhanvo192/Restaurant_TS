import * as crypto from "crypto";
import * as querystring from "querystring";

/**
 * Hàm sắp xếp các tham số theo thứ tự bảng chữ cái và encode URI theo chuẩn VNPay
 */
function sortObject(obj: Record<string, any>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    const val = obj[key];
    if (val !== null && val !== undefined && val !== "") {
      const encodedKey = encodeURIComponent(key).replace(/%20/g, "+");
      const encodedVal = encodeURIComponent(String(val)).replace(/%20/g, "+");
      sorted[encodedKey] = encodedVal;
    }
  }
  return sorted;
}

/**
 * Interface cho tham số đầu vào của hàm tạo URL thanh toán VNPay
 */
export interface CreatePaymentUrlParams {
  invoiceId: number;
  amount: number;
  orderInfo: string;
  ipAddr: string;
  returnUrl: string;
}

/**
 * Interface cho kết quả xác thực thanh toán phản hồi từ VNPay
 */
export interface VerifyPaymentResult {
  isValid: boolean;
  responseCode: string;
  transactionRef: string;
  amount: number;
}

/**
 * BƯỚC 2: Tạo đường dẫn thanh toán VNPay Sandbox
 * @param params các thông tin thanh toán cần thiết
 * @returns Chuỗi URL thanh toán VNPay hoàn chỉnh bao gồm chữ ký bảo mật
 */
export function createPaymentUrl(params: CreatePaymentUrlParams): string {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const hashSecret = process.env.VNPAY_HASH_SECRET;
  const vnpUrl = process.env.VNPAY_URL;

  if (!tmnCode || !hashSecret || !vnpUrl) {
    throw new Error("Missing VNPay configuration in environment variables");
  }

  // Lấy thời gian hiện tại định dạng YYYYMMDDHHMMSS theo múi giờ Việt Nam (UTC+7)
  const date = new Date();
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7); // UTC+7
  
  const pad = (n: number) => String(n).padStart(2, "0");
  const createDate = 
    vnTime.getFullYear() +
    pad(vnTime.getMonth() + 1) +
    pad(vnTime.getDate()) +
    pad(vnTime.getHours()) +
    pad(vnTime.getMinutes()) +
    pad(vnTime.getSeconds());

  // Tạo transaction ref duy nhất
  const txnRef = `${params.invoiceId}_${Date.now()}`;

  const vnp_Params: Record<string, any> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: params.amount * 100, // VNPay tính theo đơn vị Đồng * 100
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: params.returnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  
  // Tạo chuỗi signData với encodeURIComponent trả về chính giá trị đã encode để tránh double encoding
  const signData = querystring.stringify(sortedParams, undefined, undefined, {
    encodeURIComponent: (str) => str,
  });

  const hmac = crypto.createHmac("sha512", hashSecret);
  const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // Tạo chuỗi query params hoàn chỉnh để ghép vào URL
  const finalParamsStr = querystring.stringify({
    ...sortedParams,
    vnp_SecureHash: secureHash,
  }, undefined, undefined, {
    encodeURIComponent: (str) => str,
  });

  return `${vnpUrl}?${finalParamsStr}`;
}

/**
 * BƯỚC 2: Xác thực chữ ký phản hồi từ Return URL của VNPay
 * @param query Object chứa các query params VNPay trả về
 */
export function verifyReturnUrl(query: Record<string, any>): VerifyPaymentResult {
  const hashSecret = process.env.VNPAY_HASH_SECRET;
  if (!hashSecret) {
    throw new Error("Missing VNPAY_HASH_SECRET in environment variables");
  }

  const secureHash = query["vnp_SecureHash"];
  
  // Bản sao để loại bỏ tham số hash
  const params = { ...query };
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  const sortedParams = sortObject(params);
  
  const signData = querystring.stringify(sortedParams, undefined, undefined, {
    encodeURIComponent: (str) => str,
  });

  const hmac = crypto.createHmac("sha512", hashSecret);
  const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const isValid = calculatedHash === secureHash;
  const responseCode = query["vnp_ResponseCode"] || "";
  const transactionRef = query["vnp_TxnRef"] || "";
  const amount = query["vnp_Amount"] ? Number(query["vnp_Amount"]) / 100 : 0;

  return {
    isValid,
    responseCode,
    transactionRef,
    amount,
  };
}

/**
 * BƯỚC 2: Xác thực chữ ký phản hồi từ IPN URL (Server-to-Server)
 * @param query/body Object chứa các tham số VNPay gửi về
 */
export function verifyIpn(params: Record<string, any>): VerifyPaymentResult {
  return verifyReturnUrl(params);
}
