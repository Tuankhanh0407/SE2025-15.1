import React, { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Button } from "../input/Button";
import { useCssBreakpoints } from "react-use-css-breakpoints";
import { CreateRoomModal } from "./CreateRoomModal";

export function CreateRoomButton() {
  const breakpoint = useCssBreakpoints();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        thick={breakpoint === "sm" || breakpoint === "md"}
        xl={breakpoint !== "sm" && breakpoint !== "md"}
        preset="landing"
        onClick={e => {
          e.preventDefault();
          setShowModal(true);
        }}
      >
        <FormattedMessage id="create-room-button" defaultMessage="Create Room" />
      </Button>
      {showModal && (
        <CreateRoomModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
