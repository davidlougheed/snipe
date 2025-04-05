import { memo, useContext } from "react";
import { Popover, Tag } from "antd";
import { PlusCircleFilled, PlusCircleOutlined } from "@ant-design/icons";

import { PrimerPaletteContext } from "../lib/colors";

export type PrimerAddedConfig = {
    sometimes: boolean;
    primerSetCount: number;
};

export type PrimerProps = {
    name: string; // TODO
    added?: PrimerAddedConfig;
};

const Primer = memo(({ name, added }: PrimerProps) => {
    const palette = useContext(PrimerPaletteContext);

    const tag = (
        <Tag
            icon={added ? added.sometimes ? <PlusCircleOutlined /> : <PlusCircleFilled /> : null}
            color={palette?.[name]}
            style={{ margin: "0.2em 0.5em 0.2em 0" }}
        >
            {name}
        </Tag>
    );

    return added ? (
        <Popover
            title="Added"
            content={
                added.sometimes
                    ? `Versus some of the ${added.primerSetCount - 1}-primer pair sets, this primer is new.`
                    : `Versus the ${added.primerSetCount - 1}-primer pair set(s), this primer is new.`
            }
        >
            {tag}
        </Popover>
    ) : (
        tag
    );
});

export default Primer;
