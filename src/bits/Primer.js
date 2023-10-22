import { memo } from "react";
import { Popover, Tag } from "antd";
import { PlusCircleFilled, PlusCircleOutlined } from "@ant-design/icons";

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

const Primer = memo(({ name, added, sometimes, primerSetCount }) => {
    const colorIndex = Array.from(new TextEncoder().encode(name)).reduce((acc, x) => acc + x, 0) % colors.length;

    /** @type React.ReactNode */
    const tag = (
        <Tag
            icon={added ? (sometimes ? <PlusCircleOutlined /> : <PlusCircleFilled />) : null}
            color={colors[colorIndex]}
            style={{ margin: "0.2em 0.5em 0.2em 0" }}
        >{name}</Tag>
    );

    return added ? (
        <Popover
            title="Added"
            content={sometimes
                ? `Versus some of the ${primerSetCount-1}-primer sets, this primer is new.`
                : `Versus the ${primerSetCount-1}-primer set(s), this primer is new.`}>{tag}</Popover>
    ) : tag;
});

export default Primer;
