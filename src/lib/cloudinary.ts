export interface CloudinaryResponse {
  secure_url: string;
  [key: string]: any;
}

export async function uploadToCloudinary(file: File, folder: string = "trip-files"): Promise<CloudinaryResponse | null> {
  try {
    // First, get the signature from our backend
    const signatureResponse = await fetch("/api/cloudinary-signature", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        folder,
      }),
    });

    if (!signatureResponse.ok) {
      throw new Error("Failed to get upload signature");
    }

    const {
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: returnedFolder,
    } = await signatureResponse.json();

    // Create form data for the Cloudinary upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", returnedFolder);
    formData.append("resource_type", "auto");

    // Upload to Cloudinary (use /auto/upload for all file types)
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Cloudinary upload error:", errorText);
      throw new Error("Failed to upload to Cloudinary");
    }

    return await uploadResponse.json();
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
} 