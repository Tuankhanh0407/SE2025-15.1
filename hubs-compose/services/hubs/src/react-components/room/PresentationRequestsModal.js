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

    const formatRelativeTime = (ts) => {
        if (!ts) return "";
        const diffMs = Date.now() - ts;
        const diffMins = Math.max(0, Math.floor(diffMs / 60000));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minutes ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    };

    // Get current presenter info
    const getCurrentPresenterName = () => {
        if (!currentPresenterId) return null;
        const presence = window.APP?.hubChannel?.presence?.state?.[currentPresenterId];
        return presence?.metas?.[0]?.profile?.displayName || "Unknown Presenter";
    };

    const presenterName = getCurrentPresenterName();

    return (
        <Modal
            className={styles.modalWrapper}
        >
            <div className={styles.modalHeader}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    // Prevent accidental close if user clicks the header background
                    e.stopPropagation();
                }}
            >
                <CloseButton className={styles.closeButton} onClick={onClose} />
                <h5 className={styles.headerTitle}>
                    <FormattedMessage id="presentation-requests.title" defaultMessage="PRESENTATION REQUESTS" />
                </h5>
            </div>
            <div className={styles.container}>
                {/* Instructions - Đưa lên trên cùng */}
                <div className={styles.instructions}>
                    <p>
                        <FormattedMessage
                            id="presentation-requests.instructions"
                            defaultMessage="Accept or reject presentation requests from participants. Accepted participants will be able to share their screen."
                        />
                    </p>
                </div>

                {/* Current Presenter Section */}
                {currentPresenterId && (
                    <div className={styles.currentPresenter} role="button" tabIndex={0} onClick={revokePresenter}>
                        <div className={styles.presenterCard}>
                            <span className={styles.presenterName}>{presenterName}</span>
                            <span className={styles.liveIndicator}></span>
                        </div>
                    </div>
                )}

                {/* Pending Requests Section */}
                <div className={styles.requestsSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionIcon}>📋</span>
                        <FormattedMessage
                            id="presentation-requests.pending"
                            defaultMessage="PENDING REQUESTS"
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
                                            {formatRelativeTime(request.ts)}
                                        </span>
                                    </div>
                                    <div className={styles.divider} />
                                    <div className={styles.actions}>
                                        <Button
                                            preset="accept"
                                            sm
                                            className={styles.acceptBtn}
                                            onClick={() => approveRequest(request.requesterId, request.requesterName)}
                                        >
                                            <FormattedMessage
                                                id="presentation-requests.approve"
                                                defaultMessage="✓ Accept"
                                            />
                                        </Button>
                                        <Button
                                            preset="cancel"
                                            sm
                                            className={styles.rejectBtn}
                                            onClick={() => denyRequest(request.requesterId)}
                                        >
                                            <FormattedMessage
                                                id="presentation-requests.deny"
                                                defaultMessage="✕ Deny"
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
