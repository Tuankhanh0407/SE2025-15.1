import React, { useState, useEffect, useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { useTeacherRole } from "./hooks/useTeacherRole";
import { Button } from "../input/Button";
import styles from "./StudentFocusLock.scss";

/**
 * Displays a banner when the teacher is sharing content.
 * For students, shows a "View" button that they can click
 * to inspect the same object the teacher is sharing.
 */
export function StudentFocusLock() {
    const { isTeacher } = useTeacherRole();
    const [sharedNetworkId, setSharedNetworkId] = useState(null);
    const [isSharing, setIsSharing] = useState(false);
    const [objectName, setObjectName] = useState("shared content");

    // Listen for focus share messages
    useEffect(() => {
        const scene = AFRAME.scenes[0];
        if (!scene) return;

        const messageDispatch = APP.messageDispatch;
        if (!messageDispatch) return;

        const onMessage = (event) => {
            const message = event.detail;

            if (message.type === "focus_share") {
                const networkId = message.body?.networkId;
                const name = message.body?.objectName || "shared content";
                if (networkId) {
                    setSharedNetworkId(networkId);
                    setObjectName(name);
                    setIsSharing(true);
                }
            }

            if (message.type === "focus_release") {
                setSharedNetworkId(null);
                setIsSharing(false);
            }
        };

        messageDispatch.addEventListener("message", onMessage);

        return () => {
            messageDispatch.removeEventListener("message", onMessage);
        };
    }, []);

    // Handle View button click - find the object by network ID and inspect it
    const handleReturnToView = useCallback(() => {
        if (!sharedNetworkId) return;

        try {
            const scene = AFRAME.scenes[0];
            if (!scene) return;

            // Find the entity by network ID using NAF
            const entity = NAF.entities.getEntity(sharedNetworkId);
            if (entity && entity.object3D) {
                // Use camera system to inspect the object
                const cameraSystem = scene.systems?.["hubs-systems"]?.cameraSystem;
                if (cameraSystem) {
                    cameraSystem.inspect(entity.object3D, 1.5, true);
                }
            } else {
                console.warn("[StudentFocusLock] Could not find entity with network ID:", sharedNetworkId);
                scene.emit("chat_notification", {
                    message: "⚠️ Could not find the shared object"
                });
            }
        } catch (err) {
            console.error("[StudentFocusLock] Error inspecting shared object:", err);
        }
    }, [sharedNetworkId]);

    // Don't show for teachers or when not sharing
    if (isTeacher || !isSharing) {
        return null;
    }

    return (
        <div className={styles.focusLockOverlay}>
            <div className={styles.focusLockBadge}>
                <span className={styles.eyeIcon}>👁️</span>
                <span>Teacher is sharing: {objectName}</span>
                <Button
                    preset="basic"
                    onClick={handleReturnToView}
                    className={styles.returnButton}
                >
                    <FormattedMessage
                        id="student-focus-lock.view"
                        defaultMessage="View"
                    />
                </Button>
            </div>
        </div>
    );
}

export default StudentFocusLock;
