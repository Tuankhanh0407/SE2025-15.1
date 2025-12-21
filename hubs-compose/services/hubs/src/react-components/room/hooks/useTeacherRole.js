import { useState, useEffect, useCallback } from "react";

/**
 * Hook to manage teacher/student roles.
 * - Room owners/creators are automatically teachers
 * - Role is stored in profile and broadcast via presence
 * - Listens for teacher_role messages to update role
 * 
 * @param {string} clientId - Optional client ID to check (defaults to current user)
 * @returns {Object} { isTeacher, isStudent, setAsTeacher, setAsStudent }
 */
export function useTeacherRole(clientId = null) {
    const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
    const nafClientId = typeof NAF !== 'undefined' ? NAF.clientId : null;
    const checkClientId = clientId || nafClientId;
    const isCurrentUser = !clientId || clientId === nafClientId;

    // Check if user is owner (owners are always teachers)
    const getIsOwner = useCallback((cid) => {
        if (typeof APP === 'undefined') return false;
        const presence = APP.hubChannel?.presence?.state?.[cid];
        return presence?.metas?.[0]?.roles?.owner || presence?.metas?.[0]?.roles?.creator;
    }, []);

    // Get isTeacher from profile or presence
    const getIsTeacher = useCallback((cid) => {
        if (typeof APP === 'undefined') return false;
        if (isCurrentUser) {
            // Check local store first
            const profileTeacher = APP.store?.state?.profile?.isTeacher;
            if (profileTeacher !== undefined) return profileTeacher;
            // Fall back to owner status
            return getIsOwner(cid);
        } else {
            // Check other user's presence
            const presence = APP.hubChannel?.presence?.state?.[cid];
            const profileFromPresence = presence?.metas?.[0]?.profile?.isTeacher;
            if (profileFromPresence !== undefined) return profileFromPresence;
            return getIsOwner(cid);
        }
    }, [isCurrentUser, getIsOwner]);

    const [isTeacher, setIsTeacherState] = useState(() => getIsTeacher(checkClientId));
    const isStudent = !isTeacher;

    // Listen for presence updates
    useEffect(() => {
        const onPresenceUpdated = ({ detail: presence }) => {
            if (presence.sessionId !== checkClientId) return;

            // Check profile.isTeacher from presence
            const teacherFromProfile = presence.profile?.isTeacher;
            const teacherFromRoles = presence.roles?.owner || presence.roles?.creator;

            setIsTeacherState(teacherFromProfile !== undefined ? teacherFromProfile : teacherFromRoles);
        };

        scene?.addEventListener("presence_updated", onPresenceUpdated);

        return () => {
            scene?.removeEventListener("presence_updated", onPresenceUpdated);
        };
    }, [scene, checkClientId]);

    // Listen for teacher_role messages (only for current user)
    useEffect(() => {
        if (!isCurrentUser) return;

        if (typeof APP === 'undefined') return;
        const messageDispatch = APP.messageDispatch;
        if (!messageDispatch) return;

        const onMessage = (event) => {
            const message = event.detail;

            // Check if this is a teacher_role message for us
            const currentClientId = typeof NAF !== 'undefined' ? NAF.clientId : null;
            if (message.type === "teacher_role" && message.body?.targetSessionId === currentClientId) {
                const newIsTeacher = message.body.isTeacher;
                const fromName = message.body.fromName || "Someone";

                // Update our profile
                if (typeof APP !== 'undefined' && APP.store) {
                    APP.store.update({
                        profile: {
                            ...APP.store.state.profile,
                            isTeacher: newIsTeacher
                        }
                    });
                }

                setIsTeacherState(newIsTeacher);

                // Show notification in scene
                if (newIsTeacher) {
                    console.log(`🎓 ${fromName} has granted you Teacher privileges!`);
                    // Optionally show a toast or notification
                    scene?.emit("chat_notification", {
                        message: `🎓 ${fromName} has granted you Teacher privileges!`
                    });
                } else {
                    console.log(`📚 ${fromName} has set you as Student.`);
                    scene?.emit("chat_notification", {
                        message: `📚 ${fromName} has set you as Student.`
                    });
                }
            }
        };

        messageDispatch.addEventListener("message", onMessage);

        return () => {
            messageDispatch.removeEventListener("message", onMessage);
        };
    }, [isCurrentUser, scene]);

    // Set current user as teacher
    const setAsTeacher = useCallback(() => {
        if (!isCurrentUser) return;

        if (typeof APP !== 'undefined' && APP.store) {
            APP.store.update({
                profile: {
                    ...APP.store.state.profile,
                    isTeacher: true
                }
            });
        }
        setIsTeacherState(true);
    }, [isCurrentUser]);

    // Set current user as student
    const setAsStudent = useCallback(() => {
        if (!isCurrentUser) return;

        if (typeof APP !== 'undefined' && APP.store) {
            APP.store.update({
                profile: {
                    ...APP.store.state.profile,
                    isTeacher: false
                }
            });
        }
        setIsTeacherState(false);
    }, [isCurrentUser]);

    return {
        isTeacher,
        isStudent,
        setAsTeacher,
        setAsStudent,
        isOwner: getIsOwner(checkClientId)
    };
}

/**
 * Check if a specific user is a teacher (non-hook version for use outside components)
 */
export function isUserTeacher(clientId) {
    if (typeof APP === 'undefined') return false;
    const presence = APP.hubChannel?.presence?.state?.[clientId];
    if (!presence) return false;

    const meta = presence.metas?.[0];
    if (!meta) return false;

    // Check profile first
    if (meta.profile?.isTeacher !== undefined) {
        return meta.profile.isTeacher;
    }

    // Fall back to owner/creator
    return meta.roles?.owner || meta.roles?.creator || false;
}

export default useTeacherRole;
