import React, { useRef, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { CloseButton } from "../input/CloseButton";
import { IconButton } from "../input/IconButton";
import { FormattedMessage } from "react-intl";
import styles from "./ProjectionScreen.scss";
import { ReactComponent as PlayIcon } from "../icons/Play.svg";
import { ReactComponent as PauseIcon } from "../icons/Pause.svg";
import { ReactComponent as ShareIcon } from "../icons/Share.svg";
import { useTeacherRole } from "./hooks/useTeacherRole";

/**
 * ProjectionScreen component for classroom presentations.
 * Teachers can share their screen, and students can view it.
 */
export function ProjectionScreen({ onClose, visible }) {
    const videoRef = useRef(null);
    const [isSharing, setIsSharing] = useState(false);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);

    // Check if user is a teacher
    const { isTeacher } = useTeacherRole();

    // Cleanup stream when component unmounts or becomes invisible
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Cleanup when visibility changes
    useEffect(() => {
        if (!visible && stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsSharing(false);
        }
    }, [visible, stream]);

    // Start screen sharing
    const startScreenShare = useCallback(async () => {
        try {
            setError(null);
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    displaySurface: "monitor"
                },
                audio: true
            });

            // Handle when user stops sharing via browser UI
            displayStream.getVideoTracks()[0].onended = () => {
                setIsSharing(false);
                setStream(null);
            };

            setStream(displayStream);
            setIsSharing(true);

            if (videoRef.current) {
                videoRef.current.srcObject = displayStream;
            }

            // Share to room (notify other participants)
            if (window.APP?.hubChannel) {
                window.APP.hubChannel.sendMessage(
                    { body: "📽️ Teacher started screen projection" },
                    "chat"
                );
            }
        } catch (err) {
            console.error("Error starting screen share:", err);
            setError(err.message || "Failed to start screen sharing");
            setIsSharing(false);
        }
    }, []);

    // Stop screen sharing
    const stopScreenShare = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsSharing(false);

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Notify room
        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage(
                { body: "📽️ Teacher stopped screen projection" },
                "chat"
            );
        }
    }, [stream]);

    // Share screenshot to chat
    const shareScreenshot = useCallback(() => {
        if (!videoRef.current || !isSharing) return;

        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/png");

        if (window.APP?.hubChannel) {
            window.APP.hubChannel.sendMessage({ src: dataUrl }, "image");
        }
    }, [isSharing]);

    if (!visible) return null;

    // Students view - show projection if active, or waiting message
    if (!isTeacher) {
        return (
            <div className={styles.projectionScreen}>
                <div className={styles.header}>
                    <CloseButton onClick={onClose} />
                    <h2 className={styles.title}>
                        <FormattedMessage id="projection-screen.title" defaultMessage="Screen Projection" />
                    </h2>
                </div>
                <div className={styles.studentView}>
                    <span className={styles.studentIcon}>📽️</span>
                    <h3>
                        <FormattedMessage id="projection-screen.student-title" defaultMessage="Presentation View" />
                    </h3>
                    <p>
                        <FormattedMessage
                            id="projection-screen.student-desc"
                            defaultMessage="When your teacher starts a screen projection, it will appear here. Stay tuned!"
                        />
                    </p>
                </div>
            </div>
        );
    }

    // Teacher view - controls for screen sharing
    return (
        <div className={styles.projectionScreen}>
            <div className={styles.header}>
                <CloseButton onClick={onClose} />
                <h2 className={styles.title}>
                    <FormattedMessage id="projection-screen.title" defaultMessage="Screen Projection" />
                </h2>
                <div className={styles.actions}>
                    {isSharing && (
                        <IconButton
                            onClick={shareScreenshot}
                            title="Share Screenshot"
                            className={styles.screenshotButton}
                        >
                            <ShareIcon />
                        </IconButton>
                    )}
                </div>
            </div>

            {error && (
                <div className={styles.errorBanner}>
                    <FormattedMessage
                        id="projection-screen.error"
                        defaultMessage="Error: {error}"
                        values={{ error }}
                    />
                </div>
            )}

            {isSharing && (
                <div className={styles.sharingBanner}>
                    <span className={styles.liveIndicator}></span>
                    <FormattedMessage id="projection-screen.sharing" defaultMessage="Screen is being projected to students" />
                </div>
            )}

            <div className={styles.controls}>
                {!isSharing ? (
                    <button className={styles.startButton} onClick={startScreenShare}>
                        <PlayIcon />
                        <FormattedMessage id="projection-screen.start" defaultMessage="Start Screen Projection" />
                    </button>
                ) : (
                    <button className={styles.stopButton} onClick={stopScreenShare}>
                        <PauseIcon />
                        <FormattedMessage id="projection-screen.stop" defaultMessage="Stop Projection" />
                    </button>
                )}
            </div>

            <div className={styles.videoContainer}>
                {isSharing ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={styles.video}
                    />
                ) : (
                    <div className={styles.placeholder}>
                        <span className={styles.placeholderIcon}>🖥️</span>
                        <p>
                            <FormattedMessage
                                id="projection-screen.placeholder"
                                defaultMessage="Click 'Start Screen Projection' to share your screen with students"
                            />
                        </p>
                    </div>
                )}
            </div>

            <div className={styles.instructions}>
                <h4>
                    <FormattedMessage id="projection-screen.instructions-title" defaultMessage="How it works:" />
                </h4>
                <ul>
                    <li>
                        <FormattedMessage
                            id="projection-screen.instruction-1"
                            defaultMessage="Click 'Start Screen Projection' to begin sharing"
                        />
                    </li>
                    <li>
                        <FormattedMessage
                            id="projection-screen.instruction-2"
                            defaultMessage="Students in the room will see your screen"
                        />
                    </li>
                    <li>
                        <FormattedMessage
                            id="projection-screen.instruction-3"
                            defaultMessage="Use the share button to capture screenshots for chat"
                        />
                    </li>
                </ul>
            </div>
        </div>
    );
}

ProjectionScreen.propTypes = {
    onClose: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired
};

export default ProjectionScreen;
