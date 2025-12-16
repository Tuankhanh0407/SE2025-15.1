import React from "react";
import PropTypes from "prop-types";
import { AudioPopoverButton } from "./AudioPopoverButton";
import { useMicrophoneStatus } from "./hooks/useMicrophoneStatus";
import { ToolbarMicButton } from "../input/ToolbarMicButton";
import { ReactComponent as MicrophoneIcon } from "../icons/Microphone.svg";
import { ReactComponent as MicrophoneMutedIcon } from "../icons/MicrophoneMuted.svg";
import { FormattedMessage, defineMessages, useIntl } from "react-intl";
import { useCan } from "./hooks/useCan";
import { PermissionStatus } from "../../utils/media-devices-utils";
import { AudioPopoverContentContainer } from "./AudioPopoverContentContainer";
import { ToolTip } from "@mozilla/lilypad-ui";
import { useLectureMode } from "./hooks/useLectureMode";

export const AudioPopoverButtonContainer = ({ scene, initiallyVisible }) => {
  const { isMicMuted, toggleMute, permissionStatus } = useMicrophoneStatus(scene);
  const micPermissionDenied = permissionStatus === PermissionStatus.DENIED;
  const canVoiceChat = useCan("voice_chat");
  const { lectureModeEnabled, canSpeak } = useLectureMode();
  const intl = useIntl();

  const muteStatuses = defineMessages({
    mute: {
      id: "mute",
      defaultMessage: "Mute"
    },
    unmute: {
      id: "unmute",
      defaultMessage: "Unmute"
    }
  });

  // Check if user is blocked by lecture mode
  const blockedByLectureMode = lectureModeEnabled && !canSpeak;

  // Determine if the button should be disabled
  const isDisabled = !canVoiceChat || micPermissionDenied || blockedByLectureMode;

  // Custom description for lecture mode
  let description;
  if (blockedByLectureMode) {
    description = intl.formatMessage({
      id: "mute-tooltip.lecture-mode",
      defaultMessage: "Raise hand to request permission to speak"
    });
  } else {
    description = intl.formatMessage(
      {
        id: "mute-tooltip.description",
        defaultMessage: "{muteStatus} Microphone (M)"
      },
      { muteStatus: intl.formatMessage(muteStatuses[isMicMuted ? "unmute" : "mute"]) }
    );
  }

  // Handle toggle - only allow if not blocked by lecture mode
  const handleToggleMute = () => {
    if (blockedByLectureMode) {
      return; // Don't allow unmuting when blocked
    }
    toggleMute();
  };

  return (
    <AudioPopoverButton
      initiallyVisible={initiallyVisible}
      content={<AudioPopoverContentContainer scene={scene} />}
      micButton={
        <ToolTip description={description}>
          <ToolbarMicButton
            scene={scene}
            icon={isMicMuted || !canVoiceChat || micPermissionDenied || blockedByLectureMode ? <MicrophoneMutedIcon /> : <MicrophoneIcon />}
            label={
              blockedByLectureMode ? (
                <FormattedMessage id="voice-button-container.lecture-mode" defaultMessage="Raise Hand" />
              ) : (
                <FormattedMessage id="voice-button-container.label" defaultMessage="Voice" />
              )
            }
            preset="basic"
            onClick={handleToggleMute}
            statusColor={!isDisabled ? (isMicMuted ? "disabled" : "enabled") : undefined}
            type={"right"}
            disabled={isDisabled}
          />
        </ToolTip>
      }
      onChangeMicrophoneMuted={handleToggleMute}
    />
  );
};

AudioPopoverButtonContainer.propTypes = {
  scene: PropTypes.object.isRequired,
  initiallyVisible: PropTypes.bool
};

