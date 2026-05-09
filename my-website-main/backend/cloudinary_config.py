import cloudinary
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", "dlfxabo9b"),
    api_key=os.environ.get("CLOUDINARY_API_KEY", "147234592376233"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", "wlfRn6mAps9A5ogfdAg_xb68Hww"),
    secure=True
)