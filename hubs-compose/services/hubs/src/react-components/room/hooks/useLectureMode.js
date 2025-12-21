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

    // Focus sharing state
    const [sharedFocusTarget, setSharedFocusTarget] = useState(null); // Entity ID of shared object
    const [isFocusLocked, setIsFocusLocked] = useState(false); // Whether student view is locked

    // Refs to access current values inside message handlers
    const lectureModeEnabledRef = useRef(lectureModeEnabled);
    const sharedFocusTargetRef = useRef(sharedFocusTarget);

    // Keep refs in sync
    useEffect(() => {
        speakingPermissionsRef.current = speakingPermissions;
    }, [speakingPermissions]);

    useEffect(() => {
        lectureModeEnabledRef.current = lectureModeEnabled;
    }, [lectureModeEnabled]);

    useEffect(() => {
        sharedFocusTargetRef.current = sharedFocusTarget;
    }, [sharedFocusTarget]);

    // Sync focus lock state to global so camera system can check it
    useEffect(() => {
        if (!window.APP) window.APP = {};
        window.APP.isFocusLocked = isFocusLocked;
    }, [isFocusLocked]);

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

            // Handle focus share (teacher shares an object with students)
            if (message.type === "focus_share") {
                const networkId = message.body?.networkId;
                const objectName = message.body?.objectName || "shared content";

                if (networkId) {
                    setSharedFocusTarget(networkId);

                    // Only show notification for non-teachers (students)
                    const presence = APP.hubChannel?.presence?.state?.[NAF.clientId];
                    const meta = presence?.metas?.[0];
                    const isCurrentUserTeacher = meta?.profile?.isTeacher || meta?.roles?.owner || meta?.roles?.creator;

                    if (!isCurrentUserTeacher) {
                        setIsFocusLocked(true);

                        // Show notification
                        scene?.emit("chat_notification", {
                            message: `👁️ Teacher is sharing: ${objectName}`
                        });
                    }
                }
            }

            // Handle focus release (teacher stops sharing)
            if (message.type === "focus_release") {
                setSharedFocusTarget(null);
                setIsFocusLocked(false);

                // Show notification for non-teachers
                const presence = APP.hubChannel?.presence?.state?.[NAF.clientId];
                const meta = presence?.metas?.[0];
                const isCurrentUserTeacher = meta?.profile?.isTeacher || meta?.roles?.owner || meta?.roles?.creator;

                if (!isCurrentUserTeacher) {
                    // Show notification
                    scene?.emit("chat_notification", {
                        message: `👁️ Teacher stopped sharing`
                    });
                }
            }

            // Handle state request from late joiners (teacher responds with current state)
            if (message.type === "lecture_state_request") {
                const presence = APP.hubChannel?.presence?.state?.[NAF.clientId];
                const meta = presence?.metas?.[0];
                const isCurrentUserTeacher = meta?.profile?.isTeacher || meta?.roles?.owner || meta?.roles?.creator;

                if (isCurrentUserTeacher) {
                    // Teacher broadcasts current state using refs for current values
                    setTimeout(() => {
                        if (window.APP?.hubChannel) {
                            window.APP.hubChannel.sendMessage(
                                {
                                    enabled: lectureModeEnabledRef.current,
                                    sharedNetworkId: sharedFocusTargetRef.current
                                },
                                "lecture_state_response"
                            );
                        }
                    }, 500); // Small delay to ensure new user is ready
                }
            }

            // Handle state response (late joiner receives current state)
            if (message.type === "lecture_state_response") {
                const { enabled, sharedNetworkId } = message.body || {};

                if (enabled !== undefined) {
                    setLectureModeEnabled(enabled);
                }

                if (sharedNetworkId) {
                    setSharedFocusTarget(sharedNetworkId);

                    // Check if we are a student
                    const presence = APP.hubChannel?.presence?.state?.[NAF.clientId];
                    const meta = presence?.metas?.[0];
                    const isCurrentUserTeacher = meta?.profile?.isTeacher || meta?.roles?.owner || meta?.roles?.creator;

                    if (!isCurrentUserTeacher) {
                        setIsFocusLocked(true);
                    }
                }
            }
        };

        messageDispatch.addEventListener("message", onMessage);

        // Request current state when joining (for late joiners)
        setTimeout(() => {
            if (window.APP?.hubChannel) {
                window.APP.hubChannel.sendMessage({}, "lecture_state_request");
            }
        }, 500); // Wait 500ms after joining to request state (faster muting)

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

    // Share focus to students (teacher only) - shares object network ID so students can inspect same object
    const shareFocusToStudents = useCallback((networkId, objectName = "shared content") => {
        if (!isTeacher || !lectureModeEnabled) return;

        setSharedFocusTarget(networkId);

        // Broadcast to all users
        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage(
                { networkId, objectName },
                "focus_share"
            );
        }

        // Show notification to teacher
        const scene = AFRAME.scenes[0];
        scene?.emit("chat_notification", {
            message: `👁️ Sharing "${objectName}" with students`
        });
    }, [isTeacher, lectureModeEnabled]);

    // Release shared focus (teacher only) - allows students to look around freely
    const releaseFocusShare = useCallback(() => {
        if (!isTeacher) return;

        setSharedFocusTarget(null);

        // Broadcast to all users
        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage(
                {},
                "focus_release"
            );
        }

        // Show notification to teacher
        const scene = AFRAME.scenes[0];
        scene?.emit("chat_notification", {
            message: `👁️ Stopped sharing with students`
        });
    }, [isTeacher]);

    return {
        // State
        lectureModeEnabled,
        canSpeak,
        speakingPermissions,
        sharedFocusTarget,
        isFocusLocked,

        // Teacher controls
        toggleLectureMode,
        enableLectureMode,
        disableLectureMode,
        grantSpeakingPermission,
        revokeSpeakingPermission,
        shareFocusToStudents,
        releaseFocusShare,

        // Utilities
        hasSpeakingPermission,
        userCanSpeak,
        isTeacher
    };
}

export default useLectureMode;
