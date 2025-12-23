import React, { useState, useEffect, useCallback } from "react";
import { FormattedMessage } from "react-intl";
import { fetchReticulumAuthenticated } from "../../utils/phoenix-utils";
import { scaledThumbnailUrlFor } from "../../utils/media-url-utils";
import styles from "./ActiveClassesSidebar.scss";

/**
 * ActiveClassesSidebar - Displays active rooms with users
 * 
 * Shows rooms where member_count > 0, auto-refreshes every 30 seconds.
 */
export function ActiveClassesSidebar() {
    const [activeRooms, setActiveRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Fetch active rooms
    const fetchActiveRooms = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch public rooms (filter=public is required by the API)
            const response = await fetchReticulumAuthenticated(
                "/api/v1/media/search?source=rooms&filter=public"
            );

            // Filter rooms with active users and sort by member count
            const rooms = (response.entries || [])
                .filter(room => room.member_count > 0)
                .sort((a, b) => b.member_count - a.member_count);

            setActiveRooms(rooms);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("ActiveClassesSidebar: Error fetching rooms", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch and 30-second polling
    useEffect(() => {
        fetchActiveRooms();

        const interval = setInterval(() => {
            fetchActiveRooms();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [fetchActiveRooms]);

    // Navigate to room
    const handleRoomClick = useCallback((room) => {
        window.location.href = room.url;
    }, []);

    return (
        <div className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.liveIndicator}>
                        <span className={styles.liveDot}></span>
                        <FormattedMessage id="active-classes.title" defaultMessage="Live Classes" />
                    </div>
                    <button
                        className={styles.refreshButton}
                        onClick={fetchActiveRooms}
                        disabled={isLoading}
                        title="Refresh"
                    >
                        🔄
                    </button>
                </div>
                {lastUpdated && (
                    <div className={styles.lastUpdated}>
                        <FormattedMessage
                            id="active-classes.updated"
                            defaultMessage="Updated {time}"
                            values={{ time: lastUpdated.toLocaleTimeString() }}
                        />
                    </div>
                )}
            </div>

            <div className={styles.roomList}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <FormattedMessage id="active-classes.loading" defaultMessage="Loading..." />
                    </div>
                ) : activeRooms.length === 0 ? (
                    <div className={styles.loading}>
                        <FormattedMessage id="active-classes.empty" defaultMessage="No active classes right now" />
                    </div>
                ) : (
                    activeRooms.map(room => (
                        <button
                            key={room.id}
                            className={styles.roomItem}
                            onClick={() => handleRoomClick(room)}
                        >
                            <div className={styles.thumbnail}>
                                {room.images?.preview?.url ? (
                                    <img
                                        src={scaledThumbnailUrlFor(room.images.preview.url, 80, 60)}
                                        alt={room.name}
                                    />
                                ) : (
                                    <div className={styles.placeholderThumb}>📚</div>
                                )}
                            </div>
                            <div className={styles.roomInfo}>
                                <div className={styles.roomName}>{room.name}</div>
                                <div className={styles.memberCount}>
                                    <span className={styles.onlineIcon}>🟢</span>
                                    {room.member_count}/{room.room_size || 25}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

export default ActiveClassesSidebar;
