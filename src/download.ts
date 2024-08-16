import { toPng, toSvg } from "html-to-image";

export const downloadChart = (node: HTMLElement, fileName: string, format: "png" | "svg" = "png") => {
    (format === "png" ? toPng : toSvg)(node, { pixelRatio: 4 }).then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};
