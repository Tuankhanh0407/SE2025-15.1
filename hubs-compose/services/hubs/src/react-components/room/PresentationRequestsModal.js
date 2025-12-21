import React from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { Modal } from "../modal/Modal";
import { CloseButton } from "../input/CloseButton";
import { Button } from "../input/Button";
import { usePresentationRequests } from "./hooks/usePresentationRequests";
import styles from "./PresentationRequestsModal.scss";

/**
 * Modal for teachers to manage presentation requests.
 * Shows pending requests and allows approve/deny actions.
 */
export function PresentationRequestsModal({ onClose }) {
    const {
        requests,
        currentPresenterId,
        approveRequest,
        denyRequest,
        revokePresenter
    } = usePresentationRequests();

    // Get current presenter info
    const getCurrentPresenterName = () => {
        if (!currentPresenterId) return null;
        const presence = window.APP?.hubChannel?.presence?.state?.[currentPresenterId];
        return presence?.metas?.[0]?.profile?.displayName || "Unknown Presenter";
    };

    const presenterName = getCurrentPresenterName();

    return (
        <Modal
            title={<FormattedMessage id="presentation-requests.title" defaultMessage="Presentation Requests" />}
            beforeTitle={<CloseButton onClick={onClose} />}
            className={styles.modalWrapper}
        >
            <div className={styles.container}>
                {/* Instructions - Đưa lên trên cùng */}
                <div className={styles.instructions}>
                    <p>
                        <FormattedMessage
                            id="presentation-requests.instructions"
                            defaultMessage="Approve a student's request to let them share their screen on the board. Only one presenter at a time."
                        />
                    </p>
                </div>

                {/* Current Presenter Section */}
                {currentPresenterId && (
                    <div className={styles.currentPresenter}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.liveIndicator}></span>
                            <FormattedMessage
                                id="presentation-requests.current-presenter"
                                defaultMessage="Current Presenter"
                            />
                        </div>
                        <div className={styles.presenterCard}>
                            <span className={styles.presenterName}>{presenterName}</span>
                            <Button
                                preset="cancel"
                                sm
                                onClick={revokePresenter}
                            >
                                <FormattedMessage
                                    id="presentation-requests.stop"
                                    defaultMessage="Stop"
                                />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Pending Requests Section */}
                <div className={styles.requestsSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>🙋‍♂️</span>
                        <FormattedMessage
                            id="presentation-requests.pending"
                            defaultMessage="Pending Requests"
                        />
                        {requests.length > 0 && (
                            <span className={styles.badge}>{requests.length}</span>
                        )}
                    </div>

                    {requests.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>✋</span>
                            <p className={styles.emptyTitle}>
                                <FormattedMessage
                                    id="presentation-requests.no-requests"
                                    defaultMessage="No pending requests"
                                />
                            </p>
                            <p className={styles.emptySubtitle}>
                                <FormattedMessage
                                    id="presentation-requests.no-requests-hint"
                                    defaultMessage="Students can send requests using the Present button"
                                />
                            </p>
                        </div>
                    ) : (
                        <ul className={styles.requestList}>
                            {requests.map((request) => (
                                <li key={request.requesterId} className={styles.requestItem}>
                                    <div className={styles.requesterInfo}>
                                        <span className={styles.requesterName}>
                                            {request.requesterName}
                                        </span>
                                        <span className={styles.timestamp}>
                                            {new Date(request.ts).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className={styles.actions}>
                                        <Button
                                            preset="accept"
                                            sm
                                            onClick={() => approveRequest(request.requesterId, request.requesterName)}
                                        >
                                            <FormattedMessage
                                                id="presentation-requests.approve"
                                                defaultMessage="Accept"
                                            />
                                        </Button>
                                        <Button
                                            preset="cancel"
                                            sm
                                            onClick={() => denyRequest(request.requesterId)}
                                        >
                                            <FormattedMessage
                                                id="presentation-requests.deny"
                                                defaultMessage="Deny"
                                            />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
    );
}

PresentationRequestsModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default PresentationRequestsModal;
