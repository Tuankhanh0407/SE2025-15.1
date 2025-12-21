import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { useLectureMode } from "./hooks/useLectureMode";
import { Button } from "../input/Button";
import styles from "./ShareToStudentsButton.scss";
import { CAMERA_MODE_INSPECT } from "../../systems/camera-system";

/**
 * A floating button that appears when a teacher is inspecting an object in lecture mode.
 * Allows teachers to share the currently inspected object with all students.
 */
export function ShareToStudentsButton({ scene }) {
    const {
        isTeacher,
        lectureModeEnabled,
        shareFocusToStudents,
        releaseFocusShare,
        sharedFocusTarget
    } = useLectureMode();

    const [isInspecting, setIsInspecting] = useState(false);

    // Listen for inspect events and camera mode changes
    useEffect(() => {
        if (!scene) return;

        const checkInspectState = () => {
            const cameraSystem = scene.systems?.["hubs-systems"]?.cameraSystem;
            if (cameraSystem && cameraSystem.mode === CAMERA_MODE_INSPECT && cameraSystem.inspectable) {
                setIsInspecting(true);
            } else {
                setIsInspecting(false);
            }
        };

        scene.addEventListener("inspect-target-changed", checkInspectState);
        const interval = setInterval(checkInspectState, 500);
        checkInspectState();

        return () => {
            scene.removeEventListener("inspect-target-changed", checkInspectState);
            clearInterval(interval);
        };
    }, [scene]);

    // Handle share button click - shares network ID of the object
    const handleShare = useCallback(() => {
        if (!scene) return;

        const cameraSystem = scene.systems?.["hubs-systems"]?.cameraSystem;
        if (!cameraSystem || !cameraSystem.inspectable) return;

        const inspectable = cameraSystem.inspectable;
        let objectName = "shared content";
        let networkId = null;

        // Try to get the network ID from the A-Frame element
        if (inspectable?.el) {
            // Get network ID from NAF component
            const nafComp = inspectable.el.components?.["networked"];
            if (nafComp) {
                networkId = nafComp.data?.networkId || nafComp.networkId;
            }

            // Try to get name
            const mediaInfo = inspectable.el.getAttribute?.("media-loader");
            if (mediaInfo?.src) {
                try {
                    const url = new URL(mediaInfo.src);
                    objectName = url.pathname.split('/').pop() || objectName;
                } catch (e) { }
            }
        }

        // If no network ID found, try to find it in parent elements
        if (!networkId && inspectable?.el) {
            let el = inspectable.el;
            while (el && !networkId) {
                const nafComp = el.components?.["networked"];
                if (nafComp) {
                    networkId = nafComp.data?.networkId || nafComp.networkId;
                }
                el = el.parentElement;
            }
        }

        if (networkId) {
            shareFocusToStudents(networkId, objectName);
        } else {
            console.warn("[ShareToStudentsButton] Could not find network ID for inspected object");
            // Fallback to position-based sharing
            const pivot = cameraSystem.pivot;
            if (pivot) {
                const pos = pivot.getWorldPosition ? pivot.getWorldPosition(new THREE.Vector3()) : pivot.position;
                shareFocusToStudents({ position: { x: pos.x, y: pos.y, z: pos.z } }, objectName);
            }
        }
    }, [scene, shareFocusToStudents]);

    // Handle release button click
    const handleRelease = useCallback(() => {
        releaseFocusShare();
    }, [releaseFocusShare]);

    // Only show for teachers in lecture mode
    if (!isTeacher || !lectureModeEnabled) {
        return null;
    }

    // Show release button if currently sharing
    if (sharedFocusTarget) {
        return (
            <div className={styles.shareToStudentsContainer}>
                <div className={styles.sharingIndicator}>
                    <span className={styles.sharingDot}></span>
                    <FormattedMessage
                        id="share-to-students.sharing"
                        defaultMessage="Sharing with students"
                    />
                </div>
                <Button
                    preset="cancel"
                    onClick={handleRelease}
                    className={styles.releaseButton}
                >
                    <FormattedMessage
                        id="share-to-students.stop"
                        defaultMessage="Stop Sharing"
                    />
                </Button>
            </div>
        );
    }

    // Show share button if inspecting
    if (isInspecting) {
        return (
            <div className={styles.shareToStudentsContainer}>
                <Button
                    preset="accept"
                    onClick={handleShare}
                    className={styles.shareButton}
                >
                    <FormattedMessage
                        id="share-to-students.share"
                        defaultMessage="Share with Students"
                    />
                </Button>
            </div>
        );
    }

    return null;
}

ShareToStudentsButton.propTypes = {
    scene: PropTypes.object
};

export default ShareToStudentsButton;
