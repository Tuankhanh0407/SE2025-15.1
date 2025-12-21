import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as DesktopIcon } from "../icons/Desktop.svg";
import { useTeacherRole } from "./hooks/useTeacherRole";
import { usePresentationRequests } from "./hooks/usePresentationRequests";

/**
 * Student "Request to Present" button.
 * Visible only to students (non-teachers).
 * 
 * States:
 * 1. Default: Show "Request to Present" button
 * 2. Approved, not yet started: Show "Start Presenting" button (user must click to start)
 * 3. Presenting: Show "Stop Presenting" button
 * 4. Someone else is presenting: Show "Presenting..." button (disabled)
 */
export function StudentPresentButton() {
    const { isTeacher } = useTeacherRole();
    const {
        isApprovedPresenter,
        isPresenting,
        currentPresenterId,
        requestToPresent,
        startPresenting,
        endPresenting
    } = usePresentationRequests();

    // Only show to students
    if (isTeacher) {
        return null;
    }

    // If this student is currently presenting (approved AND started)
    if (isPresenting) {
        return (
            <ToolbarButton
                icon={<DesktopIcon />}
                preset="accept"
                label={<FormattedMessage id="toolbar.stop-presenting" defaultMessage="Stop Presenting" />}
                onClick={endPresenting}
                selected={true}
            />
        );
    }

    // If this student is approved but hasn't started yet
    // They must click to start (browser requires user gesture for getDisplayMedia)
    if (isApprovedPresenter) {
        return (
            <ToolbarButton
                icon={<DesktopIcon />}
                preset="accent4"
                label={<FormattedMessage id="toolbar.start-presenting" defaultMessage="Start Presenting" />}
                onClick={startPresenting}
            />
        );
    }

    // If someone else is presenting
    if (currentPresenterId) {
        return (
            <ToolbarButton
                icon={<DesktopIcon />}
                preset="basic"
                label={<FormattedMessage id="toolbar.presenting" defaultMessage="Presenting..." />}
                disabled={true}
            />
        );
    }

    // Default: Show request button
    return (
        <ToolbarButton
            icon={<DesktopIcon />}
            preset="accent3"
            label={<FormattedMessage id="toolbar.request-present" defaultMessage="Request to Present" />}
            onClick={requestToPresent}
        />
    );
}

StudentPresentButton.propTypes = {};

export default StudentPresentButton;
