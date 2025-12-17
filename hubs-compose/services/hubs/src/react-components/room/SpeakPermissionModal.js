import React from "react";
import PropTypes from "prop-types";
import { Modal } from "../modal/Modal";
import { CloseButton } from "../input/CloseButton";
import { Button } from "../input/Button";
import { Column } from "../layout/Column";
import { FormattedMessage } from "react-intl";
import { ReactComponent as MicrophoneIcon } from "../icons/Microphone.svg";
import { ReactComponent as MicrophoneMutedIcon } from "../icons/MicrophoneMuted.svg";
import { ReactComponent as HandRaisedIcon } from "../icons/HandRaised.svg";
import styles from "./SpeakPermissionModal.scss";

/**
 * Modal popup for teachers to grant/revoke speaking permission to a student.
 * Shows prominently when a student has their hand raised in lecture mode.
 */
export function SpeakPermissionModal({
    displayName,
    hasPermission,
    handRaised,
    onGrant,
    onRevoke,
    onClose
}) {
    return (
        <Modal
            title={
                <FormattedMessage
                    id="speak-permission-modal.title"
                    defaultMessage="Speaking Permission"
                />
            }
            beforeTitle={<CloseButton onClick={onClose} />}
        >
            <Column center padding className={styles.content}>
                <div className={styles.avatar}>
                    {handRaised ? (
                        <div className={styles.handRaisedBadge}>
                            <HandRaisedIcon width={48} height={48} />
                        </div>
                    ) : (
                        <div className={styles.userIcon}>👤</div>
                    )}
                </div>

                <h2 className={styles.displayName}>{displayName}</h2>

                {handRaised && (
                    <p className={styles.handRaisedMessage}>
                        <FormattedMessage
                            id="speak-permission-modal.hand-raised"
                            defaultMessage="✋ This student is requesting permission to speak"
                        />
                    </p>
                )}

                <div className={styles.statusSection}>
                    {hasPermission ? (
                        <div className={styles.statusGranted}>
                            <MicrophoneIcon width={24} height={24} />
                            <FormattedMessage
                                id="speak-permission-modal.status-granted"
                                defaultMessage="Can Speak"
                            />
                        </div>
                    ) : (
                        <div className={styles.statusRevoked}>
                            <MicrophoneMutedIcon width={24} height={24} />
                            <FormattedMessage
                                id="speak-permission-modal.status-muted"
                                defaultMessage="Muted"
                            />
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    {hasPermission ? (
                        <Button
                            preset="cancel"
                            onClick={onRevoke}
                            className={styles.actionButton}
                        >
                            <MicrophoneMutedIcon width={20} height={20} />
                            <FormattedMessage
                                id="speak-permission-modal.revoke-button"
                                defaultMessage="Revoke Speaking Permission"
                            />
                        </Button>
                    ) : (
                        <Button
                            preset="accept"
                            onClick={onGrant}
                            className={styles.actionButton}
                        >
                            <MicrophoneIcon width={20} height={20} />
                            <FormattedMessage
                                id="speak-permission-modal.grant-button"
                                defaultMessage="Grant Speaking Permission"
                            />
                        </Button>
                    )}
                </div>
            </Column>
        </Modal>
    );
}

SpeakPermissionModal.propTypes = {
    displayName: PropTypes.string.isRequired,
    hasPermission: PropTypes.bool,
    handRaised: PropTypes.bool,
    onGrant: PropTypes.func.isRequired,
    onRevoke: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default SpeakPermissionModal;
