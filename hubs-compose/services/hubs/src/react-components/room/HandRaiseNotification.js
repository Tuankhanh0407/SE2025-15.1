import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Button } from "../input/Button";
import { FormattedMessage } from "react-intl";
import { ReactComponent as MicrophoneIcon } from "../icons/Microphone.svg";
import { ReactComponent as MicrophoneMutedIcon } from "../icons/MicrophoneMuted.svg";
import { ReactComponent as HandRaisedIcon } from "../icons/HandRaised.svg";
import { ReactComponent as CloseIcon } from "../icons/Close.svg";
import { useLectureMode } from "./hooks/useLectureMode";
import { useTeacherRole } from "./hooks/useTeacherRole";
import styles from "./HandRaiseNotification.scss";

/**
 * Floating notification that appears for teachers when a student raises their hand.
 * Shows the student's name and buttons to grant/revoke speaking permission.
 * Stays visible after granting so teacher can revoke later.
 */
export function HandRaiseNotification() {
    const { isTeacher } = useTeacherRole();
    const { grantSpeakingPermission, revokeSpeakingPermission, hasSpeakingPermission } = useLectureMode();
    const [notifications, setNotifications] = useState([]);

    // Listen for hand raise events
    useEffect(() => {
        if (!isTeacher) return;

        const scene = AFRAME.scenes[0];
        if (!scene) return;

        const onPresenceUpdated = (event) => {
            const presence = event.detail;

            // Skip if it's ourselves
            if (presence.sessionId === NAF.clientId) return;

            // Check if hand was just raised
            if (presence.hand_raised) {
                const displayName = presence.profile?.displayName || "Student";
                const sessionId = presence.sessionId;

                // Add or update notification
                setNotifications(prev => {
                    const existingIndex = prev.findIndex(n => n.sessionId === sessionId);
                    if (existingIndex >= 0) {
                        // Update existing
                        const updated = [...prev];
                        updated[existingIndex] = {
                            ...updated[existingIndex],
                            displayName,
                            handRaised: true
                        };
                        return updated;
                    }

                    return [...prev, {
                        sessionId,
                        displayName,
                        handRaised: true,
                        timestamp: Date.now()
                    }];
                });
            } else {
                // Hand was lowered - update notification but don't remove if permission was granted
                setNotifications(prev =>
                    prev.map(n => {
                        if (n.sessionId === presence.sessionId) {
                            return { ...n, handRaised: false };
                        }
                        return n;
                    })
                );
            }
        };

        scene.addEventListener("presence_updated", onPresenceUpdated);

        return () => {
            scene.removeEventListener("presence_updated", onPresenceUpdated);
        };
    }, [isTeacher]);

    const handleGrant = useCallback((sessionId) => {
        grantSpeakingPermission(sessionId);
        // Update notification to show granted state (don't remove)
        setNotifications(prev => prev.map(n => {
            if (n.sessionId === sessionId) {
                return { ...n, handRaised: false };
            }
            return n;
        }));
    }, [grantSpeakingPermission]);

    const handleRevoke = useCallback((sessionId) => {
        revokeSpeakingPermission(sessionId);
        // Remove from notifications after revoking
        setNotifications(prev => prev.filter(n => n.sessionId !== sessionId));
    }, [revokeSpeakingPermission]);

    const handleDismiss = useCallback((sessionId) => {
        setNotifications(prev => prev.filter(n => n.sessionId !== sessionId));
    }, []);

    // Only show for teachers
    if (!isTeacher || notifications.length === 0) {
        return null;
    }

    return (
        <div className={styles.notificationContainer}>
            {notifications.map(notification => {
                const hasPermission = hasSpeakingPermission(notification.sessionId);

                return (
                    <div
                        key={notification.sessionId}
                        className={`${styles.notification} ${hasPermission ? styles.granted : ''}`}
                    >
                        <button
                            className={styles.dismissButton}
                            onClick={() => handleDismiss(notification.sessionId)}
                        >
                            <CloseIcon width={12} height={12} />
                        </button>

                        <div className={styles.header}>
                            <div className={`${styles.iconWrapper} ${hasPermission ? styles.iconGranted : ''}`}>
                                {hasPermission ? (
                                    <MicrophoneIcon width={24} height={24} />
                                ) : (
                                    <HandRaisedIcon width={24} height={24} />
                                )}
                            </div>
                            <div className={styles.info}>
                                <span className={styles.displayName}>{notification.displayName}</span>
                                <span className={styles.message}>
                                    {hasPermission ? (
                                        <FormattedMessage
                                            id="hand-raise-notification.can-speak"
                                            defaultMessage="can now speak"
                                        />
                                    ) : notification.handRaised ? (
                                        <FormattedMessage
                                            id="hand-raise-notification.message"
                                            defaultMessage="wants to speak"
                                        />
                                    ) : (
                                        <FormattedMessage
                                            id="hand-raise-notification.waiting"
                                            defaultMessage="waiting for permission"
                                        />
                                    )}
                                </span>
                            </div>
                        </div>

                        {hasPermission ? (
                            <Button
                                preset="cancel"
                                onClick={() => handleRevoke(notification.sessionId)}
                                className={styles.revokeButton}
                            >
                                <MicrophoneMutedIcon width={16} height={16} />
                                <FormattedMessage
                                    id="hand-raise-notification.revoke"
                                    defaultMessage="End Speaking"
                                />
                            </Button>
                        ) : (
                            <Button
                                preset="accept"
                                onClick={() => handleGrant(notification.sessionId)}
                                className={styles.grantButton}
                            >
                                <MicrophoneIcon width={16} height={16} />
                                <FormattedMessage
                                    id="hand-raise-notification.grant"
                                    defaultMessage="Allow to Speak"
                                />
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

HandRaiseNotification.propTypes = {};

export default HandRaiseNotification;
