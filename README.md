# PassIMG Lite

**PassIMG Lite** is a simple image integrity verification tool that helps users confirm whether an image file has been modified.

It works by generating a unique cryptographic fingerprint (SHA-256 hash) for each uploaded image and creating a public verification record that others can use to check the integrity of that image.

---

## How It Works

1. **Upload an Image**
   The user uploads an image file.

2. **Fingerprint Generation**
   PassIMG Lite generates a unique SHA-256 fingerprint for the file and records the verification time.

3. **Verification Record Created**
   A public verification page is generated with a verification ID, timestamp, and fingerprint.

4. **Image Comparison**
   Anyone can upload another image to compare it with the verified version to see whether it matches or has been modified.

---

## Key Features

* Image integrity verification using SHA-256 hashing
* Public verification page with unique verification ID
* Image comparison tool to detect modifications
* Downloadable verification certificate
* QR code verification link
* "First Seen on PassIMG" record to help track when an image file was first registered

---

## What PassIMG Verifies

PassIMG verifies **file integrity**.

This means the system confirms that the exact image file has not been modified since it was verified.

PassIMG does **not determine the real-world origin of an image** or whether other versions of the image exist.

---

## Who This Tool Is For

PassIMG Lite can be useful for:

* Journalists
* Investigators
* Researchers
* Photographers
* Businesses
* Anyone who wants to verify whether an image file has been altered

---

## Project Goal

PassIMG Lite is an early prototype exploring the idea of **image verification infrastructure** — a system where images can be publicly verified for integrity and authenticity using cryptographic fingerprints and verification records.

---

## License

This project is provided for experimentation and research purposes.
