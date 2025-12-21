/**
 * Board Projection System
 * 
 * Manages screen projection that appears on the classroom board.
 * 
 * Architecture:
 * - Student shares their screen (publish via WebRTC)
 * - Teacher (or the sharer themselves) spawns a networked entity on the board
 * - Entity uses hubs://clients/{presenterId}/video URL
 * - All users can see the networked entity
 */

import { addMedia } from "../utils/media-utils";
import { MediaDevicesEvents } from "../utils/media-devices-utils";

// Allowed anchor names in scenes
const PROJECTION_TARGET_NAMES = [
    "board-projection-target",
    "board_projection_target",
    "projection-surface",
    "projection_surface"
];

// Fallback (if no anchor found)
const DEFAULT_PROJECTION_CONFIG = {
    position: { x: 2.5, y: 2.2, z: -6.5 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 2.5, y: 1.8, z: 1 }
};

const SURFACE_OFFSET = 0.02;

AFRAME.registerSystem("board-projection", {
    schema: {},

    init() {
        this.isProjecting = false;
        this.projectionEntity = null;
        this.remotePresenterId = null; // When teacher displays student's stream

        this._onStart = this.onStartProjection.bind(this);
        this._onStop = this.onStopProjection.bind(this);
        this._onVideoEnded = () => {
            // User pressed "Stop sharing" from browser UI
            this.onStopProjection({ skipStopVideoShare: true });
        };

        this.el.addEventListener("start_board_projection", this._onStart);
        this.el.addEventListener("stop_board_projection", this._onStop);
        this.el.addEventListener(MediaDevicesEvents.VIDEO_SHARE_ENDED, this._onVideoEnded);

        // Better debugging
        window.addEventListener("error", e => {
            console.error("[BoardProjection] window error:", e.error || e.message, e.filename, e.lineno, e.colno);
        });
        window.addEventListener("unhandledrejection", e => {
            console.error("[BoardProjection] unhandledrejection:", e.reason);
        });

        console.log("[BoardProjection] System initialized");
    },

    findProjectionTarget() {
        const root = this.el.object3D;
        for (const name of PROJECTION_TARGET_NAMES) {
            const target = root.getObjectByName(name);
            if (target) return target;
        }
        return null;
    },

    getProjectionConfig() {
        const target = this.findProjectionTarget();
        if (!target) return DEFAULT_PROJECTION_CONFIG;

        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        target.getWorldPosition(worldPos);
        target.getWorldQuaternion(worldQuat);

        // Offset ra khỏi bảng để tránh z-fighting
        const forward = new THREE.Vector3(0, 0, SURFACE_OFFSET).applyQuaternion(worldQuat);
        worldPos.add(forward);

        const euler = new THREE.Euler().setFromQuaternion(worldQuat, "YXZ");

        // 1) Thử lấy size từ Box3
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(target).getSize(size);

        // 2) Nếu Box3 quá nhỏ (Media Frame thường bị), lấy bằng worldScale
        if (size.x < 0.05 || size.y < 0.05) {
            const worldScale = new THREE.Vector3();
            target.getWorldScale(worldScale);

            // Media Frame là volume: sử dụng scale X/Y để định nghĩa width/height
            size.x = worldScale.x;
            size.y = worldScale.y;
            console.log("[BoardProjection] Using worldScale fallback:", size.x, size.y);
        }

        return {
            position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
            rotation: {
                x: THREE.MathUtils.radToDeg(euler.x),
                y: THREE.MathUtils.radToDeg(euler.y),
                z: THREE.MathUtils.radToDeg(euler.z)
            },
            scale: {
                // Tối thiểu hợp lý để khỏi "bé xíu"
                x: Math.max(size.x, 0.5),
                y: Math.max(size.y, 0.3),
                z: 1
            }
        };
    },

    removeProjectionEntity() {
        if (!this.projectionEntity) return;

        try {
            // Lấy ownership trước khi remove (cần cho NAF sync)
            if (this.projectionEntity.components?.networked) {
                const networkedEl = this.projectionEntity;
                if (window.NAF?.utils?.isMine?.(networkedEl) === false) {
                    window.NAF?.utils?.takeOwnership?.(networkedEl);
                }
            }

            // Remove từ DOM nếu còn trong DOM
            if (this.projectionEntity.parentNode) {
                this.projectionEntity.parentNode.removeChild(this.projectionEntity);
            }
        } catch (e) {
            console.warn("[BoardProjection] Error removing projection entity:", e);
        }

        this.projectionEntity = null;
    },

    /**
     * Spawn projection entity with a hubs:// URL string
     * @param {string} src - The video URL (hubs://clients/{id}/video)
     */
    spawnProjectionEntity(src) {
        const { position, rotation, scale } = this.getProjectionConfig();

        this.removeProjectionEntity();

        console.log("[BoardProjection] Spawning entity with src:", src);
        console.log("[BoardProjection] Config - position:", position, "rotation:", rotation, "scale:", scale);

        // addMedia expects a URL string, NOT a MediaStream
        // QUAN TRỌNG: fitToBox = false để media-loader KHÔNG chạy updateScale()
        // Scale được set sau đó và đồng bộ qua NAF đến các client khác
        const { entity } = addMedia(src, "#interactable-media", undefined, null, false, false);
        this.projectionEntity = entity;

        // Set initial attributes TRƯỚC KHI entity được add vào scene (addMedia đã add rồi)
        // Nhưng cần set NGAY để NAF có thể sync
        entity.setAttribute("position", position);
        entity.setAttribute("rotation", rotation);
        entity.setAttribute("scale", scale);
        entity.setAttribute("data-board-projection", "true");

        // Thêm listener để re-apply scale sau khi media load
        // Vì media-video.scaleToAspectRatio có thể thay đổi mesh scale
        entity.addEventListener("video-loaded", () => {
            console.log("[BoardProjection] Video loaded, ensuring entity scale:", scale);
            // Đảm bảo entity scale không bị thay đổi
            entity.object3D.scale.set(scale.x, scale.y, scale.z);
            entity.object3D.matrixNeedsUpdate = true;
        }, { once: true });

        // Cũng handle trường hợp media load lỗi
        entity.addEventListener("media-loaded", () => {
            console.log("[BoardProjection] Media loaded, ensuring entity scale:", scale);
            entity.object3D.scale.set(scale.x, scale.y, scale.z);
            entity.object3D.matrixNeedsUpdate = true;
        }, { once: true });
    },

    /**
     * Start projection
     * @param {CustomEvent} evt - Event with optional detail.presenterId for remote presenter
     */
    async onStartProjection(evt) {
        if (this.isProjecting) return;

        const presenterId = evt?.detail?.presenterId; // Teacher spawning for student
        const mdm = window.APP?.mediaDevicesManager;

        try {
            // Case 1: Teacher wants to show a student's stream on the board
            // Teacher doesn't share themselves, just spawns the student's video
            if (presenterId) {
                console.log("[BoardProjection] Teacher spawning student's stream:", presenterId);
                const src = `hubs://clients/${presenterId}/video`;
                this.spawnProjectionEntity(src);
                this.remotePresenterId = presenterId;
                this.isProjecting = true;
                this.el.emit("board_projection_started", { presenterId });
                console.log("[BoardProjection] Remote projection started");
                return;
            }

            // Case 2: Local user (student or teacher) starts sharing their own screen
            if (!mdm) throw new Error("mediaDevicesManager not available");

            await new Promise((resolve, reject) => {
                mdm.startVideoShare({
                    isDisplayMedia: true,
                    target: null,
                    success: (_isDisplayMedia, isVideoTrackAdded) => {
                        if (!isVideoTrackAdded) return reject(new Error("No screen track added"));
                        resolve();
                    },
                    error: e => reject(e)
                });
            });

            // Spawn projection using hubs:// URL of THIS client
            const myId = window.NAF?.clientId;
            if (!myId) throw new Error("No NAF client ID");

            const src = `hubs://clients/${myId}/video`;
            this.spawnProjectionEntity(src);
            this.remotePresenterId = null; // Local share
            this.isProjecting = true;
            this.el.emit("board_projection_started");
            console.log("[BoardProjection] Local projection started");

        } catch (e) {
            console.error("[BoardProjection] Failed to start projection:", e);
            this.el.emit("board_projection_failed", { error: e.message });
            this.isProjecting = false;
            this.remotePresenterId = null;
            this.removeProjectionEntity();
        }
    },

    /**
     * Stop projection
     * @param {Object} options
     * @param {boolean} options.skipStopVideoShare - Skip stopping video share (e.g., when already ended)
     */
    async onStopProjection({ skipStopVideoShare = false } = {}) {
        try {
            this.removeProjectionEntity();

            // Only stop video share if:
            // 1. Not skipping
            // 2. This was a local share (not displaying remote presenter)
            // 3. Video is actually being shared
            const mdm = window.APP?.mediaDevicesManager;
            if (!skipStopVideoShare && !this.remotePresenterId && mdm?.isVideoShared) {
                await mdm.stopVideoShare();
                console.log("[BoardProjection] Video share stopped");
            }
        } catch (e) {
            console.error("[BoardProjection] Error stopping projection:", e);
        } finally {
            this.isProjecting = false;
            this.remotePresenterId = null;
            this.el.emit("board_projection_stopped");
            console.log("[BoardProjection] Projection stopped");
        }
    },

    getIsProjecting() {
        return this.isProjecting;
    },

    remove() {
        this.onStopProjection({ skipStopVideoShare: true });
        this.el.removeEventListener("start_board_projection", this._onStart);
        this.el.removeEventListener("stop_board_projection", this._onStop);
        this.el.removeEventListener(MediaDevicesEvents.VIDEO_SHARE_ENDED, this._onVideoEnded);
    }
});

export default {};
