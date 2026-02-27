import http.server
import socketserver
import os
import subprocess
import webbrowser
from pathlib import Path
import sys

PORT = 8000
# The directory to serve, relative to the project root
SERVE_DIR = "dist"

def run_build():
    """Runs the build script to ensure content is fresh."""
    print("--- Rebuilding project ---")
    scripts_dir = Path(__file__).parent
    build_script = scripts_dir / "build.py"
    
    try:
        subprocess.run([sys.executable, str(build_script)], check=True)
        print("--- Build successful ---\n")
    except subprocess.CalledProcessError as e:
        print(f"--- Build failed: {e} ---")
        return False
    return True

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def do_GET(self):
        # 🧭 Genius Move: SPA Routing Support
        # If the requested path is not a file or directory, redirect to index.html
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not path.endswith('/'):
            self.path = '/index.html'
        
        return super().do_GET()

def start_server():
    """Starts the HTTP server."""
    # Ensure we are in the project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    if not (project_root / SERVE_DIR).exists():
        print(f"Directory '{SERVE_DIR}' not found. Attempting build...")
        if not run_build():
            print("Could not start server because build failed.")
            return

    # Using socketserver for a more robust server implementation
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"Serving app at: {url}")
            print("Press Ctrl+C to stop the server.")
            
            # Open browser automatically
            webbrowser.open(url)
            
            httpd.serve_forever()
    except EOFError:
        print("\nServer shutting down.")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    # If '--build' is passed, rebuild before serving
    if len(sys.argv) > 1 and sys.argv[1] == "--build":
        run_build()
    
    start_server()
