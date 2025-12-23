import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { fetchReticulumAuthenticated, getReticulumFetchUrl, generateHubName, isLocalClient } from "../../utils/phoenix-utils";
import { store } from "../../utils/store-instance";
import { scaledThumbnailUrlFor } from "../../utils/media-url-utils";
import { Button } from "../input/Button";
import styles from "./CreateRoomModal.scss";

/**
 * CreateRoomModal - Enhanced room creation with scene selection
 */
export function CreateRoomModal({ onClose }) {
    const [scenes, setScenes] = useState([]);
    const [selectedSceneId, setSelectedSceneId] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [roomSize, setRoomSize] = useState(25);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Fallback scenes for fresh installs (when no scenes in database)
    const defaultFallbackScenes = [
        {
            id: null,
            name: "Default Environment",
            images: { preview: { url: null } },
            isDefault: true
        }
    ];

    // Fetch featured scenes
    useEffect(() => {
        async function fetchScenes() {
            try {
                const response = await fetchReticulumAuthenticated(
                    "/api/v1/media/search?source=scene_listings&filter=featured"
                );
                const sceneList = response.entries || [];

                if (sceneList.length > 0) {
                    setScenes(sceneList);
                    setSelectedSceneId(sceneList[0].id);
                } else {
                    // Use fallback when no scenes in database
                    setScenes(defaultFallbackScenes);
                    setSelectedSceneId(null); // null = use server default
                }
            } catch (error) {
                console.error("CreateRoomModal: Error fetching scenes", error);
                // Use fallback on error
                setScenes(defaultFallbackScenes);
                setSelectedSceneId(null);
            } finally {
                setIsLoading(false);
            }
        }
        fetchScenes();
    }, []);

    // Handle scene selection
    const handleSceneSelect = useCallback((sceneId) => {
        setSelectedSceneId(sceneId);
    }, []);

    // Handle room creation with public mode support
    const handleCreate = useCallback(async () => {
        setIsCreating(true);
        try {
            const createUrl = getReticulumFetchUrl("/api/v1/hubs");
            const name = roomName.trim() || generateHubName();

            // Build payload with entry_mode and allow_promotion for public rooms
            const payload = {
                hub: {
                    name,
                    scene_id: selectedSceneId,
                    room_size: roomSize,
                    // entry_mode: "allow" makes room accessible to anyone with link
                    entry_mode: isPublic ? "allow" : "invite",
                    // allow_promotion: true makes room visible in Live Classes/public list
                    allow_promotion: isPublic
                }
            };

            const headers = { "content-type": "application/json" };
            if (store?.state?.credentials?.token) {
                headers.authorization = `bearer ${store.state.credentials.token}`;
            }

            const res = await fetch(createUrl, {
                body: JSON.stringify(payload),
                headers,
                method: "POST"
            }).then(r => r.json());

            const hub = res;
            let url = hub.url;

            // Store creator tokens (same as createAndRedirectToNewHub)
            const creatorAssignmentToken = hub.creator_assignment_token;
            if (creatorAssignmentToken) {
                store.update({
                    creatorAssignmentTokens: [{
                        hubId: hub.hub_id,
                        creatorAssignmentToken: creatorAssignmentToken
                    }]
                });

                const embedToken = hub.embed_token;
                if (embedToken) {
                    store.update({
                        embedTokens: [{ hubId: hub.hub_id, embedToken: embedToken }]
                    });
                }
            }

            // Handle local development URL
            if (isLocalClient()) {
                url = `/hub.html?hub_id=${hub.hub_id}`;
            }

            document.location = url;
        } catch (error) {
            console.error("CreateRoomModal: Error creating room", error);
            setIsCreating(false);
        }
    }, [roomName, selectedSceneId, isPublic]);

    // Handle modal close
    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>
                        <FormattedMessage id="create-room-modal.title" defaultMessage="Create a Room" />
                    </h2>
                </div>

                <div className={styles.content}>
                    {/* Scene Selection */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>
                            <FormattedMessage id="create-room-modal.select-scene" defaultMessage="Choose a Scene" />
                        </label>
                        <div className={styles.sceneGrid}>
                            {isLoading ? (
                                <div className={styles.loading}>
                                    <FormattedMessage id="create-room-modal.loading" defaultMessage="Loading scenes..." />
                                </div>
                            ) : scenes.map(scene => (
                                <button
                                    key={scene.id || 'default'}
                                    className={`${styles.sceneCard} ${selectedSceneId === scene.id ? styles.selected : ""}`}
                                    onClick={() => handleSceneSelect(scene.id)}
                                >
                                    {scene.images?.preview?.url ? (
                                        <img
                                            src={scaledThumbnailUrlFor(scene.images.preview.url, 200, 150)}
                                            alt={scene.name}
                                        />
                                    ) : (
                                        <div className={styles.scenePlaceholder}>🏠</div>
                                    )}
                                    <div className={styles.sceneName}>{scene.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Room Name */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>
                            <FormattedMessage id="create-room-modal.room-name" defaultMessage="Room Name" />
                        </label>
                        <input
                            type="text"
                            className={styles.input}
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Enter room name..."
                        />
                    </div>

                    {/* Room Size */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>
                            <FormattedMessage id="create-room-modal.room-size" defaultMessage="Max People (1-50)" />
                        </label>
                        <input
                            type="number"
                            className={styles.input}
                            value={roomSize}
                            onChange={(e) => setRoomSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 25)))}
                            min="1"
                            max="50"
                        />
                    </div>

                    {/* Public/Private Toggle */}
                    <div className={styles.section}>
                        <label className={styles.toggleLabel}>
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            <span className={styles.toggleText}>
                                <FormattedMessage id="create-room-modal.make-public" defaultMessage="Make room public (visible in Live Classes)" />
                            </span>
                        </label>
                        <div className={styles.toggleHint}>
                            {isPublic ? (
                                <FormattedMessage id="create-room-modal.public-hint" defaultMessage="🌐 Anyone can find and join this room" />
                            ) : (
                                <FormattedMessage id="create-room-modal.private-hint" defaultMessage="🔒 Only people with the link can join" />
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <Button preset="basic" onClick={onClose}>
                        <FormattedMessage id="create-room-modal.cancel" defaultMessage="Cancel" />
                    </Button>
                    <Button
                        preset="primary"
                        onClick={handleCreate}
                        disabled={isCreating || !selectedSceneId}
                    >
                        {isCreating ? (
                            <FormattedMessage id="create-room-modal.creating" defaultMessage="Creating..." />
                        ) : (
                            <FormattedMessage id="create-room-modal.create" defaultMessage="Create Room" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

CreateRoomModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default CreateRoomModal;
