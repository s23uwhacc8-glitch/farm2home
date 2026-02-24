/**
 * Cloudinary Upload Utility
 *
 * Handles all image uploads for Farm2Home:
 *  - Profile photos        → farm2home/profiles/
 *  - Verification docs     → farm2home/verification/<userId>/
 *  - Payment screenshots   → farm2home/payments/
 *
 * All uploads are auto-optimised (quality:auto, format:auto) so
 * Cloudinary serves WebP to modern browsers and compresses intelligently.
 *
 * Accepts base64 data URIs (what the frontend sends).
 * Returns a secure HTTPS URL to store in MongoDB.
 */

const cloudinary = require('cloudinary').v2;

// ── Configure once at import time ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Validate that Cloudinary env vars are present.
 * Called at server startup alongside validateEnv().
 */
function validateCloudinaryConfig() {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.warn(`⚠️  Cloudinary not configured — missing: ${missing.join(', ')}`);
    console.warn('   Image uploads will FAIL until these are set.');
    return false;
  }
  console.log('✅ Cloudinary configured successfully');
  return true;
}

/**
 * Check if a string looks like a base64 data URI.
 * Cloudinary also accepts remote URLs, so we only call upload() for base64.
 */
function isBase64DataUri(str) {
  return typeof str === 'string' && str.startsWith('data:');
}

/**
 * Upload a single image to Cloudinary.
 *
 * @param {string} imageData  - base64 data URI (e.g. "data:image/jpeg;base64,...")
 * @param {string} folder     - Cloudinary folder path (e.g. "farm2home/profiles")
 * @param {object} [options]  - extra Cloudinary upload options
 * @returns {Promise<string>} - secure HTTPS URL
 */
async function uploadImage(imageData, folder = 'farm2home/misc', options = {}) {
  if (!imageData) return null;

  // If it's already a remote URL (not base64), just return it as-is.
  // This handles cases where an existing Cloudinary URL is re-submitted.
  if (!isBase64DataUri(imageData)) {
    if (imageData.startsWith('https://') || imageData.startsWith('http://')) {
      return imageData;
    }
    throw new Error('Invalid image data: must be a base64 data URI or HTTPS URL');
  }

  const result = await cloudinary.uploader.upload(imageData, {
    folder,
    resource_type: 'image',
    // Auto quality + format (serves WebP to modern browsers)
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
    ],
    ...options,
  });

  return result.secure_url;
}

/**
 * Upload a profile photo.
 * Resized to max 400×400 to keep profile pics lightweight.
 */
async function uploadProfilePhoto(imageData) {
  return uploadImage(imageData, 'farm2home/profiles', {
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' },
    ],
  });
}

/**
 * Upload a verification document image.
 * Kept at full resolution so admins can read text clearly.
 *
 * @param {string} imageData
 * @param {string} userId  - used to organise docs per-user in Cloudinary
 */
async function uploadVerificationDoc(imageData, userId) {
  return uploadImage(imageData, `farm2home/verification/${userId}`, {
    transformation: [
      { quality: 'auto:best', fetch_format: 'auto' },
    ],
  });
}

/**
 * Upload a payment screenshot.
 * Kept at good quality so transaction IDs are readable.
 */
async function uploadPaymentProof(imageData) {
  return uploadImage(imageData, 'farm2home/payments', {
    transformation: [
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  });
}

/**
 * Upload multiple verification docs in parallel.
 * Accepts an object like { aadhaarPhoto: 'data:...', farmLicensePhoto: 'data:...' }
 * Returns the same shape with Cloudinary URLs instead of base64.
 *
 * @param {object} docsObj  - { [docKey]: base64DataUri | null }
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function uploadVerificationDocs(docsObj, userId) {
  if (!docsObj) return {};

  const entries = Object.entries(docsObj);
  const results = await Promise.all(
    entries.map(async ([key, val]) => {
      if (!val) return [key, null];
      try {
        const url = await uploadVerificationDoc(val, userId);
        return [key, url];
      } catch (err) {
        console.error(`Failed to upload ${key} for user ${userId}:`, err.message);
        return [key, null]; // don't block registration if one doc fails
      }
    })
  );

  return Object.fromEntries(results);
}

module.exports = {
  validateCloudinaryConfig,
  uploadImage,
  uploadProfilePhoto,
  uploadVerificationDoc,
  uploadVerificationDocs,
  uploadPaymentProof,
};
