import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../utils/cloudinary";

// Configure Multer Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "restaurant/menu-items",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: (_req: any, file: any) => {
      // Generate a clean and unique public ID
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const cleanName = file.originalname
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase();
      return `${cleanName}-${uniqueSuffix}`;
    },
  } as any,
});

// Configure Multer instance with file size limit (5MB)
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Export single file upload middleware for "image" field
export const uploadSingle = upload.single("image");
