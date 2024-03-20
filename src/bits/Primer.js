import { memo, useContext } from "react";
import { Popover, Tag } from "antd";
import { PlusCircleFilled, PlusCircleOutlined } from "@ant-design/icons";

import { PrimerPaletteContext } from "../colors";

const Primer = memo(({ name, added, sometimes, primerSetCount }) => {
    const palette = useContext(PrimerPaletteContext);

    /** @type React.ReactNode */
    const tag = (
        <Tag
            icon={added ? (sometimes ? <PlusCircleOutlined /> : <PlusCircleFilled />) : null}
            color={palette?.[name]}
            style={{ margin: "0.2em 0.5em 0.2em 0" }}
        >{name}</Tag>
    );

    return added ? (
        <Popover
            title="Added"
            content={sometimes
                ? `Versus some of the ${primerSetCount-1}-primer pair sets, this primer is new.`
                : `Versus the ${primerSetCount-1}-primer pair set(s), this primer is new.`}>{tag}</Popover>
    ) : tag;
});

export default Primer;
