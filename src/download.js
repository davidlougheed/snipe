import { toPng, toSvg } from "html-to-image";

export const downloadChart = (node, fileName, format = "png") => {
    (format === "png" ? toPng : toSvg)(node).then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};
