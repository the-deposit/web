/**
 * Server-side Cloudinary upload using the unsigned preset.
 * Works with PDF blobs from jsPDF in the Node.js runtime.
 */
export async function uploadPDFToCloudinary(pdfBlob: Blob, publicId: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET_FACTURAS;

  if (!cloudName || !preset) {
    throw new Error("Cloudinary configuration is missing");
  }

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const dataUri = `data:application/pdf;base64,${base64}`;

  const formData = new FormData();
  formData.append("file", dataUri);
  formData.append("upload_preset", preset);
  formData.append("public_id", publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "PDF upload failed");
  }

  const data = await res.json();
  return data.secure_url as string;
}
