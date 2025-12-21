import React from "react";
import PropTypes from "prop-types";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as CameraIcon } from "../icons/Camera.svg";
import { ReactComponent as PeopleIcon } from "../icons/People.svg";
import { ReactComponent as DesktopIcon } from "../icons/Desktop.svg";
import { ReactComponent as HandRaisedIcon } from "../icons/HandRaised.svg";
import { FormattedMessage } from "react-intl";
import { useTeacherRole } from "./hooks/useTeacherRole";
import { usePresentationRequests } from "./hooks/usePresentationRequests";
import { LectureModeToggle } from "./LectureModeToggle";
import styles from "./TeacherToolbarButtons.scss";

/**
 * Teacher-only toolbar buttons for Whiteboard, Attendance, Projection, Lecture Mode,
 * and Presentation Requests management.
 * These buttons are hidden for students.
 */
export function TeacherToolbarButtons({
    scene,
    showWhiteboard,
    onToggleWhiteboard,
    showAttendance,
    onToggleAttendance,
    showProjection,
    onToggleProjection,
    showPresentationRequests,
    onTogglePresentationRequests
}) {
    const { isTeacher } = useTeacherRole();
    const { requestCount, hasRequests, currentPresenterId } = usePresentationRequests();

    // Only show these buttons to teachers
    if (!isTeacher) {
        return null;
    }

    return (
        <>
            <LectureModeToggle />
            <ToolbarButton
                icon={<CameraIcon />}
                preset="accent5"
                label={<FormattedMessage id="toolbar.whiteboard" defaultMessage="Whiteboard" />}
                onClick={onToggleWhiteboard}
                selected={showWhiteboard}
            />
            <ToolbarButton
                icon={<DesktopIcon />}
                preset="accent3"
                label={<FormattedMessage id="toolbar.projection" defaultMessage="Projection" />}
                onClick={onToggleProjection}
                selected={showProjection}
            />
            <div className={styles.requestsButtonWrapper}>
                <ToolbarButton
                    icon={<HandRaisedIcon />}
                    preset={hasRequests ? "accent1" : "basic"}
                    label={<FormattedMessage id="toolbar.requests" defaultMessage="Requests" />}
                    onClick={onTogglePresentationRequests}
                    selected={showPresentationRequests || !!currentPresenterId}
                />
                {hasRequests && (
                    <span className={styles.requestsBadge}>{requestCount}</span>
                )}
            </div>
            <ToolbarButton
                icon={<PeopleIcon />}
                preset="accent4"
                label={<FormattedMessage id="toolbar.attendance" defaultMessage="Attendance" />}
                onClick={onToggleAttendance}
                selected={showAttendance}
            />
        </>
    );
}

TeacherToolbarButtons.propTypes = {
    scene: PropTypes.object,
    showWhiteboard: PropTypes.bool,
    onToggleWhiteboard: PropTypes.func.isRequired,
    showAttendance: PropTypes.bool,
    onToggleAttendance: PropTypes.func.isRequired,
    showProjection: PropTypes.bool,
    onToggleProjection: PropTypes.func.isRequired,
    showPresentationRequests: PropTypes.bool,
    onTogglePresentationRequests: PropTypes.func
};

export default TeacherToolbarButtons;
