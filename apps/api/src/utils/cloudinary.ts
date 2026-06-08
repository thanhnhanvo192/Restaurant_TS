import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract the public_id of an image from its Cloudinary URL.
 * Example: https://res.cloudinary.com/cloud_name/image/upload/v12345/restaurant/menu-items/abc.jpg
 * -> Returns: "restaurant/menu-items/abc"
 * 
 * @param url Cloudinary Image URL
 * @returns string public_id or null if invalid
 */
export function getPublicIdFromUrl(url: string): string | null {
  try {
    if (!url || !url.startsWith("http")) return null;
    
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    
    // Get path portion after /upload/
    const pathAfterUpload = parts[1];
    
    // Remove version prefix if present (e.g., v1612345678/)
    const pathWithoutVersion = pathAfterUpload.replace(/^v\d+\//, "");
    
    // Remove file extension (e.g., .jpg, .png)
    const lastDotIndex = pathWithoutVersion.lastIndexOf(".");
    if (lastDotIndex === -1) return pathWithoutVersion;
    
    return pathWithoutVersion.substring(0, lastDotIndex);
  } catch (error) {
    console.error("[Cloudinary] Failed to parse public_id from URL:", error);
    return null;
  }
}

/**
 * Delete an image on Cloudinary using its URL.
 * 
 * @param url Cloudinary Image URL
 */
export async function deleteFromCloudinary(url: string): Promise<any> {
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return null;
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error(`[Cloudinary] ❌ Failed to delete image (${publicId}):`, error);
        reject(error);
      } else {
        console.log(`[Cloudinary] ✅ Deleted image (${publicId}):`, result);
        resolve(result);
      }
    });
  });
}

/**
 * Upload an image (file path, buffer, or base64 data URL) to Cloudinary.
 * 
 * @param fileSource Path to file, buffer, or base64 data URL
 * @param folder Cloudinary folder name
 * @returns Promise with upload result containing secure_url and public_id
 */
export async function uploadToCloudinary(
  fileSource: string,
  folder: string = "restaurant/qrcodes"
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      fileSource,
      {
        folder,
      },
      (error, result) => {
        if (error) {
          console.error(`[Cloudinary] ❌ Upload failed:`, error);
          reject(error);
        } else {
          resolve({
            secure_url: result!.secure_url,
            public_id: result!.public_id,
          });
        }
      }
    );
  });
}

export { cloudinary };
