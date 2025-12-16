import React from "react";
import PropTypes from "prop-types";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as MicrophoneIcon } from "../icons/Microphone.svg";
import { ReactComponent as MicrophoneMutedIcon } from "../icons/MicrophoneMuted.svg";
import { FormattedMessage } from "react-intl";
import { useLectureMode } from "./hooks/useLectureMode";
import { ToolTip } from "@mozilla/lilypad-ui";

/**
 * Teacher-only toggle for Lecture Mode.
 * When enabled, students must request permission to speak.
 */
export function LectureModeToggle() {
    const { lectureModeEnabled, toggleLectureMode, isTeacher } = useLectureMode();

    // Only show for teachers
    if (!isTeacher) {
        return null;
    }

    const label = lectureModeEnabled ? (
        <FormattedMessage id="toolbar.lecture-mode-on" defaultMessage="Lecture" />
    ) : (
        <FormattedMessage id="toolbar.lecture-mode-off" defaultMessage="Lecture" />
    );

    const tooltipText = lectureModeEnabled
        ? "Lecture Mode ON - Click to disable"
        : "Click to enable Lecture Mode";

    return (
        <ToolTip description={tooltipText}>
            <ToolbarButton
                icon={lectureModeEnabled ? <MicrophoneMutedIcon /> : <MicrophoneIcon />}
                preset={lectureModeEnabled ? "accent1" : "basic"}
                label={label}
                onClick={toggleLectureMode}
                selected={lectureModeEnabled}
            />
        </ToolTip>
    );
}

LectureModeToggle.propTypes = {};

export default LectureModeToggle;
