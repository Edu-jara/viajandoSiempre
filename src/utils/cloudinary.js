const CLOUD_NAME = "uwfa2bue";
const UPLOAD_PRESET = "viajando_siempre_preset";

export async function subirImagenACloudinary(file, carpeta = "viajando-siempre") {
    if (!file) return "";

    const nombreBase = (file.name || "imagen")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 30);
    const publicIdUnico = `${nombreBase}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", carpeta);
    formData.append("public_id", publicIdUnico);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "No se pudo subir la imagen a Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
}