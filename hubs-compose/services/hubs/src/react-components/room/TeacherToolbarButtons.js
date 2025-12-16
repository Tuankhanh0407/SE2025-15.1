import React from "react";
import PropTypes from "prop-types";
import { ToolbarButton } from "../input/ToolbarButton";
import { ReactComponent as CameraIcon } from "../icons/Camera.svg";
import { ReactComponent as PeopleIcon } from "../icons/People.svg";
import { FormattedMessage } from "react-intl";
import { useTeacherRole } from "./hooks/useTeacherRole";

/**
 * Teacher-only toolbar buttons for Whiteboard and Attendance.
 * These buttons are hidden for students.
 */
export function TeacherToolbarButtons({
    showWhiteboard,
    onToggleWhiteboard,
    showAttendance,
    onToggleAttendance
}) {
    const { isTeacher } = useTeacherRole();

    // Only show these buttons to teachers
    if (!isTeacher) {
        return null;
    }

    return (
        <>
            <ToolbarButton
                icon={<CameraIcon />}
                preset="accent5"
                label={<FormattedMessage id="toolbar.whiteboard" defaultMessage="Whiteboard" />}
                onClick={onToggleWhiteboard}
                selected={showWhiteboard}
            />
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
    showWhiteboard: PropTypes.bool,
    onToggleWhiteboard: PropTypes.func.isRequired,
    showAttendance: PropTypes.bool,
    onToggleAttendance: PropTypes.func.isRequired
};

export default TeacherToolbarButtons;
