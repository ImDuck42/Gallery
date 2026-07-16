#!/usr/bin/env python3
# Doesn't need any pip packages

import os
import sys
import json
import shutil
import hashlib
import mimetypes
import urllib.parse

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib     import Path

DEFAULT_PORT     = 4269
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"}

ACCENT_NAMES = [
    "rosewater", "flamingo", "pink", "mauve", "red", "maroon", "peach",
    "yellow", "green", "teal", "sky", "sapphire", "blue", "lavender",
]

def is_image_file(path):
    return path.suffix.lower() in IMAGE_EXTENSIONS

def find_image_folders(root):
    folders = {}

    for current_directory, subdirectory_names, file_names in os.walk(root):
        subdirectory_names[:] = [n for n in subdirectory_names if not n.startswith('.')]
        directory_path        = Path(current_directory)
        
        image_paths = sorted(
            directory_path / file_name
            for file_name in file_names
            if is_image_file(directory_path / file_name)
        )

        if image_paths:
            folder_name          = directory_path.name
            folders[folder_name] = image_paths

    return folders

def accent_for_folder(folder_name):
    digest = hashlib.sha1(folder_name.encode("utf-8")).hexdigest()
    return ACCENT_NAMES[int(digest, 16) % len(ACCENT_NAMES)]

def build_folder_manifest(folders):
    manifest = []
    for folder_name, image_paths in folders.items():
        total_bytes = 0
        image_data  = []
        
        for p in image_paths:
            size         = p.stat().st_size
            total_bytes += size
            image_data.append({"name": p.name, "size": size})

        manifest.append({
            "name":      folder_name,
            "fileCount": len(image_paths),
            "sizeMB":    round(total_bytes / (1024 * 1024), 1),
            "accent":    accent_for_folder(folder_name),
            "images":    image_data,
        })
    return manifest

class GalleryRequestHandler(BaseHTTPRequestHandler):
    folders = {}

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        request = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(request.query)

        if request.path == "/folders":
            self.respond_with_manifest()
        elif request.path == "/image":
            self.respond_with_image(query)
        else:
            self.send_error(404, "Unknown endpoint")

    def respond_with_manifest(self):
        body = json.dumps(build_folder_manifest(self.folders)).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def respond_with_image(self, query):
        folder_name = query.get("folder", [None])[0]
        file_name   = query.get("file",   [None])[0]
        
        image_paths = self.folders.get(folder_name, [])
        image_path  = next((path for path in image_paths if path.name == file_name), None)

        if not image_path or not image_path.exists():
            self.send_error(404, "Image not found")
            return

        try:
            file_size    = image_path.stat().st_size
            content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"

            self.send_response(200)
            self.send_header("Content-Type",   content_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.send_cors_headers()
            self.end_headers()
            
            # Prevent memory leaks
            with open(image_path, "rb") as f:
                shutil.copyfileobj(f, self.wfile)
                
        except Exception as e:
            self.log_message("Error serving %s: %s", file_name, str(e))

    def log_message(self, format_string, *args):
        if "GET /image" in format_string % args: return
        print(f"[gallery-server] {self.address_string()} - {format_string % args}")

def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(".").resolve()
    port = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PORT

    GalleryRequestHandler.folders = find_image_folders(root)
    folder_count = len(GalleryRequestHandler.folders)
    image_count  = sum(len(images) for images in GalleryRequestHandler.folders.values())

    print(f"Serving {folder_count} folders ({image_count} images) from {root}")
    print(f"Listening on http://localhost:{port}")

    server = ThreadingHTTPServer(("localhost", port), GalleryRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")

if __name__ == "__main__":
    main()