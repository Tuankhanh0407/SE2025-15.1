import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useTeacherRole } from "./useTeacherRole";

const getIsCurrentUserTeacher = () => {
    const profileTeacher = window.APP?.store?.state?.profile?.isTeacher;
    if (profileTeacher !== undefined) return !!profileTeacher;

    const myId = window.NAF?.clientId;
    const presence = myId ? window.APP?.hubChannel?.presence?.state?.[myId] : null;
    const roles = presence?.metas?.[0]?.roles;
    return !!(roles?.owner || roles?.creator);
};

let _state = {
    requests: [],
    currentPresenterId: null,
    isActuallyProjecting: false
};

const _listeners = new Set();
let _initialized = false;
let _initializing = false;
let _initIntervalId = null;

const _emitChange = () => {
    for (const l of _listeners) l();
};

const _setState = updater => {
    const next = typeof updater === "function" ? updater(_state) : updater;
    _state = { ..._state, ...next };
    _emitChange();
};

const _subscribe = listener => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
};

const _getSnapshot = () => _state;

const _ensureInitialized = () => {
    if (_initialized || _initializing) return;
    _initializing = true;
    const messageDispatch = window.APP?.messageDispatch;
    if (!messageDispatch) {
        _initializing = false;
        return;
    }

    const onMessage = event => {
        const msg = event.detail;
        if (!msg) return;

        if (msg.type === "present_request") {
            const { requesterId, requesterName } = msg.body || {};
            if (!requesterId) return;

            console.log("[PresentRequests] Request received:", requesterName);

            _setState(prev => {
                if (prev.requests.some(r => r.requesterId === requesterId)) return prev;
                return {
                    requests: [
                        ...prev.requests,
                        {
                            requesterId,
                            requesterName: requesterName || "Student",
                            ts: Date.now()
                        }
                    ]
                };
            });
        }

        if (msg.type === "present_approved") {
            const { presenterId, presenterName } = msg.body || {};
            if (!presenterId) return;

            console.log("[PresentRequests] Presenter approved:", presenterName);

            _setState(prev => ({
                currentPresenterId: presenterId,
                isActuallyProjecting: false,
                requests: prev.requests.filter(r => r.requesterId !== presenterId)
            }));
        }

        if (msg.type === "present_started") {
            const { presenterId } = msg.body || {};
            console.log("[PresentRequests] Presentation actually started by:", presenterId);
            _setState({ isActuallyProjecting: true });

            if (getIsCurrentUserTeacher() && presenterId) {
                const scene = typeof AFRAME !== "undefined" && AFRAME.scenes ? AFRAME.scenes[0] : null;
                scene?.emit("start_board_projection", { presenterId });
                console.log("[PresentRequests] Teacher spawning projection for student:", presenterId);
            }
        }

        if (msg.type === "present_ended") {
            const { presenterId } = msg.body || {};
            console.log("[PresentRequests] Presentation ended:", presenterId);

            _setState(prev => {
                if (!presenterId || presenterId === prev.currentPresenterId) {
                    return { currentPresenterId: null, isActuallyProjecting: false };
                }
                return prev;
            });

            if (getIsCurrentUserTeacher()) {
                const scene = typeof AFRAME !== "undefined" && AFRAME.scenes ? AFRAME.scenes[0] : null;
                scene?.emit("stop_board_projection");
            }
        }

        if (msg.type === "present_revoked") {
            const { presenterId } = msg.body || {};
            console.log("[PresentRequests] Presenter revoked:", presenterId);

            const myId = window.NAF?.clientId;
            if (myId === presenterId || myId === _state.currentPresenterId) {
                const scene = typeof AFRAME !== "undefined" && AFRAME.scenes ? AFRAME.scenes[0] : null;
                scene?.emit("stop_board_projection");
            }

            if (getIsCurrentUserTeacher()) {
                const scene = typeof AFRAME !== "undefined" && AFRAME.scenes ? AFRAME.scenes[0] : null;
                scene?.emit("stop_board_projection");
            }

            _setState(prev => {
                if (!presenterId || presenterId === prev.currentPresenterId) {
                    return { currentPresenterId: null, isActuallyProjecting: false };
                }
                return prev;
            });
        }

        if (msg.type === "present_denied") {
            const { requesterId } = msg.body || {};
            if (!requesterId) return;

            console.log("[PresentRequests] Request denied:", requesterId);
            _setState(prev => ({
                requests: prev.requests.filter(r => r.requesterId !== requesterId)
            }));
        }
    };

    messageDispatch.addEventListener("message", onMessage);
    _initialized = true;
    _initializing = false;

    if (_initIntervalId) {
        clearInterval(_initIntervalId);
        _initIntervalId = null;
    }
};

/**
 * Hook to manage presentation requests in the classroom.
 * 
 * Uses hubChannel messaging (like useLectureMode) to sync state across clients.
 * - Student sends request via "present_request"
 * - Teacher approves via "present_approved"
 * - Messages are received via APP.messageDispatch
 * 
 * IMPORTANT: When a student is approved, we only set state - we do NOT auto-start
 * the screen share because that requires a user gesture (click). The student must
 * click "Start Presenting" to actually begin sharing.
 * 
 * @returns {Object} Presentation state and controls
 */
export function usePresentationRequests() {
    const { isTeacher } = useTeacherRole();

    useEffect(() => {
        _ensureInitialized();

        if (!_initialized && !_initIntervalId) {
            _initIntervalId = setInterval(() => {
                _ensureInitialized();
            }, 500);
        }

        return () => {
            if (_listeners.size === 0 && _initIntervalId) {
                clearInterval(_initIntervalId);
                _initIntervalId = null;
            }
        };
    }, []);

    const { requests, currentPresenterId, isActuallyProjecting } = useSyncExternalStore(
        _subscribe,
        _getSnapshot,
        _getSnapshot
    );

    // Student: send request to present
    const requestToPresent = useCallback(() => {
        const requesterId = window.NAF?.clientId;
        const requesterName = window.APP?.store?.state?.profile?.displayName || "Student";
        if (!requesterId) {
            console.warn("[PresentRequests] Cannot request - no client ID");
            return;
        }

        console.log("[PresentRequests] Sending request:", requesterName);

        window.APP?.hubChannel?.sendMessage(
            { requesterId, requesterName },
            "present_request"
        );
    }, []);

    // Teacher: approve a request
    const approveRequest = useCallback((requesterId, requesterName) => {
        if (!isTeacher) return;

        // If someone is already presenting, revoke them first
        if (currentPresenterId && currentPresenterId !== requesterId) {
            window.APP?.hubChannel?.sendMessage(
                { presenterId: currentPresenterId },
                "present_revoked"
            );
        }

        console.log("[PresentRequests] Approving:", requesterName);

        window.APP?.hubChannel?.sendMessage(
            { presenterId: requesterId, presenterName: requesterName },
            "present_approved"
        );

        // Send chat notification
        window.APP?.hubChannel?.sendMessage(
            `📽️ ${requesterName} has been approved to present. Click Start Presenting to begin.`,
            "chat"
        );
    }, [isTeacher, currentPresenterId]);

    // Teacher: deny a request
    const denyRequest = useCallback((requesterId) => {
        if (!isTeacher) return;

        console.log("[PresentRequests] Denying:", requesterId);

        window.APP?.hubChannel?.sendMessage(
            { requesterId },
            "present_denied"
        );
    }, [isTeacher]);

    // Teacher: revoke current presenter
    const revokePresenter = useCallback(() => {
        if (!isTeacher || !currentPresenterId) return;

        console.log("[PresentRequests] Revoking presenter");

        window.APP?.hubChannel?.sendMessage(
            { presenterId: currentPresenterId },
            "present_revoked"
        );

        // Send chat notification
        window.APP?.hubChannel?.sendMessage(
            "📽️ Presentation ended by teacher",
            "chat"
        );
    }, [isTeacher, currentPresenterId]);

    // Student (approved): actually start presenting (requires user click)
    const startPresenting = useCallback(() => {
        const myId = window.NAF?.clientId;
        if (myId !== currentPresenterId) {
            console.warn("[PresentRequests] Cannot start - not the approved presenter");
            return;
        }

        console.log("[PresentRequests] Starting presentation (user gesture)");

        // Emit the event to start projection - this MUST be from a user click
        const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
        scene?.emit("start_board_projection");

        // Notify everyone that presenting has started
        window.APP?.hubChannel?.sendMessage(
            { presenterId: myId },
            "present_started"
        );

        _setState({ isActuallyProjecting: true });
    }, [currentPresenterId]);

    // Presenter (student): end presenting by themselves
    const endPresenting = useCallback(() => {
        const presenterId = window.NAF?.clientId;
        if (!presenterId) return;

        console.log("[PresentRequests] Ending presentation");

        // Stop local projection
        const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
        scene?.emit("stop_board_projection");

        window.APP?.hubChannel?.sendMessage(
            { presenterId },
            "present_ended"
        );

        // Send chat notification
        window.APP?.hubChannel?.sendMessage(
            "📽️ Presentation ended",
            "chat"
        );

        _setState({ isActuallyProjecting: false });
    }, []);

    // Check if current user is the approved presenter
    const myId = window.NAF?.clientId;
    const isApprovedPresenter = myId && myId === currentPresenterId;
    // Presenting = approved AND actually projecting
    const isPresenting = isApprovedPresenter && isActuallyProjecting;

    return {
        // State
        isTeacher,
        requests,
        currentPresenterId,
        isApprovedPresenter,    // This user is approved but may not have started yet
        isPresenting,           // This user is approved AND actively presenting
        isActuallyProjecting,   // Whether projection is active
        hasRequests: requests.length > 0,
        requestCount: requests.length,

        // Actions
        requestToPresent,    // Student: request to present
        approveRequest,      // Teacher: approve a request (requesterId, requesterName)
        denyRequest,         // Teacher: deny a request (requesterId)
        revokePresenter,     // Teacher: stop current presenter
        startPresenting,     // Approved student: actually start presenting (needs user click)
        endPresenting        // Presenter: stop own presentation
    };
}

export default usePresentationRequests;
