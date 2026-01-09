"""
Zotero API service for fetching library items and attachments.
Uses pyzotero to interact with Zotero Cloud API.
"""
import os
import zipfile
import tempfile
from pathlib import Path
from typing import Optional
from pyzotero import zotero

# Cache directory for downloaded files (resolve to absolute path)
_cache_env = os.environ.get("CACHE_DIR", "./cache")
CACHE_DIR = Path(_cache_env).resolve()


class ZoteroService:
    """Service for interacting with Zotero Cloud API."""

    def __init__(self):
        self.user_id = os.environ.get("ZOTERO_USER_ID")
        self.api_key = os.environ.get("ZOTERO_API_KEY")
        self._client: Optional[zotero.Zotero] = None

        # Ensure cache directory exists
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    @property
    def client(self) -> zotero.Zotero:
        """Lazy initialization of Zotero client."""
        if self._client is None:
            if not self.user_id or not self.api_key:
                raise ValueError(
                    "ZOTERO_USER_ID and ZOTERO_API_KEY must be set in environment"
                )
            self._client = zotero.Zotero(self.user_id, "user", self.api_key)
        return self._client

    def is_configured(self) -> bool:
        """Check if Zotero credentials are configured."""
        return bool(self.user_id and self.api_key)

    def get_library_items(self, limit: int = 0) -> list[dict]:
        """
        Fetch all items from Zotero library with their attachments.
        Returns a list of items with attachment metadata.

        Args:
            limit: Max items to fetch. 0 means fetch all items.
        """
        items = []

        # Fetch top-level items (not attachments themselves)
        # Use pyzotero's everything() for full library, or top() with limit
        if limit == 0:
            top_items = self.client.everything(self.client.top())
        else:
            top_items = self.client.top(limit=limit)

        for item in top_items:
            item_data = item.get("data", {})
            item_key = item_data.get("key")
            item_type = item_data.get("itemType")

            # Skip notes and other non-document types
            if item_type in ("note", "annotation"):
                continue

            # Get attachments for this item
            attachments = self._get_item_attachments(item_key)

            # Build item info
            item_info = {
                "key": item_key,
                "title": item_data.get("title", "Untitled"),
                "itemType": item_type,
                "creators": item_data.get("creators", []),
                "dateAdded": item_data.get("dateAdded"),
                "attachments": attachments,
            }

            # Only include items that have viewable attachments
            if attachments:
                items.append(item_info)

        return items

    def _get_item_attachments(self, parent_key: str) -> list[dict]:
        """Get all attachments for a parent item."""
        attachments = []

        try:
            children = self.client.children(parent_key)

            for child in children:
                child_data = child.get("data", {})

                if child_data.get("itemType") != "attachment":
                    continue

                link_mode = child_data.get("linkMode")
                content_type = child_data.get("contentType", "")
                filename = child_data.get("filename", "")

                # We support imported files (PDFs) and snapshots (HTML)
                if link_mode in ("imported_file", "imported_url"):
                    attachment_type = self._determine_attachment_type(
                        content_type, filename, link_mode
                    )

                    if attachment_type:
                        attachments.append({
                            "key": child_data.get("key"),
                            "filename": filename,
                            "contentType": content_type,
                            "type": attachment_type,  # 'pdf' or 'html'
                            "linkMode": link_mode,
                        })
        except Exception as e:
            print(f"Error fetching attachments for {parent_key}: {e}")

        return attachments

    def _determine_attachment_type(
        self, content_type: str, filename: str, link_mode: str
    ) -> Optional[str]:
        """Determine if attachment is PDF or HTML snapshot."""
        # PDF files
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            return "pdf"

        # HTML snapshots (imported_url with text/html or .html files)
        if link_mode == "imported_url":
            return "html"

        if content_type == "text/html" or filename.lower().endswith((".html", ".htm")):
            return "html"

        return None

    def get_attachment_file(self, attachment_key: str) -> tuple[Path, str]:
        """
        Download attachment and return local path and content type.
        Uses cache to avoid re-downloading.

        Returns:
            tuple: (file_path, content_type)
        """
        import shutil

        # Cache path is a directory containing the downloaded file
        cache_path = CACHE_DIR / attachment_key

        if cache_path.exists() and cache_path.is_dir():
            files = list(cache_path.iterdir())
            if files:
                # Already cached
                content_type = self._get_cached_content_type(cache_path)
                file_path = self._get_servable_file(cache_path)
                return file_path, content_type

        # Ensure cache directory exists
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        try:
            # Get attachment info first to know the filename
            attachment_info = self.client.item(attachment_key)
            filename = attachment_info.get("data", {}).get("filename", "")

            if not filename:
                raise RuntimeError(f"No filename for attachment {attachment_key}")

            # Create subdirectory for this attachment
            cache_path.mkdir(parents=True, exist_ok=True)

            # Download file content directly using file() method
            file_content = self.client.file(attachment_key)

            # Write to cache
            dst_file = cache_path / filename
            with open(dst_file, "wb") as f:
                f.write(file_content)

            content_type = self._get_cached_content_type(cache_path)
            file_path = self._get_servable_file(cache_path)
            return file_path, content_type

        except Exception as e:
            # Clean up on failure
            if cache_path.exists() and cache_path.is_dir():
                shutil.rmtree(cache_path)
            raise RuntimeError(f"Failed to download attachment {attachment_key}: {e}")

    def _get_cached_content_type(self, cache_path: Path) -> str:
        """Determine content type from cached files."""
        files = list(cache_path.iterdir())

        if not files:
            raise FileNotFoundError(f"No files in cache: {cache_path}")

        # Check for PDF
        pdf_files = [f for f in files if f.suffix.lower() == ".pdf"]
        if pdf_files:
            return "application/pdf"

        # Check for HTML (direct or in zip)
        html_files = [f for f in files if f.suffix.lower() in (".html", ".htm")]
        if html_files:
            return "text/html"

        # Check for ZIP (HTML snapshot)
        zip_files = [f for f in files if f.suffix.lower() == ".zip"]
        if zip_files:
            # Extract and return HTML
            self._extract_snapshot_zip(zip_files[0], cache_path)
            return "text/html"

        # Check for directories (already extracted snapshots)
        dirs = [f for f in files if f.is_dir()]
        for d in dirs:
            html_in_dir = list(d.glob("*.html")) + list(d.glob("*.htm"))
            if html_in_dir:
                return "text/html"

        # Default to octet-stream if unknown
        return "application/octet-stream"

    def _extract_snapshot_zip(self, zip_path: Path, extract_to: Path) -> None:
        """Extract HTML snapshot from ZIP file."""
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_to)

    def _get_servable_file(self, cache_path: Path) -> Path:
        """Find the actual file to serve from cache directory."""
        files = list(cache_path.iterdir())

        # Direct PDF file
        pdf_files = [f for f in files if f.suffix.lower() == ".pdf" and f.is_file()]
        if pdf_files:
            return pdf_files[0]

        # Direct HTML file
        html_files = [f for f in files if f.suffix.lower() in (".html", ".htm") and f.is_file()]
        if html_files:
            # Prefer index.html
            for f in html_files:
                if f.name.lower() == "index.html":
                    return f
            return html_files[0]

        # Look in subdirectories (extracted snapshots)
        for item in files:
            if item.is_dir():
                # Look for index.html first
                index_html = item / "index.html"
                if index_html.exists():
                    return index_html

                # Otherwise any HTML file
                sub_html = list(item.glob("*.html")) + list(item.glob("*.htm"))
                if sub_html:
                    return sub_html[0]

        # Fallback: return first file
        for f in files:
            if f.is_file():
                return f

        raise FileNotFoundError(f"No servable file found in {cache_path}")


# Singleton instance
_zotero_service: Optional[ZoteroService] = None


def get_zotero_service() -> ZoteroService:
    """Get or create the Zotero service singleton."""
    global _zotero_service
    if _zotero_service is None:
        _zotero_service = ZoteroService()
    return _zotero_service
