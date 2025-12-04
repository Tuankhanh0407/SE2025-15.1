import React, { useRef, useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { CloseButton } from "../input/CloseButton";
import { IconButton } from "../input/IconButton";
import { FormattedMessage } from "react-intl";
import styles from "./WhiteboardSidebar.scss";
import { ReactComponent as DeleteIcon } from "../icons/Delete.svg";
import { ReactComponent as ArrowBackIcon } from "../icons/ArrowBack.svg";
import { ReactComponent as ShareIcon } from "../icons/Share.svg";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BORDER_SIZE = 8;
const HEADER_HEIGHT = 40;

const COLORS = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
    "#ffff00", "#ff00ff", "#00ffff", "#ff8000", "#8000ff"
];

const LINE_WIDTHS = [2, 5, 10, 15];

export function WhiteboardSidebar({ onClose, visible }) {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const [currentColor, setCurrentColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(5);
    const [historyStack, setHistoryStack] = useState([]);
    const [isSharing, setIsSharing] = useState(false);

    // Initialize canvas every time it becomes visible
    useEffect(() => {
        if (visible && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            ctxRef.current = context;

            if (historyStack.length === 0) {
                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                setHistoryStack([canvas.toDataURL()]);
            } else {
                const img = new Image();
                img.onload = () => {
                    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    context.drawImage(img, 0, 0);
                };
                img.src = historyStack[historyStack.length - 1];
            }
        }
    }, [visible]);

    const saveState = useCallback(() => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL();
        setHistoryStack(prev => {
            const newHistory = [...prev, dataUrl];
            if (newHistory.length > 50) newHistory.shift();
            return newHistory;
        });
    }, []);

    const handleMouseDown = useCallback((e) => {
        const ctx = ctxRef.current;
        if (!ctx || !canvasRef.current) return;

        isDrawingRef.current = true;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        lastPointRef.current = { x, y };

        ctx.beginPath();
        ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.fill();
    }, [currentColor, lineWidth]);

    const handleMouseMove = useCallback((e) => {
        const ctx = ctxRef.current;
        if (!isDrawingRef.current || !ctx || !lastPointRef.current || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPointRef.current = { x, y };
    }, [currentColor, lineWidth]);

    const handleMouseUp = useCallback(() => {
        if (isDrawingRef.current) {
            saveState();
        }
        isDrawingRef.current = false;
        lastPointRef.current = null;
    }, [saveState]);

    const handleClear = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        setHistoryStack([]);
        saveState();
    }, [saveState]);

    const handleUndo = useCallback(() => {
        const ctx = ctxRef.current;
        if (historyStack.length <= 1 || !ctx) return;

        const newHistory = [...historyStack];
        newHistory.pop();
        const previousState = newHistory[newHistory.length - 1];

        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.drawImage(img, 0, 0);
        };
        img.src = previousState;
        setHistoryStack(newHistory);
    }, [historyStack]);

    // Create image with border and sender info
    const createShareableImage = useCallback(() => {
        if (!canvasRef.current) return null;

        // Get sender name
        const senderName = window.APP?.store?.state?.profile?.displayName || "Anonymous";
        const timestamp = new Date().toLocaleTimeString();

        // Create a new canvas with border and header
        const totalWidth = CANVAS_WIDTH + (BORDER_SIZE * 2);
        const totalHeight = CANVAS_HEIGHT + (BORDER_SIZE * 2) + HEADER_HEIGHT;

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = totalWidth;
        exportCanvas.height = totalHeight;
        const ctx = exportCanvas.getContext("2d");

        // Draw gradient border/background
        const gradient = ctx.createLinearGradient(0, 0, totalWidth, totalHeight);
        gradient.addColorStop(0, "#667eea");
        gradient.addColorStop(1, "#764ba2");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        // Draw header background
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, CANVAS_WIDTH, HEADER_HEIGHT);

        // Draw header text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(`📝 Whiteboard by ${senderName}`, BORDER_SIZE + 12, BORDER_SIZE + HEADER_HEIGHT / 2);

        // Draw timestamp on right
        ctx.font = "14px Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(timestamp, totalWidth - BORDER_SIZE - 12, BORDER_SIZE + HEADER_HEIGHT / 2);
        ctx.textAlign = "left";

        // Draw the whiteboard content
        ctx.drawImage(canvasRef.current, BORDER_SIZE, BORDER_SIZE + HEADER_HEIGHT);

        return exportCanvas.toDataURL("image/png");
    }, []);

    // Share whiteboard as image to chat
    const handleShareWhiteboard = useCallback(async () => {
        if (!canvasRef.current) return;

        setIsSharing(true);

        try {
            // Create image with border and sender info
            const dataUrl = createShareableImage();

            if (!dataUrl) {
                console.error("Failed to create shareable image");
                setIsSharing(false);
                return;
            }

            // Send as image message to chat
            if (window.APP?.hubChannel) {
                window.APP.hubChannel.sendMessage({ src: dataUrl }, "image");
                console.log("Whiteboard shared to chat!");
            } else {
                console.error("hubChannel not available");
            }
        } catch (error) {
            console.error("Error sharing whiteboard:", error);
        }

        setIsSharing(false);
    }, [createShareableImage]);

    if (!visible) return null;

    return (
        <div className={styles.whiteboardSidebar}>
            <div className={styles.header}>
                <CloseButton onClick={onClose} />
                <h2 className={styles.title}>
                    <FormattedMessage id="whiteboard-sidebar.title" defaultMessage="Whiteboard" />
                </h2>
                <div className={styles.actions}>
                    <IconButton onClick={handleUndo} title="Undo" className={styles.actionButton}>
                        <ArrowBackIcon />
                    </IconButton>
                    <IconButton onClick={handleClear} title="Clear" className={styles.actionButton}>
                        <DeleteIcon />
                    </IconButton>
                    <IconButton
                        onClick={handleShareWhiteboard}
                        title="Share to Chat"
                        className={styles.shareButton}
                        disabled={isSharing}
                    >
                        <ShareIcon />
                    </IconButton>
                </div>
            </div>

            {isSharing && (
                <div className={styles.sharingBanner}>
                    <FormattedMessage id="whiteboard-sidebar.sharing" defaultMessage="Sharing..." />
                </div>
            )}

            <div className={styles.toolbar}>
                <div className={styles.colors}>
                    {COLORS.map(color => (
                        <button
                            key={color}
                            className={`${styles.colorButton} ${currentColor === color ? styles.selected : ""}`}
                            style={{ backgroundColor: color, border: color === "#ffffff" ? "1px solid #ccc" : "none" }}
                            onClick={() => setCurrentColor(color)}
                            title={color}
                        />
                    ))}
                </div>
                <div className={styles.lineWidths}>
                    {LINE_WIDTHS.map(width => (
                        <button
                            key={width}
                            className={`${styles.lineWidthButton} ${lineWidth === width ? styles.selected : ""}`}
                            onClick={() => setLineWidth(width)}
                            title={`${width}px`}
                        >
                            <span style={{ width: width * 2, height: width * 2 }} className={styles.lineWidthPreview} />
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.canvasContainer}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className={styles.canvas}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
        </div>
    );
}

WhiteboardSidebar.propTypes = {
    onClose: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired
};

export default WhiteboardSidebar;
