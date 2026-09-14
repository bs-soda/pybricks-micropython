import os
import sys
import time
import re
import subprocess
from urllib.parse import urljoin

def install_dependencies():
    """Ensure playwright is installed before running the scraper."""
    print("Checking dependencies...")
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Installing playwright package via pip...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
    
    # Ensure browsers are installed
    print("Installing Chromium browser for Playwright...")
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])

# Install dependencies if needed
install_dependencies()

from playwright.sync_api import sync_playwright

BASE_URL = "https://partner.tiktokshop.com/docv2/page/get-authorized-category-assets-202405"
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../docs/02-product"))

def make_safe_foldername(name):
    """Sanitize directory names to be safe for macOS/Linux file systems."""
    safe = re.sub(r'[\\/*?:"<>|]', "-", name)
    # Replace multiple spaces with a single space
    safe = re.sub(r'\s+', " ", safe)
    return safe.strip()

def main():
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Base output directory set to: {OUTPUT_DIR}")

    with sync_playwright() as p:
        print("Launching headless browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print(f"Navigating to base page: {BASE_URL}")
        page.goto(BASE_URL)
        
        # Wait for sidebar to render (attached to DOM)
        print("Waiting for sidebar menu to render in DOM...")
        page.wait_for_selector("#doc_left_menu", state="attached", timeout=20000)
        time.sleep(3)  # Additional time for stability

        # Expand all collapsed directories in the sidebar
        print("Expanding all collapsed directories in the sidebar...")
        page.evaluate("""() => {
            const dirs = document.querySelectorAll('#doc_left_menu .style-module__side-menu-dir--IbLLG');
            dirs.forEach(dir => {
                const nextEl = dir.nextElementSibling;
                const isCollapsed = !nextEl || nextEl.classList.contains('style-module__side-menu-dir--IbLLG');
                if (isCollapsed) {
                    dir.click();
                }
            });
        }""")
        time.sleep(5)  # Wait for all directories to expand and load child links

        # Extract structured categories and their page links
        print("Extracting categories and document links...")
        categories_data = page.evaluate("""() => {
            const doc_data = [];
            const dirs = document.querySelectorAll('#doc_left_menu .style-module__side-menu-dir--IbLLG');
            dirs.forEach(dir => {
                const dirName = dir.innerText.trim();
                const links = [];
                let nextEl = dir.nextElementSibling;
                while (nextEl && !nextEl.classList.contains('style-module__side-menu-dir--IbLLG')) {
                    const href = nextEl.getAttribute('href');
                    if (href && href.startsWith('/docv2/page/')) {
                        links.push(href);
                    }
                    nextEl = nextEl.nextElementSibling;
                }
                if (links.length > 0) {
                    doc_data.push({
                        dir_name: dirName,
                        links: links
                    });
                }
            });
            return doc_data;
        }""")

        total_pages = sum(len(cat["links"]) for cat in categories_data)
        print(f"Discovered {len(categories_data)} categories and {total_pages} total documentation pages.")

        # Download each page and save inside its respective category folder
        current_index = 1
        for cat in categories_data:
            category_name = cat["dir_name"]
            safe_category_name = make_safe_foldername(category_name)
            category_dir = os.path.join(OUTPUT_DIR, safe_category_name)
            
            # Create subfolder for the category
            os.makedirs(category_dir, exist_ok=True)
            print(f"\nCategory: {category_name} -> saving to: docs/02-product/{safe_category_name}/")

            for href in cat["links"]:
                url = urljoin(BASE_URL, href)
                page_name = href.split("/")[-1]
                output_filepath = os.path.join(category_dir, f"{page_name}.md")
                print(f"[{current_index}/{total_pages}] Downloading {page_name}...")
                current_index += 1

                try:
                    page.goto(url)
                    # Wait for the document content page to load
                    page.wait_for_load_state("domcontentloaded")
                    
                    # Locate the "Download Markdown" button by text (case-insensitive)
                    download_btn = page.get_by_text("Download Markdown", exact=False).first
                    
                    # Wait for the download button to become visible (up to 10 seconds)
                    download_btn.wait_for(state="visible", timeout=10000)
                    
                    # Intercept the download event
                    with page.expect_download(timeout=10000) as download_info:
                        download_btn.click()
                    download = download_info.value
                    download.save_as(output_filepath)
                    print(f"    -> Successfully downloaded Markdown to: docs/02-product/{safe_category_name}/{page_name}.md")
                
                except Exception as e:
                    print(f"    -> ERROR downloading {page_name}: {e}")

        print("\nClosing browser...")
        browser.close()
        print("Done!")

if __name__ == "__main__":
    main()
