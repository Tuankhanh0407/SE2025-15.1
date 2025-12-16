import { useState, useEffect, useCallback, useRef } from "react";
import { isUserTeacher } from "./useTeacherRole";

/**
 * Helper to check if a user is a teacher based on presence data
 */
function checkIsTeacher(sessionId, meta) {
    // Check profile.isTeacher first
    if (meta?.profile?.isTeacher !== undefined) {
        return meta.profile.isTeacher;
    }
    // Fall back to owner/creator status
    return meta?.roles?.owner || meta?.roles?.creator || false;
}

/**
 * Hook to track user attendance (join/leave events) in the room.
 * Records timestamps when users join and leave, calculates duration,
 * and provides export functionality.
 * NOTE: Teachers are excluded from attendance tracking.
 * 
 * @returns {Object} { records, clearRecords, exportToCSV, currentUsers }
 */
export function useAttendance() {
    const [records, setRecords] = useState([]);
    const recordsRef = useRef(records);

    // Keep ref in sync with state for use in event handlers
    useEffect(() => {
        recordsRef.current = records;
    }, [records]);

    // Initialize with current users in the room (excluding teachers)
    useEffect(() => {
        const presence = APP.hubChannel?.presence?.state;
        if (presence) {
            const now = Date.now();
            const initialRecords = [];

            Object.keys(presence).forEach(sessionId => {
                const meta = presence[sessionId]?.metas?.[0];
                if (meta) {
                    // Skip teachers - they don't need to be tracked
                    if (checkIsTeacher(sessionId, meta)) {
                        return;
                    }

                    initialRecords.push({
                        id: `${sessionId}-${now}`,
                        sessionId,
                        displayName: meta.profile?.displayName || "Unknown",
                        joinTime: now,
                        leaveTime: null,
                        isInRoom: true
                    });
                }
            });

            setRecords(initialRecords);
        }
    }, []);

    // Listen for presence events
    useEffect(() => {
        const scene = AFRAME.scenes[0];
        if (!scene) return;

        const handlePresenceUpdated = ({ detail: presence }) => {
            if (!presence) return;

            const { sessionId, profile, roles } = presence;

            // Skip teachers - they don't need to be tracked
            const isTeacher = profile?.isTeacher !== undefined
                ? profile.isTeacher
                : (roles?.owner || roles?.creator || false);

            if (isTeacher) {
                return;
            }

            const displayName = profile?.displayName || "Unknown";
            const now = Date.now();

            setRecords(prev => {
                // Check if user already has an active record
                const existingIndex = prev.findIndex(
                    r => r.sessionId === sessionId && r.isInRoom
                );

                if (existingIndex === -1) {
                    // New user joining - add record
                    return [...prev, {
                        id: `${sessionId}-${now}`,
                        sessionId,
                        displayName,
                        joinTime: now,
                        leaveTime: null,
                        isInRoom: true
                    }];
                } else {
                    // User exists, update display name if changed
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        displayName
                    };
                    return updated;
                }
            });
        };

        const handleUserLeft = (sessionId, displayName) => {
            const now = Date.now();

            setRecords(prev => {
                const existingIndex = prev.findIndex(
                    r => r.sessionId === sessionId && r.isInRoom
                );

                if (existingIndex !== -1) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        leaveTime: now,
                        isInRoom: false
                    };
                    return updated;
                }
                return prev;
            });
        };

        // Listen to hub events for join/leave
        const events = APP.hubChannel?.events;
        if (events) {
            const handleHubJoin = ({ key, current }) => {
                if (current?.presence === "room") {
                    // Skip teachers
                    const isTeacher = current.profile?.isTeacher !== undefined
                        ? current.profile.isTeacher
                        : (current.roles?.owner || current.roles?.creator || false);

                    if (isTeacher) {
                        return;
                    }

                    handlePresenceUpdated({
                        detail: {
                            sessionId: key,
                            profile: current.profile,
                            roles: current.roles
                        }
                    });
                }
            };

            const handleHubLeave = ({ key, meta }) => {
                handleUserLeft(key, meta?.profile?.displayName || "Unknown");
            };

            events.on("hub:join", handleHubJoin);
            events.on("hub:leave", handleHubLeave);

            scene.addEventListener("presence_updated", handlePresenceUpdated);

            return () => {
                events.off("hub:join", handleHubJoin);
                events.off("hub:leave", handleHubLeave);
                scene.removeEventListener("presence_updated", handlePresenceUpdated);
            };
        }

        scene.addEventListener("presence_updated", handlePresenceUpdated);
        return () => {
            scene.removeEventListener("presence_updated", handlePresenceUpdated);
        };
    }, []);

    // Clear all records
    const clearRecords = useCallback(() => {
        setRecords([]);
    }, []);

    // Calculate duration in minutes
    const getDuration = useCallback((joinTime, leaveTime) => {
        const end = leaveTime || Date.now();
        const durationMs = end - joinTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }, []);

    // Format time for display
    const formatTime = useCallback((timestamp) => {
        if (!timestamp) return "-";
        return new Date(timestamp).toLocaleTimeString();
    }, []);

    // Export attendance to CSV
    const exportToCSV = useCallback(() => {
        const roomName = APP.hub?.name || "Unknown Room";
        const exportDate = new Date().toLocaleDateString();
        const exportTime = new Date().toLocaleTimeString();

        // CSV header
        let csv = "Name,Session ID,Join Time,Leave Time,Duration,Status\n";

        // Add records
        recordsRef.current.forEach(record => {
            const joinTime = new Date(record.joinTime).toLocaleString();
            const leaveTime = record.leaveTime ? new Date(record.leaveTime).toLocaleString() : "Still in room";
            const duration = getDuration(record.joinTime, record.leaveTime);
            const status = record.isInRoom ? "In Room" : "Left";

            csv += `"${record.displayName}","${record.sessionId}","${joinTime}","${leaveTime}","${duration}","${status}"\n`;
        });

        // Create and download file
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `attendance_${roomName.replace(/\s+/g, "_")}_${exportDate.replace(/\//g, "-")}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [getDuration]);

    // Get current users in room
    const currentUsers = records.filter(r => r.isInRoom);

    return {
        records,
        clearRecords,
        exportToCSV,
        currentUsers,
        formatTime,
        getDuration
    };
}

export default useAttendance;

