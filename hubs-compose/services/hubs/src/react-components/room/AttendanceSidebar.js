import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { CloseButton } from "../input/CloseButton";
import { IconButton } from "../input/IconButton";
import { FormattedMessage } from "react-intl";
import styles from "./AttendanceSidebar.scss";
import { ReactComponent as ExternalLinkIcon } from "../icons/ExternalLink.svg";
import { ReactComponent as DeleteIcon } from "../icons/Delete.svg";
import { useTeacherRole } from "./hooks/useTeacherRole";
import { useAttendance } from "./hooks/useAttendance";

export function AttendanceSidebar({ onClose, visible }) {
    const { isTeacher } = useTeacherRole();
    const { records, clearRecords, exportToCSV, formatTime, getDuration } = useAttendance();
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update current time every second to refresh duration display
    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [visible]);

    if (!visible) return null;

    // Show "Teachers Only" message for students
    if (!isTeacher) {
        return (
            <div className={styles.attendanceSidebar}>
                <div className={styles.header}>
                    <CloseButton onClick={onClose} />
                    <h2 className={styles.title}>
                        <FormattedMessage id="attendance-sidebar.title" defaultMessage="Attendance" />
                    </h2>
                </div>
                <div className={styles.teachersOnly}>
                    <span className={styles.teachersOnlyIcon}>📋</span>
                    <h3>
                        <FormattedMessage id="attendance-sidebar.teachers-only" defaultMessage="Teachers Only" />
                    </h3>
                    <p>
                        <FormattedMessage
                            id="attendance-sidebar.teachers-only-desc"
                            defaultMessage="Only teachers can view and manage attendance records."
                        />
                    </p>
                </div>
            </div>
        );
    }

    const inRoomCount = records.filter(r => r.isInRoom).length;
    const leftCount = records.filter(r => !r.isInRoom).length;

    return (
        <div className={styles.attendanceSidebar}>
            <div className={styles.header}>
                <CloseButton onClick={onClose} />
                <h2 className={styles.title}>
                    <FormattedMessage id="attendance-sidebar.title" defaultMessage="Attendance" />
                </h2>
                <div className={styles.actions}>
                    <IconButton
                        onClick={exportToCSV}
                        title="Download CSV"
                        className={styles.downloadButton}
                        disabled={records.length === 0}
                    >
                        <ExternalLinkIcon />
                    </IconButton>
                    <IconButton
                        onClick={clearRecords}
                        title="Clear Records"
                        className={styles.actionButton}
                        disabled={records.length === 0}
                    >
                        <DeleteIcon />
                    </IconButton>
                </div>
            </div>

            <div className={styles.stats}>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{inRoomCount}</span>
                    <span className={styles.statLabel}>
                        <FormattedMessage id="attendance-sidebar.in-room" defaultMessage="In Room" />
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{leftCount}</span>
                    <span className={styles.statLabel}>
                        <FormattedMessage id="attendance-sidebar.left-room" defaultMessage="Left" />
                    </span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{records.length}</span>
                    <span className={styles.statLabel}>
                        <FormattedMessage id="attendance-sidebar.total" defaultMessage="Total" />
                    </span>
                </div>
            </div>

            <div className={styles.recordsList}>
                {records.length === 0 ? (
                    <div className={styles.noRecords}>
                        <FormattedMessage
                            id="attendance-sidebar.no-records"
                            defaultMessage="No attendance records yet. Users will appear here when they join."
                        />
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>
                                    <FormattedMessage id="attendance-sidebar.name" defaultMessage="Name" />
                                </th>
                                <th>
                                    <FormattedMessage id="attendance-sidebar.joined" defaultMessage="Joined" />
                                </th>
                                <th>
                                    <FormattedMessage id="attendance-sidebar.duration" defaultMessage="Duration" />
                                </th>
                                <th>
                                    <FormattedMessage id="attendance-sidebar.status" defaultMessage="Status" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(record => (
                                <tr key={record.id} className={record.isInRoom ? styles.inRoom : styles.leftRoom}>
                                    <td className={styles.nameCell}>
                                        <span className={styles.statusDot} />
                                        {record.displayName}
                                    </td>
                                    <td>{formatTime(record.joinTime)}</td>
                                    <td>{getDuration(record.joinTime, record.leaveTime)}</td>
                                    <td>
                                        <span className={styles.statusBadge}>
                                            {record.isInRoom ? (
                                                <FormattedMessage id="attendance-sidebar.in-room" defaultMessage="In Room" />
                                            ) : (
                                                <FormattedMessage id="attendance-sidebar.left-room" defaultMessage="Left" />
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

AttendanceSidebar.propTypes = {
    onClose: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired
};

export default AttendanceSidebar;
