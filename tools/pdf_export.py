# tools/pdf_export.py

import asyncio
from playwright.async_api import async_playwright


async def generate_pdf(url: str) -> bytes:
    """
    Load the Streamlit page in headless Chromium and export a fully rendered PDF.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--window-size=1920,1080",
            ],
        )

        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")

        # Wait for your dynamic header to be present
        await page.wait_for_selector("#rh-title")

        pdf_bytes = await page.pdf(
            format="A4",
            print_background=True,
            margin={
                "top": "20mm",
                "bottom": "20mm",
                "left": "15mm",
                "right": "15mm",
            },
        )

        await browser.close()
        return pdf_bytes


def generate_pdf_sync(url: str) -> bytes:
    """
    Synchronous wrapper for Streamlit.
    """
    return asyncio.run(generate_pdf(url))
