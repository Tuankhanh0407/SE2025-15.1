import { useCallback, useEffect, useRef, useState } from "react";
import { useTeacherRole } from "./useTeacherRole";

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

    // List of pending presentation requests: [{ requesterId, requesterName, ts }]
    const [requests, setRequests] = useState([]);

    // Current presenter's session ID (null if no one is presenting)
    const [currentPresenterId, setCurrentPresenterId] = useState(null);

    // Whether the approved student has actually started presenting (screen share active)
    const [isActuallyProjecting, setIsActuallyProjecting] = useState(false);

    // Ref to keep requests in sync for closures
    const requestsRef = useRef(requests);
    useEffect(() => {
        requestsRef.current = requests;
    }, [requests]);

    // Listen for broadcast messages
    useEffect(() => {
        const messageDispatch = window.APP?.messageDispatch;
        if (!messageDispatch) return;

        const onMessage = (event) => {
            const msg = event.detail;
            if (!msg) return;

            // Student -> Teacher: request to present
            if (msg.type === "present_request") {
                const { requesterId, requesterName } = msg.body || {};
                if (!requesterId) return;

                console.log("[PresentRequests] Request received:", requesterName);

                setRequests(prev => {
                    if (prev.some(r => r.requesterId === requesterId)) return prev;
                    return [...prev, {
                        requesterId,
                        requesterName: requesterName || "Student",
                        ts: Date.now()
                    }];
                });
            }

            // Teacher -> Everyone: approved presenter
            if (msg.type === "present_approved") {
                const { presenterId, presenterName } = msg.body || {};
                if (!presenterId) return;

                console.log("[PresentRequests] Presenter approved:", presenterName);

                setCurrentPresenterId(presenterId);
                setIsActuallyProjecting(false); // Not presenting yet, waiting for user to click Start
                // Remove from requests list
                setRequests(prev => prev.filter(r => r.requesterId !== presenterId));

                // NOTE: We do NOT auto-start projection here!
                // The student must click "Start Presenting" button due to browser gesture requirements.
                // getDisplayMedia() requires a user gesture (click) to work.
            }

            // Presenter actually started projecting
            if (msg.type === "present_started") {
                const { presenterId } = msg.body || {};
                console.log("[PresentRequests] Presentation actually started by:", presenterId);
                setIsActuallyProjecting(true);

                // Teacher: automatically show student's screen on the board
                if (isTeacher && presenterId) {
                    const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
                    scene?.emit("start_board_projection", { presenterId });
                    console.log("[PresentRequests] Teacher spawning projection for student:", presenterId);
                }
            }

            // Presenter ended presenting
            if (msg.type === "present_ended") {
                const { presenterId } = msg.body || {};
                console.log("[PresentRequests] Presentation ended:", presenterId);

                // Clear current presenter if it matches or no ID provided
                if (!presenterId || presenterId === currentPresenterId) {
                    setCurrentPresenterId(null);
                    setIsActuallyProjecting(false);
                }

                // Teacher: stop showing the projection on the board
                if (isTeacher) {
                    const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
                    scene?.emit("stop_board_projection");
                }
            }

            // Teacher revoked presenter
            if (msg.type === "present_revoked") {
                const { presenterId } = msg.body || {};
                console.log("[PresentRequests] Presenter revoked:", presenterId);

                // If current user is being revoked, stop their projection
                const myId = window.NAF?.clientId;
                if (myId === presenterId || myId === currentPresenterId) {
                    const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
                    scene?.emit("stop_board_projection");
                }

                // Teacher: also stop the board projection
                if (isTeacher) {
                    const scene = typeof AFRAME !== 'undefined' && AFRAME.scenes ? AFRAME.scenes[0] : null;
                    scene?.emit("stop_board_projection");
                }

                if (!presenterId || presenterId === currentPresenterId) {
                    setCurrentPresenterId(null);
                    setIsActuallyProjecting(false);
                }
            }

            // Teacher denied request
            if (msg.type === "present_denied") {
                const { requesterId } = msg.body || {};
                if (!requesterId) return;

                console.log("[PresentRequests] Request denied:", requesterId);
                setRequests(prev => prev.filter(r => r.requesterId !== requesterId));
            }
        };

        messageDispatch.addEventListener("message", onMessage);
        return () => messageDispatch.removeEventListener("message", onMessage);
    }, [currentPresenterId]);

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

        setIsActuallyProjecting(true);
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

        setIsActuallyProjecting(false);
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
