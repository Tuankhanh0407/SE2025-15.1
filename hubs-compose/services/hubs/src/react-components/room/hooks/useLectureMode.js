import { useState, useEffect, useCallback, useRef } from "react";
import { useTeacherRole } from "./useTeacherRole";

/**
 * Hook to manage Lecture Mode state.
 * In Lecture Mode, students are muted by default and must request permission to speak.
 * Teachers can grant/revoke speaking permissions.
 * 
 * @returns {Object} Lecture mode state and controls
 */
export function useLectureMode() {
    const { isTeacher } = useTeacherRole();
    const [lectureModeEnabled, setLectureModeEnabled] = useState(false);
    const [speakingPermissions, setSpeakingPermissions] = useState(new Set());
    const speakingPermissionsRef = useRef(speakingPermissions);

    // Keep ref in sync
    useEffect(() => {
        speakingPermissionsRef.current = speakingPermissions;
    }, [speakingPermissions]);

    // Listen for lecture mode messages
    useEffect(() => {
        const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
        if (!scene) return;

        const messageDispatch = APP.messageDispatch;
        if (!messageDispatch) return;

        const onMessage = (event) => {
            const message = event.detail;

            // Handle lecture mode toggle
            if (message.type === "lecture_mode") {
                setLectureModeEnabled(message.body?.enabled || false);
                // Clear permissions when lecture mode is disabled
                if (!message.body?.enabled) {
                    setSpeakingPermissions(new Set());
                }
            }

            // Handle speaking permission granted
            if (message.type === "speak_granted") {
                const targetSessionId = message.body?.targetSessionId;
                if (targetSessionId) {
                    setSpeakingPermissions(prev => {
                        const newSet = new Set(prev);
                        newSet.add(targetSessionId);
                        return newSet;
                    });

                    // If we are the target, lower our hand automatically
                    const currentClientId = typeof NAF !== 'undefined' ? NAF.clientId : null;
                    if (targetSessionId === currentClientId) {
                        window.APP.hubChannel?.lowerHand();

                        // Show notification
                        scene?.emit("chat_notification", {
                            message: `🎤 You have been granted permission to speak!`
                        });
                    }
                }
            }

            // Handle speaking permission revoked
            if (message.type === "speak_revoked") {
                const targetSessionId = message.body?.targetSessionId;
                if (targetSessionId) {
                    setSpeakingPermissions(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(targetSessionId);
                        return newSet;
                    });

                    // If we are the target, show notification
                    const currentClientId = typeof NAF !== 'undefined' ? NAF.clientId : null;
                    if (targetSessionId === currentClientId) {
                        scene?.emit("chat_notification", {
                            message: `🔇 Your speaking permission has been revoked.`
                        });
                    }
                }
            }
        };

        messageDispatch.addEventListener("message", onMessage);

        return () => {
            messageDispatch.removeEventListener("message", onMessage);
        };
    }, []);

    // Check if current user can speak
    const nafClientId = typeof NAF !== 'undefined' ? NAF.clientId : null;
    const canSpeak = isTeacher || !lectureModeEnabled || (nafClientId && speakingPermissions.has(nafClientId));

    // Check if a specific user can speak
    const userCanSpeak = useCallback((sessionId) => {
        // Check if user is a teacher
        const presence = APP.hubChannel?.presence?.state?.[sessionId];
        const meta = presence?.metas?.[0];
        const isUserTeacher = meta?.profile?.isTeacher || meta?.roles?.owner || meta?.roles?.creator;

        if (isUserTeacher) return true;
        if (!lectureModeEnabled) return true;
        return speakingPermissionsRef.current.has(sessionId);
    }, [lectureModeEnabled]);

    // Toggle lecture mode (teacher only)
    const toggleLectureMode = useCallback(() => {
        if (!isTeacher) return;

        const newEnabled = !lectureModeEnabled;
        setLectureModeEnabled(newEnabled);

        // Broadcast to all users
        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage(
                { enabled: newEnabled },
                "lecture_mode"
            );
        }

        // Clear permissions when disabling
        if (!newEnabled) {
            setSpeakingPermissions(new Set());
        }
    }, [isTeacher, lectureModeEnabled]);

    // Enable lecture mode (teacher only)
    const enableLectureMode = useCallback(() => {
        if (!isTeacher || lectureModeEnabled) return;
        toggleLectureMode();
    }, [isTeacher, lectureModeEnabled, toggleLectureMode]);

    // Disable lecture mode (teacher only)
    const disableLectureMode = useCallback(() => {
        if (!isTeacher || !lectureModeEnabled) return;
        toggleLectureMode();
    }, [isTeacher, lectureModeEnabled, toggleLectureMode]);

    // Grant speaking permission to a student (teacher only)
    const grantSpeakingPermission = useCallback((sessionId) => {
        if (!isTeacher) return;

        setSpeakingPermissions(prev => {
            const newSet = new Set(prev);
            newSet.add(sessionId);
            return newSet;
        });

        // Broadcast to all users
        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage(
                { targetSessionId: sessionId },
                "speak_granted"
            );
        }
    }, [isTeacher]);

    // Revoke speaking permission from a student (teacher only)
    const revokeSpeakingPermission = useCallback((sessionId) => {
        if (!isTeacher) return;

        setSpeakingPermissions(prev => {
            const newSet = new Set(prev);
            newSet.delete(sessionId);
            return newSet;
        });

        // Broadcast to all users
        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage(
                { targetSessionId: sessionId },
                "speak_revoked"
            );
        }
    }, [isTeacher]);

    // Check if a user has speaking permission
    const hasSpeakingPermission = useCallback((sessionId) => {
        return speakingPermissions.has(sessionId);
    }, [speakingPermissions]);

    return {
        // State
        lectureModeEnabled,
        canSpeak,
        speakingPermissions,

        // Teacher controls
        toggleLectureMode,
        enableLectureMode,
        disableLectureMode,
        grantSpeakingPermission,
        revokeSpeakingPermission,

        // Utilities
        hasSpeakingPermission,
        userCanSpeak,
        isTeacher
    };
}

export default useLectureMode;
