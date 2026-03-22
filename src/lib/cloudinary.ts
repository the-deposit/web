export async function uploadToCloudinary(
  file: File,
  type: "productos" | "facturas"
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset =
    type === "productos"
      ? process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_PRODUCTOS
      : process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_FACTURAS;

  if (!cloudName || !preset) {
    throw new Error("Cloudinary configuration is missing");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Upload failed");
  }

  const data = await res.json();
  return data.secure_url as string;
}
