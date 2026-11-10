"use client";

async function html2canvas(element: HTMLElement) {
  const mod = await import("html2canvas-pro");
  return mod.default(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: element.offsetWidth,
    height: element.offsetHeight,
    windowWidth: element.offsetWidth,
    windowHeight: element.offsetHeight,
  });
}

async function makePdf(orientation: "portrait" | "landscape") {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: "portrait" | "landscape" = "portrait",
) {
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(element);
  const pdf = await makePdf(orientation);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const image = canvas.toDataURL("image/png");

  // Preserve the aspect ratio so unusually long event lists are scaled down to
  // fit one A4 page instead of being stretched or clipped.
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const renderWidth = canvas.width * ratio;
  const renderHeight = canvas.height * ratio;
  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = (pageHeight - renderHeight) / 2;
  pdf.addImage(
    image,
    "PNG",
    offsetX,
    offsetY,
    renderWidth,
    renderHeight,
    undefined,
    "FAST",
  );
  pdf.save(filename);
}

export async function exportElementsToPdf(
  elements: HTMLElement[],
  filename: string,
  orientation: "portrait" | "landscape" = "landscape",
) {
  if (!elements.length) return;
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const pdf = await makePdf(orientation);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < elements.length; i++) {
    const canvas = await html2canvas(elements[i]!);
    const image = canvas.toDataURL("image/png");
    if (i > 0) pdf.addPage();
    pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
  }
  pdf.save(filename);
}
