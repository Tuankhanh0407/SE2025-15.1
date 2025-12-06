import React, { useCallback, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as HandRaisedIcon } from "../icons/HandRaised.svg";
import { defineMessage, useIntl } from "react-intl";
import { ToolTip } from "@mozilla/lilypad-ui";
import { SOUND_CAMERA_TOOL_TOOK_SNAPSHOT } from "../../systems/sound-effects-system";

const raiseHandLabel = defineMessage({
    id: "toolbar.raise-hand",
    defaultMessage: "Raise Hand"
});

const lowerHandLabel = defineMessage({
    id: "toolbar.lower-hand",
    defaultMessage: "Lower Hand"
});

function usePresence(scene, initialPresence) {
    const [presence, setPresence] = useState(initialPresence);

    useEffect(() => {
        const onPresenceUpdate = ({ detail: presence }) => {
            if (presence.sessionId === NAF.clientId) setPresence(presence);
        };
        scene.addEventListener("presence_updated", onPresenceUpdate);
        return () => scene.removeEventListener("presence_updated", onPresenceUpdate);
    }, [scene]);

    return presence;
}

export function RaiseHandButton({ scene, initialPresence }) {
    const intl = useIntl();
    const presence = usePresence(scene, initialPresence);
    const handRaised = presence?.hand_raised;

    const onToggleHandRaised = useCallback(() => {
        if (handRaised) {
            window.APP.hubChannel.lowerHand();
        } else {
            window.APP.hubChannel.raiseHand();
            // Play sound when raising hand
            scene.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_CAMERA_TOOL_TOOK_SNAPSHOT);
        }
    }, [handRaised, scene]);

    const label = intl.formatMessage(handRaised ? lowerHandLabel : raiseHandLabel);

    return (
        <ToolTip description={label}>
            <ToolbarButton
                icon={<HandRaisedIcon />}
                onClick={onToggleHandRaised}
                label={label}
                preset={handRaised ? "accent1" : "basic"}
                selected={handRaised}
            />
        </ToolTip>
    );
}

RaiseHandButton.propTypes = {
    scene: PropTypes.object.isRequired,
    initialPresence: PropTypes.object
};
