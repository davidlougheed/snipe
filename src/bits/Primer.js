import { memo } from "react";
import { Tag } from "antd";

const colors = [
    "magenta",
    "red",
    "volcano",
    "orange",
    "gold",
    "lime",
    "green",
    "cyan",
    "blue",
    "geekblue",
    "purple",
];

const Primer = memo(({ name }) => {
    const colorIndex = Array.from(new TextEncoder().encode(name)).reduce((acc, x) => acc + x, 0) % colors.length;
    return <Tag color={colors[colorIndex]} style={{ margin: "0.2em 0.5em 0.2em 0" }}>{name}</Tag>;
});

export default Primer;
