import asyncio
from pyppeteer import launch


async def generate_pdf(url: str) -> bytes:
    """
    Load the Streamlit page in headless Chrome and export a fully rendered PDF.
    """

    browser = await launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080"
        ]
    )

    page = await browser.newPage()
    await page.goto(url, {"waitUntil": "networkidle2"})

    # Wait for Streamlit DOM hydration
    await page.waitForSelector("#rh-title")

    pdf_bytes = await page.pdf({
        "format": "A4",
        "printBackground": True,
        "margin": {
            "top": "20mm",
            "bottom": "20mm",
            "left": "15mm",
            "right": "15mm"
        }
    })

    await browser.close()
    return pdf_bytes
