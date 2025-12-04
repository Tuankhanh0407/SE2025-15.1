import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ImageGridPopover } from "../popover/ImageGridPopover";
import { Popover } from "../popover/Popover";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as ReactionIcon } from "../icons/Reaction.svg";
import { ReactComponent as HandRaisedIcon } from "../icons/HandRaised.svg";
import { defineMessage, FormattedMessage, useIntl } from "react-intl";
import { Column } from "../layout/Column";
import { Row } from "../layout/Row";
import { HandRaisedButton } from "./ReactionButton";
import styles from "./ReactionPopover.scss";
import { Button } from "../input/Button";
import { ToolTip } from "@mozilla/lilypad-ui";

const reactTooltipDescription = defineMessage({
  id: "react-tooltip.description",
  defaultMessage: "Reactions"
});

const reactionPopoverTitle = defineMessage({
  id: "reaction-popover.title",
  defaultMessage: "React"
});

function ReactionPopoverContent({ items, ...rest }) {
  return (
    <Column padding="sm" grow gap="sm">
      <Row noWrap>
        <ImageGridPopover items={items} {...rest} />
      </Row>
    </Column>
  );
}

ReactionPopoverContent.propTypes = {
  items: PropTypes.array.isRequired
};

function TooltipPopoverContent({ onToggleHandRaised }) {
  return (
    <Row nowrap className={styles.popover}>
      <Column padding="xs" grow gap="xs">
        <FormattedMessage id="reaction-popover.hand-raised-warning" defaultMessage="Your hand is raised" />
      </Column>
      <Column padding="xs" grow gap="xs">
        <Button sm thin preset={"primary"} onClick={onToggleHandRaised}>
          <FormattedMessage id="reaction-popover.lower-hand" defaultMessage="Lower Hand" />
        </Button>
      </Column>
    </Row>
  );
}

TooltipPopoverContent.propTypes = {
  onToggleHandRaised: PropTypes.func
};

export function ReactionPopoverButton({ items }) {
  const intl = useIntl();
  const title = intl.formatMessage(reactionPopoverTitle);
  const description = intl.formatMessage(reactTooltipDescription);
  const popoverApiRef = useRef();

  return (
    <Popover
      title={title}
      content={props => {
        return (
          <ReactionPopoverContent
            items={items}
            {...props}
          />
        );
      }}
      placement="top"
      offsetDistance={28}
      popoverApiRef={popoverApiRef}
    >
      {({ togglePopover, popoverVisible, triggerRef }) => (
        <ToolTip description={description}>
          <ToolbarButton
            ref={triggerRef}
            icon={<ReactionIcon />}
            selected={popoverVisible}
            onClick={togglePopover}
            label={title}
            preset="accent2"
          />
        </ToolTip>
      )}
    </Popover>
  );
}

ReactionPopoverButton.propTypes = {
  items: PropTypes.array.isRequired
};
