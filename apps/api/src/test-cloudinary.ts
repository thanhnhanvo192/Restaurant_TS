import dotenv from "dotenv";
dotenv.config();

import { cloudinary, deleteFromCloudinary, getPublicIdFromUrl } from "./utils/cloudinary";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== Starting Cloudinary & Integration Tests ===");
  
  // 1. Check Env
  console.log("1. Checking Environment Variables...");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  console.log(`Cloud Name: ${cloudName}`);
  console.log(`API Key: ${apiKey ? "***" + apiKey.slice(-4) : "MISSING"}`);
  console.log(`API Secret: ${apiSecret ? "***" + apiSecret.slice(-4) : "MISSING"}`);
  
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary configuration in environment variables!");
  }
  
  // 2. Test getPublicIdFromUrl helper
  console.log("\n2. Testing getPublicIdFromUrl helper...");
  const testUrl1 = "https://res.cloudinary.com/cloud-name/image/upload/v12345678/restaurant/menu-items/item-image-123.jpg";
  const publicId1 = getPublicIdFromUrl(testUrl1);
  console.log(`Parsed: ${testUrl1} -> ${publicId1}`);
  if (publicId1 !== "restaurant/menu-items/item-image-123") {
    throw new Error(`Public ID extraction failed! Expected "restaurant/menu-items/item-image-123", got "${publicId1}"`);
  }
  
  const testUrl2 = "https://res.cloudinary.com/cloud-name/image/upload/restaurant/menu-items/subfolder/item-image-456.png";
  const publicId2 = getPublicIdFromUrl(testUrl2);
  console.log(`Parsed: ${testUrl2} -> ${publicId2}`);
  if (publicId2 !== "restaurant/menu-items/subfolder/item-image-456") {
    throw new Error(`Public ID extraction failed! Expected "restaurant/menu-items/subfolder/item-image-456", got "${publicId2}"`);
  }

  const testUrlInvalid = "https://example.com/not-cloudinary.jpg";
  const publicIdInvalid = getPublicIdFromUrl(testUrlInvalid);
  console.log(`Parsed: ${testUrlInvalid} -> ${publicIdInvalid}`);
  if (publicIdInvalid !== null) {
    throw new Error(`Expected null for invalid URL, got "${publicIdInvalid}"`);
  }
  console.log("✅ getPublicIdFromUrl tests passed!");

  // 3. Test Cloudinary Upload
  console.log("\n3. Testing image upload to Cloudinary...");
  // 1x1 white PNG pixel in base64
  const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  
  const uploadResult = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload(
      dummyBase64,
      {
        folder: "restaurant/menu-items",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      },
      (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
  
  const uploadedUrl = uploadResult.secure_url;
  const uploadedPublicId = uploadResult.public_id;
  console.log(`✅ Uploaded successfully! URL: ${uploadedUrl}`);
  console.log(`Public ID: ${uploadedPublicId}`);
  
  // 4. Test Cloudinary Deletion
  console.log("\n4. Testing image deletion from Cloudinary...");
  const deleteResult = await deleteFromCloudinary(uploadedUrl);
  console.log(`✅ Deleted successfully! Result:`, deleteResult);
  if (deleteResult.result !== "ok") {
    throw new Error(`Deletion did not return ok! Got: ${JSON.stringify(deleteResult)}`);
  }

  // 5. Test Prisma connection and categories
  console.log("\n5. Checking Database Categories...");
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    take: 1
  });
  console.log(`✅ Connected to Database. Found active categories: ${categories.length}`);
  if (categories.length > 0) {
    console.log(`Category info: ID=${categories[0].id}, Name=${categories[0].name}`);
  } else {
    console.log("⚠️ No active categories found in the database. You may need to seed the database first.");
  }
  
  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Cloudinary integration is fully operational.");
}

runTests()
  .catch((error) => {
    console.error("\n❌ Test failed with error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
