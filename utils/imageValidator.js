/**
 * Validate base64 image string
 * @param {string} base64String - Base64 encoded image string
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateBase64Image(base64String) {
  if (!base64String) {
    return { valid: false, error: "Image data is required" };
  }

  // Check if it's a valid base64 format with data URI (including SVG)
  const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
  if (!base64Regex.test(base64String)) {
    return {
      valid: false,
      error:
        "Invalid image format. Must be a base64 data URI with format: data:image/[type];base64,[data]",
    };
  }

  // Calculate size (base64 is ~33% larger than binary)
  // Remove the data URI prefix to get just the base64 data
  const base64Data = base64String.split(",")[1];
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);

  // Check if size exceeds 50MB
  const MAX_SIZE_MB = 50;
  if (sizeInMB > MAX_SIZE_MB) {
    return {
      valid: false,
      error: `Image size (${sizeInMB.toFixed(
        2
      )}MB) exceeds maximum allowed size of ${MAX_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate array of base64 images
 * @param {string[]} images - Array of base64 encoded images
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateBase64Images(images) {
  if (!Array.isArray(images)) {
    return { valid: false, error: "Images must be an array" };
  }

  for (let i = 0; i < images.length; i++) {
    const result = validateBase64Image(images[i]);
    if (!result.valid) {
      return { valid: false, error: `Image ${i + 1}: ${result.error}` };
    }
  }

  return { valid: true };
}
